import React, { useState } from 'react';
import {
    ClipboardCheck,
    Thermometer,
    Stethoscope,
    CheckCircle2,
    ArrowRight,
    User,
    MapPin,
    Clock,
    Search,
    Filter,
    Plus,
    MessageSquare,
    Paperclip,
    Sparkles,
    Loader2,
    AlertCircle,
    MoreVertical
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useClinicalWorkflow } from './useClinicalWorkflow';
import { ClinicalProcedureModal } from './ClinicalProcedureModal';
import type { ClinicalProcedure } from '../../types/clinical';

const STEP_ICONS = {
    'Admisión': ClipboardCheck,
    'Preparación': Thermometer,
    'Ejecución': Stethoscope,
    'Cierre': CheckCircle2
};

const STEP_ORDER = ['Admisión', 'Preparación', 'Ejecución', 'Cierre'];

export const ClinicalWorkflowView: React.FC = () => {
    const {
        procedures,
        loading,
        error,
        moveNext,
        addProcedure,
        updateProcedure
    } = useClinicalWorkflow();

    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProc, setSelectedProc] = useState<ClinicalProcedure | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleMoveNext = async (id: string) => {
        const proc = procedures.find(p => p.id === id);
        if (proc?.currentStep === 'Admisión' && !proc.details.admissionVerified) {
            if (confirm('¿Desea marcar los documentos de admisión como verificados?')) {
                await updateProcedure(id, { details: { ...proc.details, admissionVerified: true } });
            } else {
                return;
            }
        }

        setProcessingIds((prev) => new Set(prev).add(id));
        try {
            await moveNext(id);
        } finally {
            setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleAddComment = async (procId: string) => {
        const comment = prompt('Ingrese comentario para el registro clínico:');
        if (comment) {
            const proc = procedures.find(p => p.id === procId);
            if (proc) {
                await updateProcedure(procId, {
                    details: { ...proc.details, comments: comment }
                });
            }
        }
    };

    const handleSaveProcedure = async (data: Partial<ClinicalProcedure>) => {
        if (selectedProc) {
            await updateProcedure(selectedProc.id, data);
        } else {
            await addProcedure(data);
        }
        return { success: true };
    };

    const handleAddAttachment = (procId: string) => {
        // Mock attachment logic
        const fileName = prompt('Nombre del archivo:');
        if (fileName) {
            const proc = procedures.find(p => p.id === procId);
            if (proc) {
                const newAttachments = [...(proc.details.attachments || []), {
                    name: fileName,
                    url: '#',
                    type: 'application/pdf'
                }];
                updateProcedure(procId, {
                    details: { ...proc.details, attachments: newAttachments }
                });
            }
        }
    };

    const filteredProcedures = procedures.filter(p => {
        const patientName = p.patientName?.toLowerCase() || '';
        const examType = p.examType?.toLowerCase() || '';
        const id = p.id?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();

        return (
            patientName.includes(search) ||
            examType.includes(search) ||
            id.includes(search)
        );
    });

    if (loading && procedures.length === 0) return (
        <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white/40 font-mono text-sm uppercase tracking-widest text-center italic">Cargando Workflow Clínico...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header section with "Nueva Procedure" button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">Procedimientos Clínicos</h2>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-1">Sincronización de Workflow Centralizado (M9)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            placeholder="Buscar paciente o examen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500/50 w-64 transition-all text-white"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setSelectedProc(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-xs font-black uppercase tracking-tight hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Procedimiento
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                </div>
            )}

            <div className="grid gap-6">
                {filteredProcedures.map((proc) => (
                    <div key={proc.id} className="card-premium group border-white/5 hover:border-blue-500/30 transition-all duration-500">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Patient Info Side */}
                            <div className="lg:w-1/4 lg:border-r border-white/5 pr-0 lg:pr-8 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <User className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg text-white/90 tracking-tight">{proc.patientName}</h4>
                                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{proc.id}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedProc(proc);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-1 text-white/10 hover:text-white transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-black tracking-widest">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Llegada: {new Date(proc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-black tracking-widest">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{proc.location}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Examen Agendado</p>
                                        <p className="text-sm font-bold text-white/80">{proc.examType}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Steps Flow Side */}
                            <div className="flex-1 flex flex-col gap-8">
                                <div className="flex justify-between relative px-2">
                                    {/* Progress Line */}
                                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 z-0" />

                                    {STEP_ORDER.map((step, index) => {
                                        const Icon = STEP_ICONS[step as keyof typeof STEP_ICONS];
                                        const currentIndex = STEP_ORDER.indexOf(proc.currentStep || 'Admisión');
                                        const isCompleted = currentIndex > index;
                                        const isActive = proc.currentStep === step;

                                        return (
                                            <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-500",
                                                    isCompleted ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]" :
                                                        isActive ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" :
                                                            "bg-[#0A0A0B] border-white/10 text-white/10"
                                                )}>
                                                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                                </div>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest",
                                                    isActive ? "text-white" : isCompleted ? "text-emerald-400" : "text-white/20"
                                                )}>
                                                    {step}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col lg:flex-row items-stretch gap-4">
                                    <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Status Actual & Verificación</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAddAttachment(proc.id)}
                                                    className="p-1.5 text-white/20 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                                    title="Adjuntar archivo"
                                                >
                                                    <Paperclip className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAddComment(proc.id)}
                                                    className="p-1.5 text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm text-white/90 font-medium">
                                                {proc.currentStep === 'Admisión' && (
                                                    <>
                                                        {proc.details.admissionVerified ? (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 transition-all animate-in fade-in" />
                                                        ) : (
                                                            <Clock className="w-4 h-4 text-orange-400" />
                                                        )}
                                                        <span>Verificando previsión y consentimiento...</span>
                                                    </>
                                                )}
                                                {proc.currentStep === 'Preparación' && "Checklist de seguridad y signos vitales..."}
                                                {proc.currentStep === 'Ejecución' && "Procedimiento en sala con especialista..."}
                                                {proc.currentStep === 'Cierre' && "Validación de muestras y alta..."}
                                            </div>

                                            {/* Messaging Instructions */}
                                            {proc.details.messagingInstructions && (
                                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl relative group overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                                        <Sparkles className="w-12 h-12 text-blue-500" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Resumen Procedimiento AI</span>
                                                    </div>
                                                    <p className="text-[11px] text-white/60 italic leading-relaxed relative z-10">
                                                        {proc.details.messagingInstructions}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Attachments Section */}
                                            {proc.details.attachments && proc.details.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {proc.details.attachments.map((file, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                                                            <Paperclip className="w-3 h-3 text-blue-400" />
                                                            <span>{file.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Comments Section */}
                                            {proc.details.comments && (
                                                <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                                    <MessageSquare className="w-4 h-4 text-white/20 mt-0.5" />
                                                    <p className="text-xs text-white/50">{proc.details.comments}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleMoveNext(proc.id)}
                                        disabled={processingIds.has(proc.id) || proc.currentStep === 'Cierre'}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-3 px-8 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/5 min-w-[200px]",
                                            proc.currentStep === 'Cierre' && "opacity-20 cursor-not-allowed bg-emerald-500 text-white"
                                        )}
                                    >
                                        {processingIds.has(proc.id) ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : proc.currentStep === 'Cierre' ? (
                                            <>
                                                <CheckCircle2 className="w-6 h-6" />
                                                <span>Completado</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center bg-black/5">
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
                                                <span>Siguiente Paso</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredProcedures.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] border border-dashed border-white/5 rounded-[32px] text-center">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <ClipboardCheck className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Sin procedimientos activos</p>
                        <p className="text-[10px] text-white/10 font-mono mt-2 uppercase tracking-tighter italic">Inicia un nuevo flujo desde el botón superior</p>
                    </div>
                )}
            </div>

            <ClinicalProcedureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProcedure}
                initialData={selectedProc}
            />
        </div>
    );
};
