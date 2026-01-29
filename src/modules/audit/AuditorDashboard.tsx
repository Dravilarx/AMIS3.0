import React, { useState } from 'react';
import { Shield, AlertTriangle, Info, Filter, Search, BarChart3, ArrowUpRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AgrawallLevel } from '../../types/audit';
import { useAudit } from '../../hooks/useAudit';
import { Plus, Sparkles } from 'lucide-react';
import { AuditParserModal } from './AuditParserModal';

export const AuditorDashboard: React.FC = () => {
    const { audits } = useAudit();
    const [selectedAudit, setSelectedAudit] = useState<any>(null);
    const [isParserOpen, setIsParserOpen] = useState(false);

    const getLevelColor = (level: AgrawallLevel) => {
        switch (level) {
            case 1: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 2: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 3: return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 4: return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-white/40 bg-white/5 border-white/10';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Auditoría Clínica Inteligente</h2>
                    <p className="text-white/40 text-sm italic">Análisis automático mediante Escala de Agrawall (Gemini AI)</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsParserOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl transition-all font-black text-xs uppercase tracking-tight shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Nueva Auditoría IA</span>
                    </button>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[120px]">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Tasa Crítica</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-red-400">12.5%</span>
                            <AlertTriangle className="w-4 h-4 text-red-400/50" />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[120px]">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Total Auditorías</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{audits.length}</span>
                            <Shield className="w-4 h-4 text-blue-400/50" />
                        </div>
                    </div>
                </div>
            </div>

            <AuditParserModal isOpen={isParserOpen} onClose={() => setIsParserOpen(false)} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Side */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Buscar por paciente o hallazgo..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                        </div>
                        <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                            <Filter className="w-4 h-4 text-white/60" />
                        </button>
                    </div>

                    <div className="grid gap-3">
                        {audits.map((audit) => (
                            <div
                                key={audit.id}
                                onClick={() => setSelectedAudit(audit)}
                                className={cn(
                                    "p-4 rounded-xl border transition-all cursor-pointer group",
                                    selectedAudit?.id === audit.id
                                        ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5"
                                        : "bg-white/5 border-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border text-lg font-black", getLevelColor(audit.score))}>
                                            {audit.score}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white/90">{audit.patient_name || 'Paciente del Proyecto'}</h4>
                                            <p className="text-xs text-white/40">{audit.projects?.name} • {new Date(audit.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter",
                                            audit.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                                        )}>
                                            {audit.status}
                                        </span>
                                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail Side */}
                <div className="lg:col-span-1">
                    {selectedAudit ? (
                        <div className="card-premium space-y-6 sticky top-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Detalle de Auditoría</span>
                                <button onClick={() => setSelectedAudit(null)} className="text-white/20 hover:text-white">×</button>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold">{selectedAudit.patient_name || 'Análisis de Proyecto'}</h3>
                                <p className="text-sm text-white/40 mb-4">{selectedAudit.projects?.name}</p>

                                <div className={cn("p-4 rounded-xl border mb-6", getLevelColor(selectedAudit.score))}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Escala Agrawall Nivel {selectedAudit.score}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{selectedAudit.compliance_details?.aiClassificationReason || 'Cumplimiento analizado por IA'}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Hallazgos Extraídos (IA)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedAudit.anomalies || []).map((f: string, i: number) => (
                                                <span key={i} className="text-[11px] px-2 py-1 bg-white/5 border border-white/10 rounded text-white/70">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> Informe Original
                                        </p>
                                        <p className="text-xs text-white/60 italic leading-relaxed line-clamp-4">
                                            "{selectedAudit.reportContent}"
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button className="py-2.5 px-4 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-all">
                                        Validar
                                    </button>
                                    <button className="py-2.5 px-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-all">
                                        Escalar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center space-y-6">
                            <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20 animate-pulse">
                                <Info className="w-8 h-8 text-blue-400/50" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white/90">Seleccione una auditoría</h3>
                                <p className="text-xs text-white/40 max-w-[240px] mt-2 leading-relaxed">
                                    Haga clic en un registro a la izquierda para ver el análisis detallado de la escala Agrawall.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black">O también puedes</p>
                                <button
                                    onClick={() => setIsParserOpen(true)}
                                    className="px-6 py-3 bg-white text-black hover:bg-white/90 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Iniciar Análisis</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
