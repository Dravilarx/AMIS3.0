import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { NewsArticle } from '../types/news';

// ─── Tipos nuevos ─────────────────────────────────────────────────────────────
export interface NewsReaction {
    emoji:     string;
    count:     number;
    myReaction: boolean;
}

export interface NewsComment {
    id:         string;
    articleId:  string;
    userId:     string;
    userName:   string;
    body:       string;
    createdAt:  string;
}

export interface NewsAttachment {
    id:        string;
    articleId: string;
    fileName:  string;
    fileUrl:   string;
    fileType:  string;
}

// ─── Image resize ─────────────────────────────────────────────────────────────
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY   = 0.8;

function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > MAX_IMAGE_WIDTH) {
                height = Math.round((height * MAX_IMAGE_WIDTH) / width);
                width  = MAX_IMAGE_WIDTH;
            }
            const canvas = document.createElement('canvas');
            canvas.width  = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Blob conversion failed')),
                'image/webp', IMAGE_QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNews() {
    const [articles,  setArticles]  = useState<NewsArticle[]>([]);
    const [drafts,    setDrafts]    = useState<NewsArticle[]>([]);
    const [loading,   setLoading]   = useState(true);

    const mapArticle = (row: any, currentUserId?: string, receipts?: any[]): NewsArticle => ({
        id:             row.id,
        title:          row.title,
        content:        row.content,
        excerpt:        row.excerpt,
        category:       row.category,
        priority:       row.priority,
        visibility:     row.visibility,
        targetRoles:    row.target_roles    || [],
        targetUserIds:  row.target_user_ids || [],
        targetGroupIds: row.target_group_ids || [],
        coverImageUrl:  row.cover_image_url,
        imageUrls:      row.image_urls      || [],
        eventDate:      row.event_date,
        scheduledAt:    row.scheduled_at,
        isPinned:       row.is_pinned       || false,
        isPublished:    row.is_published    || false,
        authorId:       row.author_id,
        authorName:     row.author_name     || row.profiles?.full_name || 'Sistema',
        publishedAt:    row.published_at,
        createdAt:      row.created_at,
        updatedAt:      row.updated_at,
        readCount:      row.read_count      || 0,
        isRead:         receipts
            ? receipts.some((r: any) => r.article_id === row.id && r.user_id === currentUserId)
            : false,
    });

    // ── Fetch artículos publicados ────────────────────────────────────────────
    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('news_articles')
                .select('*, profiles(full_name)')
                .eq('is_published', true)
                .eq('is_deleted', false)
                .order('is_pinned',    { ascending: false })
                .order('published_at', { ascending: false });

            if (error) throw error;

            let receipts: any[] = [];
            if (user) {
                const { data: r } = await supabase
                    .from('news_read_receipts')
                    .select('article_id, user_id')
                    .eq('user_id', user.id);
                receipts = r || [];
            }

            const { data: readCounts } = await supabase
                .from('news_read_receipts')
                .select('article_id');

            const countMap: Record<string, number> = {};
            (readCounts || []).forEach((r: any) => {
                countMap[r.article_id] = (countMap[r.article_id] || 0) + 1;
            });

            const now = new Date();
            const mapped = (data || [])
                .map(row => mapArticle(
                    { ...row, author_name: row.profiles?.full_name, read_count: countMap[row.id] || 0 },
                    user?.id, receipts
                ))
                .filter(a => !a.scheduledAt || new Date(a.scheduledAt) <= now);

            setArticles(mapped);
        } catch (err) {
            console.error('Error fetching news:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch borradores (admin) ──────────────────────────────────────────────
    const fetchDrafts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('news_articles')
                .select('*, profiles(full_name)')
                .eq('is_published', false)
                .eq('is_deleted',   false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(row =>
                mapArticle({ ...row, author_name: row.profiles?.full_name })
            );
            setDrafts(mapped);
            return mapped;
        } catch (err) {
            console.error('Error fetching drafts:', err);
            return [];
        }
    }, []);

    // ── Reacciones ────────────────────────────────────────────────────────────
    const fetchReactions = async (articleId: string): Promise<NewsReaction[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase
            .from('news_reactions')
            .select('emoji, user_id')
            .eq('article_id', articleId);

        const EMOJIS = ['👍', '❤️', '🎉', '😮', '🙏'];
        return EMOJIS.map(emoji => ({
            emoji,
            count:      (data || []).filter(r => r.emoji === emoji).length,
            myReaction: (data || []).some(r => r.emoji === emoji && r.user_id === user?.id),
        }));
    };

    const toggleReaction = async (articleId: string, emoji: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
            .from('news_reactions')
            .select('id')
            .eq('article_id', articleId)
            .eq('user_id',    user.id)
            .eq('emoji',      emoji)
            .maybeSingle();

        if (existing) {
            await supabase.from('news_reactions').delete().eq('id', existing.id);
        } else {
            await supabase.from('news_reactions').insert({ article_id: articleId, user_id: user.id, emoji });
        }
    };

    // ── Comentarios ───────────────────────────────────────────────────────────
    const fetchComments = async (articleId: string): Promise<NewsComment[]> => {
        const { data } = await supabase
            .from('news_comments')
            .select('*, profiles(full_name)')
            .eq('article_id', articleId)
            .eq('is_deleted',  false)
            .order('created_at', { ascending: true });

        return (data || []).map((c: any) => ({
            id:        c.id,
            articleId: c.article_id,
            userId:    c.user_id,
            userName:  c.profiles?.full_name || 'Usuario',
            body:      c.body,
            createdAt: c.created_at,
        }));
    };

    const addComment = async (articleId: string, body: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !body.trim()) return { success: false };
        const { error } = await supabase.from('news_comments').insert({
            article_id: articleId,
            user_id:    user.id,
            body:       body.trim(),
        });
        return { success: !error };
    };

    const deleteComment = async (commentId: string) => {
        const { error } = await supabase
            .from('news_comments')
            .update({ is_deleted: true })
            .eq('id', commentId);
        return { success: !error };
    };

    // ── Adjuntos ──────────────────────────────────────────────────────────────
    const uploadAttachment = async (articleId: string, file: File): Promise<{ success: boolean; url?: string }> => {
        try {
            const ext      = file.name.split('.').pop();
            const filePath = `attachments/${articleId}/${Date.now()}.${ext}`;
            const { error: storageError } = await supabase.storage
                .from('news-images')
                .upload(filePath, file, { upsert: true });
            if (storageError) throw storageError;
            const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(filePath);
            await supabase.from('news_attachments').insert({
                article_id: articleId,
                file_name:  file.name,
                file_url:   publicUrl,
                file_type:  file.type.includes('pdf') ? 'pdf' : 'doc',
            });
            return { success: true, url: publicUrl };
        } catch (err: any) {
            return { success: false };
        }
    };

    const fetchAttachments = async (articleId: string): Promise<NewsAttachment[]> => {
        const { data } = await supabase
            .from('news_attachments')
            .select('*')
            .eq('article_id', articleId);
        return (data || []).map((a: any) => ({
            id:        a.id,
            articleId: a.article_id,
            fileName:  a.file_name,
            fileUrl:   a.file_url,
            fileType:  a.file_type,
        }));
    };

    // ── Image upload ──────────────────────────────────────────────────────────
    const uploadNewsImage = async (file: File): Promise<string> => {
        const resized  = await resizeImage(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const filePath = `articles/${fileName}`;
        const { error } = await supabase.storage
            .from('news-images')
            .upload(filePath, resized, { contentType: 'image/webp' });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(filePath);
        return publicUrl;
    };

    // ── CRUD artículos ────────────────────────────────────────────────────────
    const addArticle = async (data: Partial<NewsArticle>) => {
        const { data: { user } } = await supabase.auth.getUser();
        const now = new Date().toISOString();
        const shouldPublishNow = data.isPublished !== false && !data.scheduledAt;
        const { error } = await supabase.from('news_articles').insert({
            title:            data.title,
            content:          data.content,
            excerpt:          data.excerpt         || '',
            category:         data.category        || 'institucional',
            priority:         data.priority        || 'normal',
            visibility:       data.visibility      || 'all',
            target_roles:     data.targetRoles     || [],
            target_user_ids:  data.targetUserIds   || [],
            target_group_ids: data.targetGroupIds  || [],
            cover_image_url:  data.coverImageUrl   || null,
            image_urls:       data.imageUrls       || [],
            event_date:       data.eventDate       || null,
            scheduled_at:     data.scheduledAt     || null,
            is_pinned:        data.isPinned        || false,
            is_published:     shouldPublishNow     || !!data.scheduledAt,
            is_deleted:       false,
            author_id:        user?.id,
            published_at:     shouldPublishNow ? now : (data.scheduledAt || null),
        });
        if (error) throw error;
        await fetchArticles();
        await fetchDrafts();
    };

    const updateArticle = async (id: string, data: Partial<NewsArticle>) => {
        const updates: any = { updated_at: new Date().toISOString() };
        if (data.title          !== undefined) updates.title           = data.title;
        if (data.content        !== undefined) updates.content         = data.content;
        if (data.excerpt        !== undefined) updates.excerpt         = data.excerpt;
        if (data.category       !== undefined) updates.category        = data.category;
        if (data.priority       !== undefined) updates.priority        = data.priority;
        if (data.visibility     !== undefined) updates.visibility      = data.visibility;
        if (data.targetRoles    !== undefined) updates.target_roles    = data.targetRoles;
        if (data.coverImageUrl  !== undefined) updates.cover_image_url = data.coverImageUrl;
        if (data.imageUrls      !== undefined) updates.image_urls      = data.imageUrls;
        if (data.eventDate      !== undefined) updates.event_date      = data.eventDate;
        if (data.scheduledAt    !== undefined) updates.scheduled_at    = data.scheduledAt;
        if (data.isPinned       !== undefined) updates.is_pinned       = data.isPinned;
        if (data.isPublished    !== undefined) {
            updates.is_published = data.isPublished;
            if (data.isPublished) updates.published_at = new Date().toISOString();
        }
        const { error } = await supabase.from('news_articles').update(updates).eq('id', id);
        if (error) throw error;
        await fetchArticles();
        await fetchDrafts();
    };

    // ── Soft delete ───────────────────────────────────────────────────────────
    const deleteArticle = async (id: string) => {
        const { error } = await supabase
            .from('news_articles')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        await fetchArticles();
        await fetchDrafts();
    };

    const togglePin     = async (id: string) => {
        const article = articles.find(a => a.id === id) || drafts.find(a => a.id === id);
        if (!article) return;
        await updateArticle(id, { isPinned: !article.isPinned });
    };

    const publishArticle = async (id: string) => {
        await updateArticle(id, { isPublished: true });
    };

    const markAsRead = async (articleId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('news_read_receipts')
            .upsert({ article_id: articleId, user_id: user.id }, { onConflict: 'article_id,user_id' });
        setArticles(prev => prev.map(a =>
            a.id === articleId ? { ...a, isRead: true, readCount: (a.readCount || 0) + 1 } : a
        ));
    };

    const fetchGroups = async (): Promise<{ id: string; name: string }[]> => {
        const { data } = await supabase.from('channels').select('id, name').eq('type', 'group').order('name');
        return data || [];
    };

    const fetchAllArticles = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase
            .from('news_articles')
            .select('*, profiles(full_name)')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        return (data || []).map(row => mapArticle({ ...row, author_name: row.profiles?.full_name }, user?.id));
    }, []);

    useEffect(() => {
        fetchArticles();
        fetchDrafts();
    }, [fetchArticles, fetchDrafts]);

    return {
        articles, drafts, loading,
        fetchArticles, fetchDrafts, fetchAllArticles,
        addArticle, updateArticle, deleteArticle,
        togglePin, publishArticle, markAsRead,
        fetchReactions, toggleReaction,
        fetchComments, addComment, deleteComment,
        uploadAttachment, fetchAttachments,
        fetchGroups, uploadNewsImage,
    };
}
