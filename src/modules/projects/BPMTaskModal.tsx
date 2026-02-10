import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import {
    X,
    Layers,
    User,
    Clock,
    Plus,
    Paperclip,
    FileText,
    Sparkles,
    Loader2,
    CheckCircle2,
    Circle,
    Trash2
} from 'lucide-react';

import type { BPMTask, Professional, Project, SubTask } from '../../types/core';

interface BPMTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<BPMTask>) => Promise<{ success: boolean; error?: any }>;
    initialData?: BPMTask | null;
    projects: Project[];
    professionals: Professional[];
    defaultStatus?: BPMTask['status'];
}

const STATUS_OPTIONS: { id: BPMTask['status']; label: string }[] = [
    { id: 'pending', label: 'Pendiente' },
    { id: 'in-progress', label: 'En Proceso' },
    { id: 'completed', label: 'Completado' },
    { id: 'blocked', label: 'Bloqueado' }
];

const PRIORITY_OPTIONS: { id: BPMTask['priority']; label: string; color: string }[] = [
    { id: 'low', label: 'Baja', color: 'text-prevenort-text/40' },
    { id: 'medium', label: 'Media', color: 'text-info' },
    { id: 'high', label: 'Alta', color: 'text-warning' },
    { id: 'critical', label: 'Crítica', color: 'text-danger' }
];

export const BPMTaskModal: React.FC<BPMTaskModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    projects,
    professionals,
    defaultStatus
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<BPMTask>>({
        title: '',
        projectId: projects[0]?.id || '',
        assignedTo: '',
        status: defaultStatus || 'pending',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0],
        aiSummary: '',
        attachments: [],
        subtasks: [],
        progress: 0
    });

    const addSubTask = () => {
        const newSubTask: SubTask = {
            id: `ST-${Date.now()}`,
            title: '',
            completed: false
        };
        setFormData(prev => ({
            ...prev,
            subtasks: [...(prev.subtasks || []), newSubTask]
        }));
    };

    const toggleSubTask = (id: string) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map(st =>
                st.id === id ? { ...st, completed: !st.completed } : st
            )
        }));
    };

    const removeSubTask = (id: string) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks?.filter(st => st.id !== id)
        }));
    };

    const updateSubTaskTitle = (id: string, title: string) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map(st =>
                st.id === id ? { ...st, title } : st
            )
        }));
    };

    const completedCount = formData.subtasks?.filter(st => st.completed).length || 0;
    const totalCount = formData.subtasks?.length || 0;
    const currentProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                projectId: projects[0]?.id || '',
                assignedTo: '',
                status: defaultStatus || 'pending',
                priority: 'medium',
                dueDate: new Date().toISOString().split('T')[0],
                aiSummary: '',
                attachments: []
            });
        }
    }, [initialData, isOpen, projects, defaultStatus]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await onSave(formData);
        setIsSubmitting(false);
        if (result.success) onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-prevenort-surface border border-prevenort-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-prevenort-border flex items-center justify-between sticky top-0 bg-prevenort-surface/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center border border-info/20">
                            <Layers className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">
                                {initialData ? 'Editar Tarea' : 'Nueva Tarea BPM'}
                            </h2>
                            <p className="text-[10px] text-prevenort-text/40 font-mono uppercase tracking-widest">
                                Seguimiento de Objetivos
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-prevenort-primary/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-prevenort-text/40" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Título de la Tarea</label>
                            <input
                                required
                                placeholder="Ej: Auditoría de Red Portezuelo..."
                                className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full px-4 py-3 text-sm focus:border-info/50 outline-none text-prevenort-text transition-all font-bold"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Proyecto</label>
                                <select
                                    required
                                    className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full px-4 py-2.5 text-sm focus:border-info/50 outline-none text-prevenort-text appearance-none transition-all"
                                    value={formData.projectId}
                                    onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                >
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Responsable</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20" />
                                    <select
                                        required
                                        className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm focus:border-info/50 outline-none text-prevenort-text appearance-none transition-all"
                                        value={formData.assignedTo}
                                        onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                    >
                                        <option value="">Asignar a...</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Estado</label>
                                <select
                                    className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full px-4 py-2.5 text-sm focus:border-info/50 outline-none text-prevenort-text appearance-none transition-all"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    {STATUS_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Prioridad</label>
                                <select
                                    className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full px-4 py-2.5 text-sm focus:border-info/50 outline-none text-prevenort-text appearance-none transition-all"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                >
                                    {PRIORITY_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className={opt.color}>{opt.label.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Fecha Límite</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20" />
                                <input
                                    type="date"
                                    className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm focus:border-info/50 outline-none text-prevenort-text transition-all"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-prevenort-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[10px] uppercase font-black text-prevenort-text/60 tracking-widest">Subtareas / Checklist</h3>
                                    {totalCount > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-info/10 text-info rounded-md font-mono">
                                            {completedCount}/{totalCount} ({currentProgress}%)
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={addSubTask}
                                    className="text-[9px] uppercase font-black text-info hover:opacity-80 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Nueva Subtarea
                                </button>
                            </div>

                            <div className="space-y-2">
                                {formData.subtasks?.map((st) => (
                                    <div key={st.id} className="flex items-center gap-3 group">
                                        <button
                                            type="button"
                                            onClick={() => toggleSubTask(st.id)}
                                            className={cn(
                                                "transition-colors",
                                                st.completed ? "text-success" : "text-prevenort-text/20 hover:text-prevenort-text/40"
                                            )}
                                        >
                                            {st.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>
                                        <input
                                            placeholder="Detalle de la subtarea..."
                                            className={cn(
                                                "flex-1 bg-transparent border-none outline-none text-sm transition-all",
                                                st.completed ? "text-prevenort-text/20 line-through" : "text-prevenort-text/80"
                                            )}
                                            value={st.title}
                                            onChange={(e) => updateSubTaskTitle(st.id, e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSubTask(st.id)}
                                            className="p-1 text-transparent group-hover:text-danger/40 hover:text-danger transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {totalCount > 0 && (
                                    <div className="h-1.5 w-full bg-prevenort-border/50 rounded-full overflow-hidden mt-2">
                                        <div
                                            className="h-full bg-success transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                            style={{ width: `${currentProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3 text-info" />
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Observaciones AI (Agrawall)</label>
                            </div>
                            <textarea
                                placeholder="Escribe un resumen o deja que AI lo genere..."
                                className="bg-prevenort-bg border border-prevenort-border rounded-xl w-full px-4 py-3 text-sm focus:border-info/50 outline-none text-prevenort-text transition-all h-24 resize-none font-mono text-[11px]"
                                value={formData.aiSummary}
                                onChange={e => setFormData({ ...formData, aiSummary: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Archivos / Anexos</label>
                            <input
                                type="file"
                                id="task-file-upload"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const newAttachment = {
                                            name: file.name,
                                            url: '#', // In a real app, this would be the uploaded URL
                                            type: file.type
                                        };
                                        setFormData({
                                            ...formData,
                                            attachments: [...(formData.attachments || []), newAttachment]
                                        });
                                    }
                                }}
                            />
                            <div
                                onClick={() => document.getElementById('task-file-upload')?.click()}
                                className="border-2 border-dashed border-prevenort-border rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-info/30 transition-colors cursor-pointer group"
                            >
                                <Paperclip className="w-6 h-6 text-prevenort-text/10 group-hover:text-info transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-prevenort-text/20">Click para subir o arrastrar</span>
                            </div>

                            {formData.attachments && formData.attachments.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {formData.attachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-prevenort-bg border border-prevenort-border rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3 h-3 text-info" />
                                                <span className="text-[10px] text-prevenort-text/80">{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newFiles = [...(formData.attachments || [])];
                                                    newFiles.splice(i, 1);
                                                    setFormData({ ...formData, attachments: newFiles });
                                                }}
                                                className="text-danger hover:opacity-80"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-prevenort-border rounded-xl hover:bg-prevenort-primary/5 transition-all text-xs font-black uppercase tracking-widest text-prevenort-text/40"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="flex-[2] px-4 py-3 bg-prevenort-primary text-white hover:opacity-90 rounded-xl transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Guardar Tarea</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
