import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Sparkles, Loader2, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTenderScoring } from './useTenderScoring';
import { useTenders } from '../../hooks/useTenders';
import { useProjects } from '../../hooks/useProjects';
import { TenderParserModal } from './TenderParserModal';
import type { Tender } from '../../types/tenders';

export const TenderDashboard: React.FC = () => {
    const { tenders, loading, error } = useTenders();
    const { addProject } = useProjects();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isParserOpen, setIsParserOpen] = useState(false);
    const [creatingProject, setCreatingProject] = useState(false);

    // Seleccionar la primera licitación válida
    const activeTender = tenders.find(t => t.id === selectedId) || tenders[0];

    const handleCreateProject = async () => {
        if (!activeTender) return;
        setCreatingProject(true);
        const newProject = {
            id: `PRJ-${activeTender.id.split('-').pop()}`,
            name: `Ejecución: ${activeTender.identificacion.tipoServicio}`,
            holdingId: 'HOLD-01', // Default or derived
            managerId: 'USR-01', // Should come from auth
            status: 'active' as const,
            progress: 0,
            privacyLevel: activeTender.riesgoSLA.escala > 6 ? 'confidential' as const : 'public' as const,
            startDate: new Date().toISOString().split('T')[0],
            tags: [activeTender.identificacion.modalidad, 'Licitación'],
            tenderId: activeTender.id
        };

        const { success } = await addProject(newProject);
        setCreatingProject(false);
        if (success) {
            alert('Proyecto BPM iniciado exitosamente vinculado a esta licitaciones.');
        }
    };

    // Scoring dinámico (asumiendo capacidad de 800 profesionales para el cálculo)
    const { realMargin, decision, isOverCapacity, riskScore } = useTenderScoring(activeTender || {} as Tender, 800);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white/40 font-mono text-sm">Calculando viabilidad de proyectos...</p>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center card-premium border-red-500/20">
            <p className="text-red-400">Error en el motor de licitaciones: {error}</p>
        </div>
    );

    if (!activeTender) return (
        <div className="p-12 text-center card-premium border-white/5 space-y-4">
            <p className="text-white/40 italic">No hay licitaciones registradas en el sistema.</p>
            <button
                onClick={() => setIsParserOpen(true)}
                className="mx-auto flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-xl"
            >
                <Sparkles className="w-5 h-5" />
                <span>Cargar y Analizar Bases con IA</span>
            </button>
        </div>
    );

    const getStatusColor = () => {
        switch (decision) {
            case 'PARTICIPAR': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'REVISAR': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'NO_PARTICIPAR': return 'text-red-400 bg-red-500/10 border-red-500/20';
        }
    };

    const StatusIcon = {
        'PARTICIPAR': CheckCircle2,
        'REVISAR': AlertTriangle,
        'NO_PARTICIPAR': XCircle
    }[decision];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header con IA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">Análisis de Licitación</h2>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Validación contra Matriz de Riesgo v3.0</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 transition-all text-white/60"
                        value={selectedId || ''}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        {tenders.map(t => (
                            <option key={t.id} value={t.id} className="bg-[#0a0a0a]">{t.id} - {t.identificacion.tipoServicio}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsParserOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-all font-bold text-xs uppercase tracking-tight shadow-xl shadow-blue-500/20 border border-blue-400/30"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Analizar PDF con Agrawall AI</span>
                    </button>
                </div>
            </div>

            <TenderParserModal isOpen={isParserOpen} onClose={() => setIsParserOpen(false)} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Principal - Detalles */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium group">
                        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6 group-hover:text-blue-400 transition-colors">Identificación & Volumen</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-[9px] text-white/30 uppercase font-mono mb-1">Servicio</p>
                                <p className="font-bold text-white/90">{activeTender.identificacion.tipoServicio}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/30 uppercase font-mono mb-1">Modalidad</p>
                                <p className="font-bold text-white/90">{activeTender.identificacion.modalidad}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/30 uppercase font-mono mb-1">Volumen Total</p>
                                <p className="font-bold text-blue-400">{activeTender.volumen.total.toLocaleString()} un.</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-white/30 uppercase font-mono mb-1">Duración</p>
                                <p className="font-bold text-white/90">{activeTender.identificacion.duracion}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card-premium">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Integración Técnica</h3>
                            <div className="space-y-3">
                                {Object.entries(activeTender.integracion).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-all px-1">
                                        <span className="capitalize text-white/50">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className={value ? "text-emerald-400" : "text-white/20 font-mono"}>
                                            {value ? "REQUERIDO" : "N/A"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card-premium">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Penalidades (Max)</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/50">Tope Porcentual del Contrato</span>
                                    <span className="font-black text-red-500">{activeTender.multas.topePorcentualContrato}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 p-[1px]">
                                    <div
                                        className="bg-gradient-to-r from-orange-500 to-red-600 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${activeTender.multas.topePorcentualContrato}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-white/20 italic">Valores calculados sobre el presupuesto total anual de la licitación.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Lateral - Decisión (Semáforo) */}
                <div className="space-y-6">
                    {activeTender.riesgoSLA.escala > 7 && (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-start gap-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <div className="p-2 bg-red-500 rounded-lg shadow-lg">
                                <ShieldAlert className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-red-400 uppercase tracking-widest leading-none mb-1">IA ALERT: Riesgo Crítico Detectado</h4>
                                <p className="text-[10px] text-red-500/80 italic leading-tight">Gemini ha identificado cláusulas de SLA draconianas. Se requiere auditoría legal inmediata.</p>
                            </div>
                        </div>
                    )}

                    <div className={cn(
                        "card-premium border-2 flex flex-col items-center text-center py-10 transition-all duration-500 shadow-2xl relative overflow-hidden",
                        getStatusColor()
                    )}>
                        <div className="relative mb-6">
                            <StatusIcon className="w-20 h-20" />
                            <div className="absolute -inset-4 bg-current opacity-10 blur-2xl rounded-full" />
                        </div>
                        <h4 className="text-[9px] uppercase tracking-[0.4em] font-black mb-2 opacity-60">Decisión Estratégica</h4>
                        <p className="text-4xl font-black mb-4 tracking-tighter">{decision.replace('_', ' ')}</p>
                        <div className="px-6 py-1.5 rounded-full border border-current text-[10px] font-black tracking-widest uppercase mb-8">
                            Scoring Engine V3.0
                        </div>

                        {decision === 'PARTICIPAR' && (
                            <button
                                onClick={handleCreateProject}
                                disabled={creatingProject}
                                className="group flex items-center justify-center gap-3 w-[80%] py-4 bg-white text-black rounded-2xl font-black uppercase tracking-tighter text-xs hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                            >
                                {creatingProject ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Layers className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                        <span>Iniciar Proyecto BPM</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="card-premium space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-white/40" />
                                    <span className="text-xs font-bold text-white/70 uppercase">Escala Riesgo SLA</span>
                                </div>
                                <span className="text-2xl font-black font-mono">{riskScore}/8</span>
                            </div>
                            <div className="grid grid-cols-8 gap-1.5">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-3 rounded-sm transition-all duration-500",
                                            i < riskScore
                                                ? (riskScore > 6 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]")
                                                : "bg-white/5"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-white/40" />
                                    <span className="text-xs font-bold text-white/70 uppercase">Margen Real Bruto</span>
                                </div>
                                <span className={cn("text-2xl font-black font-mono", realMargin > 20 ? "text-emerald-400" : "text-amber-400")}>
                                    {realMargin.toFixed(1)}%
                                </span>
                            </div>
                            {isOverCapacity && (
                                <div className="flex items-center gap-3 text-[10px] text-amber-400 bg-amber-400/5 p-4 rounded-xl border border-amber-400/20 backdrop-blur-md animate-in slide-in-from-right-4">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <p className="leading-tight">
                                        <span className="block font-black uppercase mb-1">Costo Staffing Elevado</span>
                                        El volumen de la licitación supera la capacidad instalada. Se aplicó factor de reclutamiento urgente (15%).
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
