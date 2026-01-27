import React, { useState } from 'react';
import { ClipboardCheck, Thermometer, Stethoscope, CheckCircle2, ArrowRight, User, MapPin, Clock, Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useClinicalWorkflow } from './useClinicalWorkflow';
import type { ClinicalProcedure } from '../../types/clinical';

const MOCK_PROCEDURES: ClinicalProcedure[] = [
    {
        id: 'PROC-001',
        patientName: 'Juan Pérez',
        examType: 'TC de Tórax con Contraste',
        currentStep: 'Admisión',
        timestamp: '2026-01-26T14:30:00Z',
        location: 'Sede Boreal - Providencia',
        status: 'active',
        details: {
            admissionVerified: false,
            preparationChecklist: [],
            inventoryUsed: []
        }
    },
    {
        id: 'PROC-002',
        patientName: 'Ana María Soto',
        examType: 'RM de Rodilla',
        currentStep: 'Preparación',
        timestamp: '2026-01-26T14:15:00Z',
        location: 'Sede Amis - Las Condes',
        status: 'active',
        details: {
            admissionVerified: true,
            preparationChecklist: ['Ayuno verificado', 'Signos vitales estables'],
            inventoryUsed: []
        }
    }
];

const STEP_ICONS = {
    'Admisión': ClipboardCheck,
    'Preparación': Thermometer,
    'Ejecución': Stethoscope,
    'Cierre': CheckCircle2
};

export const ClinicalWorkflowView: React.FC = () => {
    const { procedures, moveNext } = useClinicalWorkflow(MOCK_PROCEDURES);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const handleMoveNext = async (id: string) => {
        setProcessingIds((prev: Set<string>) => new Set(prev).add(id));
        try {
            await moveNext(id);
        } finally {
            setProcessingIds((prev: Set<string>) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Procedimientos Clínicos</h2>
                    <p className="text-white/40 text-sm">Workflow de 4 pasos interactivo (Admisión → Cierre)</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            placeholder="Buscar paciente o examen..."
                            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 w-64 transition-all"
                        />
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <Filter className="w-4 h-4 text-white/60" />
                    </button>
                </div>
            </div>

            <div className="grid gap-6">
                {procedures.map((proc) => (
                    <div key={proc.id} className="card-premium group border-white/5 hover:border-blue-500/30 transition-all duration-500">
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Patient Info Side */}
                            <div className="lg:w-1/4 border-r border-white/5 pr-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <User className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{proc.patientName}</h4>
                                        <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">{proc.id}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-white/40">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Llegada: {new Date(proc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/40">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>{proc.location}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest mb-1">Examen</p>
                                    <p className="text-sm font-medium text-white/80">{proc.examType}</p>
                                </div>
                            </div>

                            {/* Steps Flow Side */}
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex justify-between relative mb-8">
                                    {/* Progress Line */}
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />

                                    {['Admisión', 'Preparación', 'Ejecución', 'Cierre'].map((step, index) => {
                                        const Icon = STEP_ICONS[step as keyof typeof STEP_ICONS];
                                        const isCompleted = ['Admisión', 'Preparación', 'Ejecución', 'Cierre'].indexOf(proc.currentStep) > index;
                                        const isActive = proc.currentStep === step;

                                        return (
                                            <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                                    isCompleted ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                                                        isActive ? "bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" :
                                                            "bg-black border-white/10 text-white/20"
                                                )}>
                                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-widest",
                                                    isActive ? "text-white" : isCompleted ? "text-emerald-400" : "text-white/20"
                                                )}>
                                                    {step}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="bg-white/5 rounded-lg px-4 py-3 border border-white/10 flex-1 mr-4">
                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Status Actual</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-white/90">
                                                {proc.currentStep === 'Admisión' && "Verificando previsión y consentimiento..."}
                                                {proc.currentStep === 'Preparación' && "Checklist de seguridad y signos vitales..."}
                                                {proc.currentStep === 'Ejecución' && "Procedimiento en sala con especialista..."}
                                                {proc.currentStep === 'Cierre' && "Validación de muestras y alta..."}
                                            </p>
                                            {proc.details.messagingInstructions && (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                                                    APP NOTIFIED
                                                </span>
                                            )}
                                        </div>
                                        {proc.details.messagingInstructions && (
                                            <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded text-[11px] text-white/60 italic leading-relaxed">
                                                <p className="font-bold text-white/80 not-italic mb-1 uppercase tracking-widest text-[9px]">Instrucción Gemini AI:</p>
                                                {proc.details.messagingInstructions}
                                            </div>
                                        )}
                                        {proc.details.inventoryUsed.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-white/5 flex gap-2 overflow-x-auto">
                                                {proc.details.inventoryUsed.map((item, i) => (
                                                    <span key={i} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/60 whitespace-nowrap">
                                                        {item.item} x{item.quantity}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleMoveNext(proc.id)}
                                        disabled={processingIds.has(proc.id)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
                                    >
                                        {processingIds.has(proc.id) ? (
                                            <>
                                                <Clock className="w-4 h-4 animate-spin" />
                                                <span>Procesando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Siguiente Paso</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {procedures.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                        <ClipboardCheck className="w-12 h-12 text-white/10 mb-4" />
                        <p className="text-white/40">No hay procedimientos activos en este momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
