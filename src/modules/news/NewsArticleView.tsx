import React, { useState } from 'react';
import {
    X, Edit3, Trash2, Pin, Eye, Clock, User, Globe,
    Calendar, AlertTriangle, ChevronLeft, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NewsArticle } from '../../types/news';
import {
    CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
    PRIORITY_LABELS, VISIBILITY_LABELS
} from '../../types/news';

interface NewsArticleViewProps {
    article: NewsArticle;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onTogglePin?: () => void;
}

export const NewsArticleView: React.FC<NewsArticleViewProps> = ({
    article, onClose, onEdit, onDelete, onTogglePin
}) => {
    const [galleryIndex, setGalleryIndex] = useState(0);
    const images = article.imageUrls || [];

    const formatFullDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const isScheduled = article.scheduledAt && new Date(article.scheduledAt) > new Date();

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-xl bg-prevenort-bg border-l border-prevenort-border overflow-y-auto custom-scrollbar animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-prevenort-bg/95 backdrop-blur-xl border-b border-prevenort-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                CATEGORY_COLORS[article.category]
                            )}>
                                {CATEGORY_ICONS[article.category]} {CATEGORY_LABELS[article.category]}
                            </span>
                            {article.priority !== 'normal' && (
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                                    article.priority === 'urgente'
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-amber-500/10 text-amber-400"
                                )}>
                                    {PRIORITY_LABELS[article.priority]}
                                </span>
                            )}
                            {article.isPinned && (
                                <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                            )}
                            {isScheduled && (
                                <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-400">
                                    ⏰ Programado
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {onTogglePin && (
                                <button
                                    onClick={onTogglePin}
                                    className="p-2 hover:bg-prevenort-surface rounded-lg transition-colors"
                                    title={article.isPinned ? 'Desfijar' : 'Fijar'}
                                >
                                    <Pin className={cn("w-4 h-4", article.isPinned ? "text-blue-400 fill-blue-400" : "text-prevenort-text/30")} />
                                </button>
                            )}
                            {onEdit && (
                                <button onClick={onEdit} className="p-2 hover:bg-prevenort-surface rounded-lg transition-colors">
                                    <Edit3 className="w-4 h-4 text-prevenort-text/30 hover:text-prevenort-text/60" />
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={onDelete} className="p-2 hover:bg-danger/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4 text-prevenort-text/30 hover:text-danger" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-prevenort-surface rounded-lg transition-colors ml-2">
                                <X className="w-5 h-5 text-prevenort-text/40" />
                            </button>
                        </div>
                    </div>

                    <h1 className="text-xl font-black text-prevenort-text leading-tight">{article.title}</h1>
                </div>

                {/* ── Image Gallery ──────────────────────────────── */}
                {images.length > 0 && (
                    <div className="relative w-full aspect-video overflow-hidden bg-black/50">
                        <img
                            src={images[galleryIndex]}
                            alt=""
                            className="w-full h-full object-contain"
                        />
                        {/* Nav arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={() => setGalleryIndex(i => (i - 1 + images.length) % images.length)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-white" />
                                </button>
                                <button
                                    onClick={() => setGalleryIndex(i => (i + 1) % images.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                                {/* Dots */}
                                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
                                    {images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setGalleryIndex(i)}
                                            className={cn(
                                                "w-2 h-2 rounded-full transition-all",
                                                i === galleryIndex ? "bg-white scale-125" : "bg-white/40"
                                            )}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        {/* Counter */}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white/70 font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            {galleryIndex + 1}/{images.length}
                        </div>
                    </div>
                )}

                {/* Cover image fallback (only if no gallery images) */}
                {images.length === 0 && article.coverImageUrl && (
                    <div className="w-full h-48 overflow-hidden">
                        <img
                            src={article.coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Meta info */}
                <div className="px-6 py-4 border-b border-prevenort-border">
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="flex items-center gap-2 text-prevenort-text/30">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{article.authorName || 'Sistema'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-prevenort-text/30">
                            <Clock className="w-3 h-3" />
                            <span>{formatFullDate(article.publishedAt || article.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-prevenort-text/30">
                            <Globe className="w-3 h-3" />
                            <span>{VISIBILITY_LABELS[article.visibility]}</span>
                            {article.visibility === 'roles' && article.targetRoles.length > 0 && (
                                <span className="text-prevenort-text/20">({article.targetRoles.join(', ')})</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-prevenort-text/30">
                            <Eye className="w-3 h-3" />
                            <span>{article.readCount || 0} lecturas</span>
                        </div>
                    </div>

                    {/* Scheduled info */}
                    {article.scheduledAt && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <div>
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                    {isScheduled ? 'Publicación Programada' : 'Fue Programada para'}
                                </p>
                                <p className="text-xs text-prevenort-text/60 font-medium mt-0.5">
                                    {formatFullDate(article.scheduledAt)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Event date */}
                    {article.category === 'evento' && article.eventDate && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <div>
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Fecha del Evento</p>
                                <p className="text-xs text-prevenort-text/60 font-medium mt-0.5">
                                    {formatFullDate(article.eventDate)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Urgent warning */}
                    {article.priority === 'urgente' && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <p className="text-xs text-red-400 font-bold">Comunicado de Alta Urgencia</p>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <div className="prose prose-invert prose-sm max-w-none">
                        {article.content.split('\n').map((paragraph, idx) => (
                            paragraph.trim() ? (
                                <p key={idx} className="text-sm text-prevenort-text/70 leading-relaxed mb-4">
                                    {paragraph}
                                </p>
                            ) : (
                                <div key={idx} className="h-2" />
                            )
                        ))}
                    </div>
                </div>

                {/* Image thumbnails row */}
                {images.length > 1 && (
                    <div className="px-6 pb-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {images.map((url, i) => (
                                <button
                                    key={i}
                                    onClick={() => setGalleryIndex(i)}
                                    className={cn(
                                        "flex-none w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                                        i === galleryIndex
                                            ? "border-blue-500 opacity-100"
                                            : "border-prevenort-border opacity-50 hover:opacity-80"
                                    )}
                                >
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Read status */}
                <div className="px-6 pb-6">
                    <div className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-xs font-bold",
                        article.isRead
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/5 border-blue-500/20 text-blue-400"
                    )}>
                        <Eye className="w-3.5 h-3.5" />
                        {article.isRead ? 'Leído' : 'Marcado como leído'}
                    </div>
                </div>
            </div>
        </div>
    );
};
