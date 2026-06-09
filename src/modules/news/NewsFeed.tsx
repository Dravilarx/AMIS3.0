import React, { useState, useMemo, useEffect } from 'react';
import {
    Newspaper, Search, Plus, Pin, Eye, EyeOff, AlertTriangle,
    Calendar, Loader2, MessageSquare, Send, Trash2, FileText,
    ChevronDown, ChevronUp, BookOpen, Edit3,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNews, type NewsReaction, type NewsComment, type NewsAttachment } from '../../hooks/useNews';
import { useAuth } from '../../hooks/useAuth';
import { NewsComposer } from './NewsComposer';
import { NewsArticleView } from './NewsArticleView';
import type { NewsArticle, NewsCategory, NewsPriority } from '../../types/news';
import {
    CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
    PRIORITY_LABELS, PRIORITY_COLORS,
} from '../../types/news';

// ─── Constantes ───────────────────────────────────────────────────────────────
const EMOJIS = ['👍', '❤️', '🎉', '😮', '🙏'];

// ─── Formato de fecha ─────────────────────────────────────────────────────────
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7)   return `hace ${days}d`;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

// ─── Panel de reacciones + comentarios ───────────────────────────────────────
const EngagementPanel: React.FC<{ articleId: string }> = ({ articleId }) => {
    const { fetchReactions, toggleReaction, fetchComments, addComment, deleteComment } = useNews();
    const { user } = useAuth();

    const [reactions,    setReactions]    = useState<NewsReaction[]>([]);
    const [comments,     setComments]     = useState<NewsComment[]>([]);
    const [attachments,  setAttachments]  = useState<NewsAttachment[]>([]);
    const [newComment,   setNewComment]   = useState('');
    const [showComments, setShowComments] = useState(false);
    const [posting,      setPosting]      = useState(false);

    const { fetchAttachments } = useNews();

    useEffect(() => {
        fetchReactions(articleId).then(setReactions);
        fetchAttachments(articleId).then(setAttachments);
    }, [articleId]);

    useEffect(() => {
        if (showComments) fetchComments(articleId).then(setComments);
    }, [showComments, articleId]);

    const handleReaction = async (emoji: string) => {
        await toggleReaction(articleId, emoji);
        fetchReactions(articleId).then(setReactions);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setPosting(true);
        await addComment(articleId, newComment);
        setNewComment('');
        fetchComments(articleId).then(setComments);
        setPosting(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        await deleteComment(commentId);
        fetchComments(articleId).then(setComments);
    };



    return (
        <div className="mt-3 pt-3 border-t border-brand-border/50 space-y-2">
            {/* Reacciones */}
            <div className="flex items-center gap-1 flex-wrap">
                {EMOJIS.map(emoji => {
                    const r = reactions.find(rx => rx.emoji === emoji);
                    return (
                        <button key={emoji}
                            onClick={e => { e.stopPropagation(); handleReaction(emoji); }}
                            className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-all',
                                r?.myReaction
                                    ? 'bg-brand-primary/20 border-brand-primary/30 text-brand-text'
                                    : 'bg-brand-surface border-brand-border text-brand-text/40 hover:border-brand-text/20 hover:text-brand-text/70'
                            )}>
                            <span>{emoji}</span>
                            {r?.count ? <span className="font-bold text-[10px]">{r.count}</span> : null}
                        </button>
                    );
                })}

                {/* Toggle comentarios */}
                <button
                    onClick={e => { e.stopPropagation(); setShowComments(v => !v); }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-brand-border text-brand-text/30 hover:text-brand-text/70 hover:border-brand-text/20 transition-all ml-auto text-[10px]">
                    <MessageSquare className="w-3 h-3" />
                    {comments.length > 0 ? comments.length : ''}
                    {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {/* Adjuntos */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                        <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2 py-1 bg-brand-surface border border-brand-border rounded-lg text-[10px] text-brand-text/60 hover:text-info hover:border-info/30 transition-all">
                            <FileText className="w-3 h-3" />
                            {att.fileName}
                        </a>
                    ))}
                </div>
            )}

            {/* Comentarios */}
            {showComments && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
                    onClick={e => e.stopPropagation()}>
                    {comments.map(c => (
                        <div key={c.id} className="flex items-start gap-2 p-2 bg-brand-surface/50 rounded-xl">
                            <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[9px] font-black text-brand-primary">
                                    {c.userName[0]?.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-brand-text/70">{c.userName}</span>
                                    <span className="text-[9px] text-brand-text/20 font-mono">{formatDate(c.createdAt)}</span>
                                </div>
                                <p className="text-xs text-brand-text/60 mt-0.5">{c.body}</p>
                            </div>
                            {user?.id === c.userId && (
                                <button onClick={() => handleDeleteComment(c.id)}
                                    className="p-1 text-brand-text/10 hover:text-red-400 transition-colors flex-shrink-0">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Input nuevo comentario */}
                    <div className="flex items-center gap-2">
                        <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50" />
                        <button onClick={handleAddComment} disabled={posting || !newComment.trim()}
                            className="p-1.5 bg-brand-primary text-white rounded-xl disabled:opacity-40 hover:brightness-110 transition-all">
                            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tarjeta de artículo ──────────────────────────────────────────────────────
const ArticleCard: React.FC<{
    article: NewsArticle;
    pinned?: boolean;
    isDraft?: boolean;
    onOpen:      (a: NewsArticle) => void;
    onEdit?:     (a: NewsArticle) => void;
    onPublish?:  (id: string) => void;
    onDelete?:   (id: string) => void;
}> = ({ article, pinned, isDraft, onOpen, onEdit, onPublish, onDelete }) => (
    <div onClick={() => !isDraft && onOpen(article)}
        className={cn(
            'group relative rounded-2xl border transition-all duration-300',
            isDraft
                ? 'bg-brand-surface/30 border-dashed border-brand-border/50 opacity-70'
                : pinned
                    ? 'bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20 hover:border-blue-500/40 cursor-pointer hover:scale-[1.01]'
                    : article.isRead
                        ? 'bg-brand-surface/30 border-brand-border/50 hover:border-brand-border cursor-pointer hover:scale-[1.01]'
                        : 'bg-brand-surface/50 border-brand-border hover:border-brand-text/20 cursor-pointer hover:scale-[1.01]',
            article.priority === 'urgente' && !isDraft && 'border-red-500/30 hover:border-red-500/50'
        )}>

        {/* Unread indicator */}
        {!article.isRead && !isDraft && (
            <div className="absolute top-5 left-0 w-1 h-8 bg-blue-500 rounded-r-full" />
        )}

        {/* Cover */}
        {(article.imageUrls?.[0] || article.coverImageUrl) && !isDraft && (
            <div className="h-32 rounded-t-2xl overflow-hidden -mx-0 relative">
                <img src={article.imageUrls?.[0] || article.coverImageUrl} alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {pinned && (
                    <div className="absolute top-2 right-2">
                        <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                    </div>
                )}
            </div>
        )}

        <div className="p-4">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', CATEGORY_COLORS[article.category])}>
                    {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category]}
                </span>
                {article.priority !== 'normal' && (
                    <span className={cn('text-[10px] font-black uppercase', PRIORITY_COLORS[article.priority])}>
                        {article.priority === 'urgente' ? '🔴' : '🟡'} {PRIORITY_LABELS[article.priority]}
                    </span>
                )}
                {isDraft && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-surface border border-brand-border text-brand-text/40">
                        Borrador
                    </span>
                )}
                {article.scheduledAt && new Date(article.scheduledAt) > new Date() && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        ⏰ Programado
                    </span>
                )}
            </div>

            {/* Título */}
            <h3 className={cn('text-sm font-bold mb-1.5 leading-snug line-clamp-2',
                article.isRead && !isDraft ? 'text-brand-text/60' : 'text-brand-text/90')}>
                {article.title}
            </h3>

            {article.excerpt && (
                <p className="text-xs text-brand-text/30 line-clamp-2 mb-2">{article.excerpt}</p>
            )}

            {/* Evento */}
            {article.category === 'evento' && article.eventDate && (
                <div className="flex items-center gap-1.5 mb-2 text-purple-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold">
                        {new Date(article.eventDate).toLocaleDateString('es-CL', {
                            weekday: 'short', day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                        })}
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-brand-text/20 pt-2 border-t border-brand-border/30">
                <span className="font-medium truncate">{article.authorName}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" /> {article.readCount || 0}
                    </span>
                    <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
            </div>

            {/* Acciones borrador */}
            {isDraft && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/30">
                    {onEdit && (
                        <button onClick={e => { e.stopPropagation(); onEdit(article); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-[10px] font-black uppercase text-brand-text/60 hover:text-brand-text transition-all">
                            <Edit3 className="w-3 h-3" /> Editar
                        </button>
                    )}
                    {onPublish && (
                        <button onClick={e => { e.stopPropagation(); onPublish(article.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase hover:brightness-110 transition-all">
                            <Send className="w-3 h-3" /> Publicar
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={e => { e.stopPropagation(); onDelete(article.id); }}
                            className="ml-auto p-1.5 text-brand-text/20 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Engagement (solo artículos publicados) */}
            {!isDraft && <EngagementPanel articleId={article.id} />}
        </div>
    </div>
);

// ─── NewsFeed principal ───────────────────────────────────────────────────────
export const NewsFeed: React.FC = () => {
    const {
        articles, drafts, loading,
        markAsRead, deleteArticle, togglePin,
        publishArticle, fetchArticles, fetchDrafts,
    } = useNews();
    const { user } = useAuth();

    const [searchTerm,      setSearchTerm]      = useState('');
    const [filterCategory,  setFilterCategory]  = useState<string>('');
    const [filterPriority,  setFilterPriority]  = useState<string>('');
    const [activeTab,       setActiveTab]        = useState<'feed' | 'drafts'>('feed');
    const [showComposer,    setShowComposer]     = useState(false);
    const [editingArticle,  setEditingArticle]   = useState<NewsArticle | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

    const isAdmin = user?.role === 'SUPER_ADMIN' ||
                    user?.role === 'ADMIN'        ||
                    user?.role === 'MANAGER';

    const filteredArticles = useMemo(() => articles.filter(a => {
        if (searchTerm &&
            !a.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !a.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterCategory && a.category !== filterCategory) return false;
        if (filterPriority && a.priority !== filterPriority) return false;
        return true;
    }), [articles, searchTerm, filterCategory, filterPriority]);

    const pinnedArticles  = filteredArticles.filter(a => a.isPinned);
    const regularArticles = filteredArticles.filter(a => !a.isPinned);

    const stats = useMemo(() => ({
        total:   articles.length,
        unread:  articles.filter(a => !a.isRead).length,
        urgent:  articles.filter(a => a.priority === 'urgente').length,
        events:  articles.filter(a => a.category === 'evento' && a.eventDate &&
                     new Date(a.eventDate) >= new Date()).length,
        drafts:  drafts.length,
    }), [articles, drafts]);

    const handleOpenArticle = (article: NewsArticle) => {
        setSelectedArticle(article);
        if (!article.isRead) markAsRead(article.id);
    };

    const handleEdit = (article: NewsArticle) => {
        setEditingArticle(article);
        setShowComposer(true);
        setSelectedArticle(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar esta publicación?')) {
            await deleteArticle(id);
            setSelectedArticle(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">
                        Comunicación Central
                    </p>
                    <h1 className="text-2xl font-black text-brand-text tracking-tight">
                        Noticias & Comunicados
                    </h1>
                </div>
                {isAdmin && (
                    <button onClick={() => { setEditingArticle(null); setShowComposer(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nueva Publicación
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { icon: Newspaper,     label: 'Publicaciones', value: stats.total,  color: 'text-blue-400' },
                    { icon: EyeOff,        label: 'Sin Leer',      value: stats.unread, color: 'text-amber-400' },
                    { icon: AlertTriangle, label: 'Urgentes',      value: stats.urgent, color: 'text-red-400' },
                    { icon: Calendar,      label: 'Próximos Eventos', value: stats.events, color: 'text-purple-400' },
                    { icon: BookOpen,      label: 'Borradores',    value: stats.drafts, color: 'text-brand-text/30' },
                ].map(kpi => (
                    <div key={kpi.label} className="p-4 rounded-2xl bg-brand-surface/50 border border-brand-border">
                        <div className="flex items-center justify-between">
                            <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                            <span className={cn('text-2xl font-black', kpi.color)}>{kpi.value}</span>
                        </div>
                        <p className="text-[9px] font-black text-brand-text/20 uppercase tracking-widest mt-2">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs admin */}
            {isAdmin && (
                <div className="flex gap-1 border-b border-brand-border">
                    {[
                        { id: 'feed',   label: 'Feed',       count: articles.length },
                        { id: 'drafts', label: 'Borradores', count: drafts.length },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 -mb-px transition-all',
                                activeTab === tab.id
                                    ? 'border-brand-primary text-brand-text'
                                    : 'border-transparent text-brand-text/40 hover:text-brand-text/70'
                            )}>
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    'w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center',
                                    activeTab === tab.id ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text/40'
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Filtros — solo en feed */}
            {activeTab === 'feed' && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                        <input type="text" placeholder="Buscar noticias..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-brand-text placeholder:text-brand-text/20 outline-none focus:border-info/50" />
                    </div>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                        className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text/60 outline-none appearance-none">
                        <option value="">Todas las categorías</option>
                        {(Object.entries(CATEGORY_LABELS) as [NewsCategory, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{CATEGORY_ICONS[k]} {v}</option>
                        ))}
                    </select>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                        className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text/60 outline-none appearance-none">
                        <option value="">Toda prioridad</option>
                        {(Object.entries(PRIORITY_LABELS) as [NewsPriority, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    {(filterCategory || filterPriority || searchTerm) && (
                        <button onClick={() => { setFilterCategory(''); setFilterPriority(''); setSearchTerm(''); }}
                            className="text-[10px] font-black uppercase text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors">
                            Limpiar
                        </button>
                    )}
                </div>
            )}

            {/* Feed principal */}
            {activeTab === 'feed' && (
                <>
                    {pinnedArticles.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-brand-text/20 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Pin className="w-3 h-3 text-blue-400" /> Fijados
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pinnedArticles.map(a => (
                                    <ArticleCard key={a.id} article={a} pinned
                                        onOpen={handleOpenArticle}
                                        onEdit={isAdmin ? handleEdit : undefined}
                                        onDelete={isAdmin ? handleDelete : undefined}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {regularArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {regularArticles.map(a => (
                                <ArticleCard key={a.id} article={a}
                                    onOpen={handleOpenArticle}
                                    onEdit={isAdmin ? handleEdit : undefined}
                                    onDelete={isAdmin ? handleDelete : undefined}
                                />
                            ))}
                        </div>
                    ) : pinnedArticles.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Newspaper className="w-12 h-12 text-brand-text/10 mb-4" />
                            <p className="text-sm text-brand-text/30">No hay noticias publicadas.</p>
                            {isAdmin && (
                                <button onClick={() => { setEditingArticle(null); setShowComposer(true); }}
                                    className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-colors">
                                    Crear primera publicación
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Borradores */}
            {activeTab === 'drafts' && isAdmin && (
                <div className="space-y-4">
                    {drafts.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-12 h-12 text-brand-text/10 mx-auto mb-4" />
                            <p className="text-sm text-brand-text/30">Sin borradores guardados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {drafts.map(a => (
                                <ArticleCard key={a.id} article={a} isDraft
                                    onOpen={() => {}}
                                    onEdit={handleEdit}
                                    onPublish={async id => { await publishArticle(id); fetchArticles(); fetchDrafts(); }}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modales */}
            {showComposer && (
                <NewsComposer
                    article={editingArticle}
                    onClose={() => { setShowComposer(false); setEditingArticle(null); }}
                    onSuccess={() => { setShowComposer(false); setEditingArticle(null); fetchArticles(); fetchDrafts(); }}
                />
            )}

            {selectedArticle && (
                <NewsArticleView
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                    onEdit={isAdmin ? () => handleEdit(selectedArticle) : undefined}
                    onDelete={isAdmin ? () => handleDelete(selectedArticle.id) : undefined}
                    onTogglePin={isAdmin ? () => { togglePin(selectedArticle.id); setSelectedArticle(null); } : undefined}
                />
            )}
        </div>
    );
};
