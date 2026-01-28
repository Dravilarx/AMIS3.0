import React, { useState, useEffect } from 'react';
import { X, User, MapPin, ClipboardList, Loader2, Save, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ClinicalProcedure } from '../../types/clinical';

interface ClinicalProcedureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<ClinicalProcedure>) => Promise<{ success: boolean; error?: string }>;
    initialData?: ClinicalProcedure | null;
}

export const ClinicalProcedureModal: React.FC<ClinicalProcedureModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [formData, setFormData] = useState<Partial<ClinicalProcedure>>({
        patientName: '',
        examType: '',
        location: 'Sede Boreal - Providencia',
        details: {
            admissionVerified: false,
            preparationChecklist: [],
            inventoryUsed: [],
            comments: ''
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                details: {
                    admissionVerified: initialData.details?.admissionVerified ?? false,
                    preparationChecklist: initialData.details?.preparationChecklist ?? [],
                    inventoryUsed: initialData.details?.inventoryUsed ?? [],
                    comments: initialData.details?.comments ?? '',
                    attachments: initialData.details?.attachments ?? [],
                    messagingInstructions: initialData.details?.messagingInstructions ?? ''
                }
            });
        } else {
            setFormData({
                patientName: '',
                examType: '',
                location: 'Sede Boreal - Providencia',
                details: {
                    admissionVerified: false,
                    preparationChecklist: [],
                    inventoryUsed: [],
                    comments: ''
                }
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await onSave(formData);
        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Error al guardar el procedimiento');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#0A0A0B] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">
                                {initialData ? 'Editar Procedimiento' : 'Nuevo Procedimiento Clínico'}
                            </h3>
                            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Admisión & Workflow Centralizado</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3" /> Nombre del Paciente
                            </label>
                            <input
                                required
                                value={formData.patientName}
                                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                placeholder="E.j. Juan Pérez"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Tipo de Examen
                            </label>
                            <input
                                required
                                value={formData.examType}
                                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                                placeholder="E.j. TC de Tórax con Contraste"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Ubicación / Sede
                        </label>
                        <select
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white"
                        >
                            <option value="Sede Boreal - Providencia">Sede Boreal - Providencia</option>
                            <option value="Sede Amis - Las Condes">Sede Amis - Las Condes</option>
                            <option value="Sede Portezuelo - Vitacura">Sede Portezuelo - Vitacura</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            Observaciones / Comentarios
                        </label>
                        <textarea
                            value={formData.details?.comments || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                details: { ...formData.details!, comments: e.target.value }
                            })}
                            rows={4}
                            placeholder="Instrucciones adicionales o notas de admisión..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white resize-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white/5 text-white/60 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {initialData ? 'Actualizar' : 'Iniciar Procedimiento'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
