import React, { useState, useMemo } from 'react';
import {
    Newspaper, Search, Plus, Pin, Eye, EyeOff,
    AlertTriangle, Calendar, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNews } from '../../hooks/useNews';
import { useAuth } from '../../hooks/useAuth';
import { NewsComposer } from './NewsComposer';
import { NewsArticleView } from './NewsArticleView';
import type { NewsArticle, NewsCategory, NewsPriority } from '../../types/news';
import {
    CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
    PRIORITY_LABELS, PRIORITY_COLORS
} from '../../types/news';

export const NewsFeed: React.FC = () => {
    const { articles, loading, markAsRead, deleteArticle, togglePin, fetchArticles } = useNews();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterPriority, setFilterPriority] = useState<string>('');
    const [showComposer, setShowComposer] = useState(false);
    const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const filteredArticles = useMemo(() => {
        return articles.filter(a => {
            if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !a.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (filterCategory && a.category !== filterCategory) return false;
            if (filterPriority && a.priority !== filterPriority) return false;
            return true;
        });
    }, [articles, searchTerm, filterCategory, filterPriority]);

    const pinnedArticles = filteredArticles.filter(a => a.isPinned);
    const regularArticles = filteredArticles.filter(a => !a.isPinned);

    const stats = useMemo(() => ({
        total: articles.length,
        unread: articles.filter(a => !a.isRead).length,
        urgent: articles.filter(a => a.priority === 'urgente').length,
        events: articles.filter(a => a.category === 'evento' && a.eventDate &&
            new Date(a.eventDate) >= new Date()).length,
    }), [articles]);

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

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `hace ${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days}d`;
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    };

    const ArticleCard: React.FC<{ article: NewsArticle; pinned?: boolean }> = ({ article, pinned }) => (
        <div
            onClick={() => handleOpenArticle(article)}
            className={cn(
                "group relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01]",
                pinned
                    ? "bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20 hover:border-blue-500/40"
                    : article.isRead
                        ? "bg-prevenort-surface/30 border-prevenort-border/50 hover:border-prevenort-border"
                        : "bg-prevenort-surface/50 border-prevenort-border hover:border-prevenort-text/20",
                article.priority === 'urgente' && "border-red-500/30 hover:border-red-500/50"
            )}
        >
            {/* Pinned badge */}
            {pinned && (
                <div className="absolute top-3 right-3">
                    <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                </div>
            )}

            {/* Unread indicator */}
            {!article.isRead && (
                <div className="absolute top-5 left-0 w-1 h-8 bg-blue-500 rounded-r-full" />
            )}

            {/* Cover image */}
            {(article.imageUrls?.[0] || article.coverImageUrl) && (
                <div className="mb-4 -mx-5 -mt-5 h-36 rounded-t-2xl overflow-hidden relative">
                    <img
                        src={article.imageUrls?.[0] || article.coverImageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {article.imageUrls && article.imageUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded-lg text-[10px] text-white/80 font-bold">
                            📷 {article.imageUrls.length}
                        </div>
                    )}
                    {article.scheduledAt && new Date(article.scheduledAt) > new Date() && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600/80 rounded-lg text-[10px] text-white font-bold">
                            ⏰ Programado
                        </div>
                    )}
                </div>
            )}

            {/* Header: Category + Priority */}
            <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    CATEGORY_COLORS[article.category]
                )}>
                    {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category]}
                </span>
                {article.priority !== 'normal' && (
                    <span className={cn("text-[10px] font-black uppercase", PRIORITY_COLORS[article.priority])}>
                        {article.priority === 'urgente' ? '🔴' : '🟡'} {PRIORITY_LABELS[article.priority]}
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className={cn(
                "text-sm font-bold mb-2 leading-snug line-clamp-2",
                article.isRead ? "text-prevenort-text/60" : "text-prevenort-text/90"
            )}>
                {article.title}
            </h3>

            {/* Excerpt */}
            {article.excerpt && (
                <p className="text-xs text-prevenort-text/30 line-clamp-2 mb-3">{article.excerpt}</p>
            )}

            {/* Event date */}
            {article.category === 'evento' && article.eventDate && (
                <div className="flex items-center gap-1.5 mb-3 text-purple-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold">
                        {new Date(article.eventDate).toLocaleDateString('es-CL', {
                            weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                    </span>
                </div>
            )}

            {/* Footer: author + time + reads */}
            <div className="flex items-center justify-between text-[10px] text-prevenort-text/20 pt-2 border-t border-prevenort-border/50">
                <span className="font-medium">{article.authorName}</span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {article.readCount || 0}
                    </span>
                    <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">
                        Comunicación Central
                    </p>
                    <h1 className="text-2xl font-black text-prevenort-text tracking-tight">
                        Noticias & Comunicados
                    </h1>
                </div>
                <button
                    onClick={() => { setEditingArticle(null); setShowComposer(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-prevenort-primary hover:bg-prevenort-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-prevenort-primary/20 hover:shadow-prevenort-primary/40"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Publicación
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { icon: Newspaper, label: 'Publicaciones', value: stats.total, color: 'text-blue-400' },
                    { icon: EyeOff, label: 'Sin Leer', value: stats.unread, color: 'text-amber-400' },
                    { icon: AlertTriangle, label: 'Urgentes', value: stats.urgent, color: 'text-red-400' },
                    { icon: Calendar, label: 'Eventos Próximos', value: stats.events, color: 'text-purple-400' },
                ].map((kpi) => (
                    <div key={kpi.label} className="p-4 rounded-2xl bg-prevenort-surface/50 border border-prevenort-border">
                        <div className="flex items-center justify-between">
                            <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                            <span className={cn("text-2xl font-black", kpi.color)}>{kpi.value}</span>
                        </div>
                        <p className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest mt-2">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20" />
                    <input
                        type="text"
                        placeholder="Buscar noticias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-prevenort-text placeholder:text-prevenort-text/20 focus:outline-none focus:border-info/50"
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-prevenort-surface border border-prevenort-border rounded-xl px-3 py-2.5 text-xs text-prevenort-text/60 focus:outline-none focus:border-info/50"
                >
                    <option value="">Todas las categorías</option>
                    {(Object.entries(CATEGORY_LABELS) as [NewsCategory, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-prevenort-surface border border-prevenort-border rounded-xl px-3 py-2.5 text-xs text-prevenort-text/60 focus:outline-none focus:border-info/50"
                >
                    <option value="">Toda prioridad</option>
                    {(Object.entries(PRIORITY_LABELS) as [NewsPriority, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>

            {/* Pinned Section */}
            {pinnedArticles.length > 0 && (
                <div>
                    <p className="text-[10px] font-black text-prevenort-text/20 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Pin className="w-3 h-3 text-blue-400" /> Fijados
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pinnedArticles.map(a => (
                            <ArticleCard key={a.id} article={a} pinned />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Articles */}
            {regularArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regularArticles.map(a => (
                        <ArticleCard key={a.id} article={a} />
                    ))}
                </div>
            ) : pinnedArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Newspaper className="w-12 h-12 text-prevenort-text/10 mb-4" />
                    <p className="text-sm text-prevenort-text/30">No hay noticias publicadas aún.</p>
                    {isAdmin && (
                        <button
                            onClick={() => { setEditingArticle(null); setShowComposer(true); }}
                            className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-colors"
                        >
                            Crear primera publicación
                        </button>
                    )}
                </div>
            ) : null}

            {/* Composer Modal */}
            {showComposer && (
                <NewsComposer
                    article={editingArticle}
                    onClose={() => { setShowComposer(false); setEditingArticle(null); }}
                    onSuccess={() => { setShowComposer(false); setEditingArticle(null); fetchArticles(); }}
                />
            )}

            {/* Article Detail */}
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
