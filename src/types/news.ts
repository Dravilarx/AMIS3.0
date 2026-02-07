// Tipos para el Módulo de Noticias — AMIS 3.0

export type NewsCategory = 'institucional' | 'evento' | 'operacional' | 'urgente' | 'cultura';
export type NewsPriority = 'normal' | 'alta' | 'urgente';
export type NewsVisibility = 'all' | 'roles' | 'groups' | 'custom';

export interface NewsArticle {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    category: NewsCategory;
    priority: NewsPriority;
    visibility: NewsVisibility;
    targetRoles: string[];
    targetUserIds: string[];
    targetGroupIds: string[];
    coverImageUrl?: string;
    imageUrls: string[];
    eventDate?: string;
    scheduledAt?: string;
    isPinned: boolean;
    isPublished: boolean;
    authorId?: string;
    authorName?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    // Computed
    readCount?: number;
    isRead?: boolean;
}

export interface NewsReadReceipt {
    id: string;
    articleId: string;
    userId: string;
    readAt: string;
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
    institucional: 'Institucional',
    evento: 'Evento',
    operacional: 'Operacional',
    urgente: 'Aviso Urgente',
    cultura: 'Cultura & Reconocimientos',
};

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
    institucional: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    evento: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    operacional: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    urgente: 'bg-red-500/20 text-red-400 border-red-500/30',
    cultura: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const CATEGORY_ICONS: Record<NewsCategory, string> = {
    institucional: '🏛️',
    evento: '📅',
    operacional: '⚙️',
    urgente: '🚨',
    cultura: '🎉',
};

export const PRIORITY_LABELS: Record<NewsPriority, string> = {
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
};

export const PRIORITY_COLORS: Record<NewsPriority, string> = {
    normal: 'text-white/40',
    alta: 'text-amber-400',
    urgente: 'text-red-400',
};

export const VISIBILITY_LABELS: Record<NewsVisibility, string> = {
    all: 'Toda la Comunidad',
    roles: 'Por Roles',
    groups: 'Por Grupos',
    custom: 'Personalizado',
};
