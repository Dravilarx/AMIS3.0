import React, { useState, useEffect } from 'react';
import { X, Layers, Briefcase, Lock, Globe, Shield, Tag, Link as LinkIcon, Loader2, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Project, HoldingCompany } from '../../types/core';
import type { Tender } from '../../types/tenders';
import { useAuth } from '../../hooks/useAuth';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Partial<Project>) => Promise<{ success: boolean; error?: any }>;
    initialData?: Project | null;
    existingProjects?: Project[];
    tenders?: Tender[];
}

const COMPANIES: HoldingCompany[] = ['Portezuelo', 'Boreal', 'Amis', 'Soran', 'Vitalmédica', 'Resomag', 'Ceimavan', 'Irad'];
const PRIVACY_LEVELS = ['public', 'private', 'confidential'] as const;
const STATUS_OPTIONS = ['draft', 'active', 'on-hold', 'completed', 'archived'] as const;

export const ProjectModal: React.FC<ProjectModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    existingProjects,
    tenders
}) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        holdingId: 'Portezuelo',
        managerId: user?.id || 'USR-01',
        status: 'active',
        progress: 0,
        privacyLevel: 'public',
        startDate: new Date().toISOString().split('T')[0],
        tags: [],
        tenderId: ''
    });

    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                holdingId: 'Portezuelo',
                managerId: user?.id || 'USR-01',
                status: 'active',
                progress: 0,
                privacyLevel: 'public',
                startDate: new Date().toISOString().split('T')[0],
                tags: [],
                tenderId: ''
            });
        }
    }, [initialData, isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await onSave(formData);
        setIsSubmitting(false);
        if (result.success) onClose();
    };

    const addTag = () => {
        if (tagInput && !formData.tags?.includes(tagInput)) {
            setFormData({ ...formData, tags: [...(formData.tags || []), tagInput] });
            setTagInput('');
        }
    };

    const removeTag = (index: number) => {
        const newTags = [...(formData.tags || [])];
        newTags.splice(index, 1);
        setFormData({ ...formData, tags: newTags });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-950 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Layers className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                {initialData ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                            </h2>
                            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                                Gestión de Iniciativas Portezuelo
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                {/* DataLists para Autocompletado Inteligente */}
                <datalist id="project-tags-list">
                    {Array.from(new Set(['Urgencia', 'Telemedicina', 'AI', 'Infraestructura', 'Cloud', 'Radiología', ...(existingProjects?.flatMap(p => p.tags) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Sección 1: Identificación */}
                    <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Identificación</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nombre del Proyecto</label>
                            <input
                                required
                                className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none text-white"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Empresa Mandante</label>
                                <select
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none text-white appearance-none"
                                    value={formData.holdingId}
                                    onChange={e => setFormData({ ...formData, holdingId: e.target.value as HoldingCompany })}
                                >
                                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Fecha Inicio</label>
                                <input
                                    type="date"
                                    required
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none text-white"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Configuración del Proyecto */}
                    <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Configuración avanzada</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nivel de Privacidad</label>
                                <div className="flex p-1 bg-neutral-900 border border-white/10 rounded-lg">
                                    {PRIVACY_LEVELS.map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, privacyLevel: level })}
                                            className={cn(
                                                "flex-1 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all",
                                                formData.privacyLevel === level ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white/40"
                                            )}
                                        >
                                            {level === 'public' && <Globe className="w-3 h-3 mx-auto mb-1" />}
                                            {level === 'private' && <Lock className="w-3 h-3 mx-auto mb-1" />}
                                            {level === 'confidential' && <Shield className="w-3 h-3 mx-auto mb-1" />}
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Estado Inicial</label>
                                <select
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none text-white appearance-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Vincular Licitación (Opcional)</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <select
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full pl-10 pr-4 py-2 text-sm focus:border-blue-500/50 outline-none text-white appearance-none"
                                    value={formData.tenderId || ''}
                                    onChange={e => setFormData({ ...formData, tenderId: e.target.value })}
                                >
                                    <option value="">Ninguna</option>
                                    {tenders?.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.id} - {t.identificacion?.tipoServicio || 'Sin Tipo'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sección 3: Taxonomía y Etiquetas */}
                    <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-purple-400" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Categorización</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    list="project-tags-list"
                                    placeholder="Nueva etiqueta..."
                                    className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none text-white"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-white/60"
                                >
                                    Agregar
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.tags?.map((tag, i) => (
                                    <span key={i} className="flex items-center gap-1 text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-md font-bold uppercase tracking-widest">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(i)} className="hover:text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest text-white/40"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="flex-[2] px-4 py-3 bg-white text-black hover:bg-white/90 rounded-xl transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Crear Proyecto</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
