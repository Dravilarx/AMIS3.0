import React, { useState, useRef, useEffect } from 'react';
import {
    X, Save, Pin, Send, Calendar, Image as ImageIcon, Loader2,
    Upload, Trash2, Clock, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNews } from '../../hooks/useNews';
import type { NewsArticle, NewsCategory, NewsPriority, NewsVisibility } from '../../types/news';
import { CATEGORY_LABELS, PRIORITY_LABELS, VISIBILITY_LABELS } from '../../types/news';

interface NewsComposerProps {
    article?: NewsArticle | null;
    onClose: () => void;
    onSuccess: () => void;
}

const AVAILABLE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];
const MAX_IMAGES = 5;

export const NewsComposer: React.FC<NewsComposerProps> = ({ article, onClose, onSuccess }) => {
    const { addArticle, updateArticle, uploadNewsImage, fetchGroups } = useNews();
    const isEditing = !!article;
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image state
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>(article?.imageUrls || []);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Groups state
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Publish mode: 'now' or 'scheduled'
    const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>(
        article?.scheduledAt ? 'scheduled' : 'now'
    );

    const [formData, setFormData] = useState({
        title: article?.title || '',
        content: article?.content || '',
        excerpt: article?.excerpt || '',
        category: (article?.category || 'institucional') as NewsCategory,
        priority: (article?.priority || 'normal') as NewsPriority,
        visibility: (article?.visibility || 'all') as NewsVisibility,
        targetRoles: article?.targetRoles || [] as string[],
        targetGroupIds: article?.targetGroupIds || [] as string[],
        coverImageUrl: article?.coverImageUrl || '',
        eventDate: article?.eventDate ? article.eventDate.slice(0, 16) : '',
        scheduledAt: article?.scheduledAt ? article.scheduledAt.slice(0, 16) : '',
        isPinned: article?.isPinned || false,
        isPublished: article?.isPublished ?? true,
    });

    // Load groups when visibility changes to 'groups'
    useEffect(() => {
        if (formData.visibility === 'groups' && groups.length === 0) {
            setLoadingGroups(true);
            fetchGroups().then(g => { setGroups(g); setLoadingGroups(false); });
        }
    }, [formData.visibility]);

    // ── Image handling ────────────────────────────────────────────
    const handleImageFiles = (files: FileList | File[]) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        const remaining = MAX_IMAGES - imagePreviews.length;
        const toAdd = validFiles.slice(0, remaining);

        setImageFiles(prev => [...prev, ...toAdd]);

        // Generate previews
        toAdd.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreviews(prev => [...prev, e.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const removeImage = (index: number) => {
        // If it's an already-uploaded URL (editing mode), just remove from previews
        const existingCount = article?.imageUrls?.length || 0;
        if (index < existingCount) {
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            const fileIndex = index - existingCount;
            setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    // ── Toggle helpers ────────────────────────────────────────────
    const toggleRole = (role: string) => {
        setFormData(prev => ({
            ...prev,
            targetRoles: prev.targetRoles.includes(role)
                ? prev.targetRoles.filter(r => r !== role)
                : [...prev.targetRoles, role]
        }));
    };

    const toggleGroup = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            targetGroupIds: prev.targetGroupIds.includes(groupId)
                ? prev.targetGroupIds.filter(g => g !== groupId)
                : [...prev.targetGroupIds, groupId]
        }));
    };

    // ── Save ──────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!formData.title.trim() || !formData.content.trim()) return;
        setSaving(true);
        try {
            // Upload new images
            setUploadingImages(true);
            const uploadedUrls: string[] = [];

            // Keep existing URLs from editing
            const existingCount = article?.imageUrls?.length || 0;
            const keptUrls = imagePreviews.slice(0, existingCount).filter(u => u.startsWith('http'));

            for (const file of imageFiles) {
                const url = await uploadNewsImage(file);
                uploadedUrls.push(url);
            }
            setUploadingImages(false);

            const allImageUrls = [...keptUrls, ...uploadedUrls];

            const payload: Partial<NewsArticle> = {
                title: formData.title,
                content: formData.content,
                excerpt: formData.excerpt || formData.content.substring(0, 150),
                category: formData.category,
                priority: formData.priority,
                visibility: formData.visibility,
                targetRoles: formData.visibility === 'roles' ? formData.targetRoles : [],
                targetGroupIds: formData.visibility === 'groups' ? formData.targetGroupIds : [],
                imageUrls: allImageUrls,
                coverImageUrl: allImageUrls[0] || formData.coverImageUrl || undefined,
                eventDate: formData.category === 'evento' && formData.eventDate ? formData.eventDate : undefined,
                scheduledAt: publishMode === 'scheduled' && formData.scheduledAt ? formData.scheduledAt : undefined,
                isPinned: formData.isPinned,
                isPublished: publishMode === 'now' ? formData.isPublished : true,
            };

            if (isEditing && article) {
                await updateArticle(article.id, payload);
            } else {
                await addArticle(payload);
            }
            onSuccess();
        } catch (err) {
            console.error('Error saving article:', err);
        } finally {
            setSaving(false);
            setUploadingImages(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-prevenort-bg border border-prevenort-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-prevenort-border">
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">
                            {isEditing ? 'Editar Publicación' : 'Nueva Publicación'}
                        </p>
                        <h2 className="text-lg font-bold text-prevenort-text mt-1">
                            {isEditing ? 'Modificar Artículo' : 'Redactar Comunicado'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-prevenort-surface rounded-lg transition-colors">
                        <X className="w-5 h-5 text-prevenort-text/40" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                            Título *
                        </label>
                        <input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text placeholder:text-prevenort-text/20 focus:outline-none focus:border-info/50"
                            placeholder="Título de la publicación"
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                            Contenido *
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={6}
                            className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text placeholder:text-prevenort-text/20 focus:outline-none focus:border-info/50 resize-none custom-scrollbar"
                            placeholder="Escribe el contenido del comunicado..."
                        />
                    </div>

                    {/* Excerpt */}
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                            Extracto (preview)
                        </label>
                        <input
                            value={formData.excerpt}
                            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                            className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text placeholder:text-prevenort-text/20 focus:outline-none focus:border-info/50"
                            placeholder="Resumen breve para la tarjeta de preview..."
                        />
                    </div>

                    {/* ── Image Drop Zone ────────────────────────────── */}
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Imágenes ({imagePreviews.length}/{MAX_IMAGES})
                        </label>

                        {/* Previews grid */}
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mb-2">
                                {imagePreviews.map((src, i) => (
                                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-prevenort-border">
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(i)}
                                            className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drop zone */}
                        {imagePreviews.length < MAX_IMAGES && (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-prevenort-border hover:border-info/30 rounded-xl cursor-pointer transition-colors bg-prevenort-surface/30 hover:bg-info/[0.03]"
                            >
                                <Upload className="w-6 h-6 text-prevenort-text/20" />
                                <p className="text-[10px] text-prevenort-text/30 font-medium">
                                    Arrastra imágenes aquí o haz clic para seleccionar
                                </p>
                                <p className="text-[9px] text-prevenort-text/15">
                                    Máx. {MAX_IMAGES - imagePreviews.length} más · Se redimensionan automáticamente
                                </p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
                            className="hidden"
                        />
                    </div>

                    {/* Category + Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                                Categoría
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as NewsCategory })}
                                className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text/60 focus:outline-none focus:border-info/50"
                            >
                                {(Object.entries(CATEGORY_LABELS) as [NewsCategory, string][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                                Prioridad
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as NewsPriority })}
                                className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text/60 focus:outline-none focus:border-info/50"
                            >
                                {(Object.entries(PRIORITY_LABELS) as [NewsPriority, string][]).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Event date */}
                    {formData.category === 'evento' && (
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Fecha del Evento
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.eventDate}
                                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text/60 focus:outline-none focus:border-info/50"
                            />
                        </div>
                    )}

                    {/* ── Visibility / Distribution ────────────────── */}
                    <div className="space-y-3">
                        <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest">
                            Distribución
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {(Object.entries(VISIBILITY_LABELS) as [NewsVisibility, string][]).map(([k, v]) => (
                                <button
                                    key={k}
                                    onClick={() => setFormData({ ...formData, visibility: k })}
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all",
                                        formData.visibility === k
                                            ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                            : "bg-prevenort-surface text-prevenort-text/40 border-prevenort-border hover:border-prevenort-text/20"
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        {/* Role selection */}
                        {formData.visibility === 'roles' && (
                            <div className="flex flex-wrap gap-2 p-3 bg-prevenort-surface/30 rounded-xl border border-prevenort-border">
                                {AVAILABLE_ROLES.map(role => (
                                    <button
                                        key={role}
                                        onClick={() => toggleRole(role)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                                            formData.targetRoles.includes(role)
                                                ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                                : "bg-prevenort-surface text-prevenort-text/30 border-prevenort-border hover:text-prevenort-text/50"
                                        )}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Group selection */}
                        {formData.visibility === 'groups' && (
                            <div className="p-3 bg-prevenort-surface/30 rounded-xl border border-prevenort-border">
                                {loadingGroups ? (
                                    <div className="flex items-center gap-2 text-prevenort-text/30 text-xs">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Cargando grupos...
                                    </div>
                                ) : groups.length === 0 ? (
                                    <div className="flex items-center gap-2 text-prevenort-text/20 text-xs">
                                        <Users className="w-3 h-3" /> No hay grupos creados en Mensajería
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {groups.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => toggleGroup(g.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                                    formData.targetGroupIds.includes(g.id)
                                                        ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                                                        : "bg-prevenort-surface text-prevenort-text/30 border-prevenort-border hover:text-prevenort-text/50"
                                                )}
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Publish mode & Toggles ───────────────────── */}
                    <div className="space-y-3 p-4 bg-prevenort-surface/30 rounded-xl border border-prevenort-border">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPublishMode('now')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                    publishMode === 'now'
                                        ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                        : "bg-prevenort-surface text-prevenort-text/40 border-prevenort-border hover:border-prevenort-text/20"
                                )}
                            >
                                <Send className="w-3.5 h-3.5" />
                                Publicar ahora
                            </button>
                            <button
                                onClick={() => setPublishMode('scheduled')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                    publishMode === 'scheduled'
                                        ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                                        : "bg-prevenort-surface text-prevenort-text/40 border-prevenort-border hover:border-prevenort-text/20"
                                )}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Programar
                            </button>
                        </div>

                        {publishMode === 'scheduled' && (
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Fecha de publicación
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledAt}
                                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                    className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text/60 focus:outline-none focus:border-info/50"
                                />
                            </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isPinned}
                                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                                className="rounded border-prevenort-border"
                            />
                            <Pin className="w-3.5 h-3.5 text-prevenort-text/40" />
                            <span className="text-xs text-prevenort-text/60 font-medium">Fijar en portada</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-prevenort-border">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs text-prevenort-text/40 hover:text-prevenort-text/60 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploadingImages || !formData.title.trim() || !formData.content.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-prevenort-primary hover:bg-prevenort-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                        {saving || uploadingImages ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {uploadingImages ? 'Subiendo imágenes...'
                            : isEditing ? 'Guardar Cambios'
                                : publishMode === 'scheduled' ? 'Programar'
                                    : 'Publicar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
