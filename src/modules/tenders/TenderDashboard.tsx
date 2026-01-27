import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTenderScoring } from './useTenderScoring';
import type { Tender } from '../../types/tenders';

// Mock de una licitación para demostración
const MOCK_TENDER: Tender = {
    id: 'TEN-2026-001',
    identificacion: {
        modalidad: 'Telemedicina',
        tipoServicio: 'Radiología',
        duracion: '24 meses'
    },
    volumen: {
        total: 1000,
        urgencia: 300,
        hospitalizado: 200,
        ambulante: 500
    },
    riesgoSLA: {
        escala: 7, // Muy Alta (2-4h)
        impacto: 'Crítico para servicios de urgencia regional'
    },
    multas: {
        caidaSistema: 2,
        errorDiagnostico: 5,
        confidencialidad: 10,
        topePorcentualContrato: 20
    },
    integracion: {
        dicom: true,
        hl7: true,
        risPacs: true,
        servidorOnPrem: false
    },
    economia: {
        presupuestoTotal: 150000000,
        precioUnitarioHabil: 15000,
        precioUnitarioUrgencia: 22000,
        margenProyectado: 30
    }
};

export const TenderDashboard: React.FC = () => {
    const [activeTender] = useState<Tender>(MOCK_TENDER);
    const { realMargin, decision, isOverCapacity, riskScore } = useTenderScoring(activeTender, 800);

    const getStatusColor = () => {
        switch (decision) {
            case 'PARTICIPAR': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'REVISAR': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'NO_PARTICIPAR': return 'text-red-400 bg-red-500/10 border-red-500/20';
        }
    };

    const getStatusIcon = () => {
        switch (decision) {
            case 'PARTICIPAR': return CheckCircle2;
            case 'REVISAR': return AlertTriangle;
            case 'NO_PARTICIPAR': return XCircle;
        }
    };

    const StatusIcon = getStatusIcon();

    return (
        <div className="space-y-6">
            {/* Header con IA */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Análisis de Licitación</h2>
                    <p className="text-white/40 text-sm">Validación contra Matriz de Riesgo v3.0</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-blue-500/20 group">
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>Parsear PDF con Gemini</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Principal - Detalles */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium">
                        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6">Identificación & Volumen</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase mb-1">Servicio</p>
                                <p className="font-medium">{activeTender.identificacion.tipoServicio}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase mb-1">Modalidad</p>
                                <p className="font-medium">{activeTender.identificacion.modalidad}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase mb-1">Volumen Total</p>
                                <p className="font-medium">{activeTender.volumen.total} un.</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase mb-1">Duración</p>
                                <p className="font-medium">{activeTender.identificacion.duracion}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card-premium">
                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Integración Técnica</h3>
                            <div className="space-y-2">
                                {Object.entries(activeTender.integracion).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                        <span className="capitalize opacity-60">{key}</span>
                                        <span className={value ? "text-emerald-400" : "text-white/20"}>
                                            {value ? "Requerido" : "No aplica"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card-premium">
                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Penalidades (Max)</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="opacity-60">Tope Procentual</span>
                                    <span className="font-bold text-red-400">{activeTender.multas.topePorcentualContrato}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full" style={{ width: `${activeTender.multas.topePorcentualContrato}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Lateral - Decisión (Semáforo) */}
                <div className="space-y-6">
                    <div className={cn("card-premium border-2 flex flex-col items-center text-center py-10", getStatusColor())}>
                        <StatusIcon className="w-16 h-16 mb-4" />
                        <h4 className="text-xs uppercase tracking-[0.2em] font-black mb-1 opacity-60">Decisión de Matriz</h4>
                        <p className="text-3xl font-black mb-4">{decision.replace('_', ' ')}</p>
                        <div className="px-4 py-1 rounded-full border border-current text-[10px] font-bold">
                            SCORING V3.0
                        </div>
                    </div>

                    <div className="card-premium space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-white/40" />
                                    <span className="text-sm font-medium">Riesgo Escala SLA</span>
                                </div>
                                <span className="text-xl font-bold">{riskScore}/8</span>
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className={cn("h-2 rounded-sm", i < riskScore ? (riskScore > 6 ? "bg-red-500" : "bg-blue-500") : "bg-white/5")} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-white/40" />
                                    <span className="text-sm font-medium">Margen Real (Post-Staff)</span>
                                </div>
                                <span className={cn("text-xl font-bold", realMargin > 20 ? "text-emerald-400" : "text-amber-400")}>
                                    {realMargin.toFixed(1)}%
                                </span>
                            </div>
                            {isOverCapacity && (
                                <div className="flex items-center gap-2 text-[10px] text-amber-400 bg-amber-400/10 p-2 rounded-md border border-amber-400/20">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                    <span>Costo incremental aplicado por exceso de capacidad.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
