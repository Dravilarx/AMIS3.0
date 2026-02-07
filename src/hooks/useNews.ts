import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { NewsArticle } from '../types/news';

interface UseNewsFilters {
    category?: string;
    priority?: string;
    onlyUnread?: boolean;
    search?: string;
}

// ── Image resize utility ──────────────────────────────────────────
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;

function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > MAX_IMAGE_WIDTH) {
                height = Math.round((height * MAX_IMAGE_WIDTH) / width);
                width = MAX_IMAGE_WIDTH;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Blob conversion failed'))),
                'image/webp',
                IMAGE_QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
        img.src = url;
    });
}

// ── Hook ──────────────────────────────────────────────────────────
export function useNews() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    const mapArticle = (row: any, currentUserId?: string, receipts?: any[]): NewsArticle => ({
        id: row.id,
        title: row.title,
        content: row.content,
        excerpt: row.excerpt,
        category: row.category,
        priority: row.priority,
        visibility: row.visibility,
        targetRoles: row.target_roles || [],
        targetUserIds: row.target_user_ids || [],
        targetGroupIds: row.target_group_ids || [],
        coverImageUrl: row.cover_image_url,
        imageUrls: row.image_urls || [],
        eventDate: row.event_date,
        scheduledAt: row.scheduled_at,
        isPinned: row.is_pinned || false,
        isPublished: row.is_published || false,
        authorId: row.author_id,
        authorName: row.author_name || row.profiles?.full_name || 'Sistema',
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        readCount: row.read_count || 0,
        isRead: receipts
            ? receipts.some((r: any) => r.article_id === row.id && r.user_id === currentUserId)
            : false,
    });

    const fetchArticles = useCallback(async (filters?: UseNewsFilters) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('news_articles')
                .select('*, profiles!news_articles_author_id_fkey(full_name)')
                .eq('is_published', true)
                .order('is_pinned', { ascending: false })
                .order('published_at', { ascending: false });

            if (filters?.category) {
                query = query.eq('category', filters.category);
            }
            if (filters?.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch read receipts for current user
            let receipts: any[] = [];
            if (user) {
                const { data: receiptData } = await supabase
                    .from('news_read_receipts')
                    .select('article_id, user_id')
                    .eq('user_id', user.id);
                receipts = receiptData || [];
            }

            // Count reads per article
            const { data: readCounts } = await supabase
                .from('news_read_receipts')
                .select('article_id');

            const countMap: Record<string, number> = {};
            (readCounts || []).forEach((r: any) => {
                countMap[r.article_id] = (countMap[r.article_id] || 0) + 1;
            });

            const now = new Date();
            const mapped = (data || []).map(row => {
                const article = mapArticle(
                    { ...row, author_name: row.profiles?.full_name, read_count: countMap[row.id] || 0 },
                    user?.id,
                    receipts
                );
                return article;
            }).filter(a => {
                // Hide scheduled articles that haven't reached their date (non-admins)
                if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;
                return true;
            });

            if (filters?.onlyUnread) {
                setArticles(mapped.filter(a => !a.isRead));
            } else {
                setArticles(mapped);
            }
        } catch (err) {
            console.error('Error fetching news:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch ALL articles including scheduled (for admin view)
    const fetchAllArticles = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('news_articles')
                .select('*, profiles!news_articles_author_id_fkey(full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            let receipts: any[] = [];
            if (user) {
                const { data: r } = await supabase
                    .from('news_read_receipts')
                    .select('article_id, user_id')
                    .eq('user_id', user.id);
                receipts = r || [];
            }

            return (data || []).map(row =>
                mapArticle({ ...row, author_name: row.profiles?.full_name }, user?.id, receipts)
            );
        } catch (err) {
            console.error('Error fetching all articles:', err);
            return [];
        }
    }, []);

    // ── Image upload with resize ──────────────────────────────────
    const uploadNewsImage = async (file: File): Promise<string> => {
        const resized = await resizeImage(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const filePath = `articles/${fileName}`;

        const { error } = await supabase.storage
            .from('news-images')
            .upload(filePath, resized, { contentType: 'image/webp' });

        if (error) throw new Error(`Upload failed: ${error.message}`);

        const { data: { publicUrl } } = supabase.storage
            .from('news-images')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const addArticle = async (data: Partial<NewsArticle>) => {
        const { data: { user } } = await supabase.auth.getUser();
        const now = new Date().toISOString();

        // Determine if should publish now or schedule
        const shouldPublishNow = data.isPublished !== false && !data.scheduledAt;

        const row = {
            title: data.title,
            content: data.content,
            excerpt: data.excerpt || '',
            category: data.category || 'institucional',
            priority: data.priority || 'normal',
            visibility: data.visibility || 'all',
            target_roles: data.targetRoles || [],
            target_user_ids: data.targetUserIds || [],
            target_group_ids: data.targetGroupIds || [],
            cover_image_url: data.coverImageUrl || null,
            image_urls: data.imageUrls || [],
            event_date: data.eventDate || null,
            scheduled_at: data.scheduledAt || null,
            is_pinned: data.isPinned || false,
            is_published: shouldPublishNow || !!data.scheduledAt,
            author_id: user?.id,
            published_at: shouldPublishNow ? now : (data.scheduledAt || null),
        };

        const { error } = await supabase.from('news_articles').insert(row);
        if (error) throw error;
        await fetchArticles();
    };

    const updateArticle = async (id: string, data: Partial<NewsArticle>) => {
        const updates: any = {
            updated_at: new Date().toISOString(),
        };
        if (data.title !== undefined) updates.title = data.title;
        if (data.content !== undefined) updates.content = data.content;
        if (data.excerpt !== undefined) updates.excerpt = data.excerpt;
        if (data.category !== undefined) updates.category = data.category;
        if (data.priority !== undefined) updates.priority = data.priority;
        if (data.visibility !== undefined) updates.visibility = data.visibility;
        if (data.targetRoles !== undefined) updates.target_roles = data.targetRoles;
        if (data.targetUserIds !== undefined) updates.target_user_ids = data.targetUserIds;
        if (data.targetGroupIds !== undefined) updates.target_group_ids = data.targetGroupIds;
        if (data.coverImageUrl !== undefined) updates.cover_image_url = data.coverImageUrl;
        if (data.imageUrls !== undefined) updates.image_urls = data.imageUrls;
        if (data.eventDate !== undefined) updates.event_date = data.eventDate;
        if (data.scheduledAt !== undefined) updates.scheduled_at = data.scheduledAt;
        if (data.isPinned !== undefined) updates.is_pinned = data.isPinned;
        if (data.isPublished !== undefined) {
            updates.is_published = data.isPublished;
            if (data.isPublished) updates.published_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('news_articles')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
        await fetchArticles();
    };

    const deleteArticle = async (id: string) => {
        const { error } = await supabase.from('news_articles').delete().eq('id', id);
        if (error) throw error;
        await fetchArticles();
    };

    const togglePin = async (id: string) => {
        const article = articles.find(a => a.id === id);
        if (!article) return;
        await updateArticle(id, { isPinned: !article.isPinned });
    };

    const publishArticle = async (id: string) => {
        await updateArticle(id, { isPublished: true });
    };

    const markAsRead = async (articleId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('news_read_receipts')
            .upsert({ article_id: articleId, user_id: user.id }, { onConflict: 'article_id,user_id' });

        if (error) console.error('Error marking as read:', error);

        setArticles(prev => prev.map(a =>
            a.id === articleId ? { ...a, isRead: true, readCount: (a.readCount || 0) + 1 } : a
        ));
    };

    // Fetch drafts (for admin view)
    const fetchDrafts = async () => {
        const { data, error } = await supabase
            .from('news_articles')
            .select('*, profiles!news_articles_author_id_fkey(full_name)')
            .eq('is_published', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(row =>
            mapArticle({ ...row, author_name: row.profiles?.full_name })
        );
    };

    // Fetch messaging groups (channels with type='group')
    const fetchGroups = async (): Promise<{ id: string; name: string }[]> => {
        const { data, error } = await supabase
            .from('channels')
            .select('id, name')
            .eq('type', 'group')
            .order('name');

        if (error) { console.error('Error fetching groups:', error); return []; }
        return data || [];
    };

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    return {
        articles,
        loading,
        fetchArticles,
        fetchAllArticles,
        addArticle,
        updateArticle,
        deleteArticle,
        togglePin,
        publishArticle,
        markAsRead,
        fetchDrafts,
        fetchGroups,
        uploadNewsImage,
    };
}
