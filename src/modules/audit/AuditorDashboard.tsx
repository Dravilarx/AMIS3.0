import React, { useState } from 'react';
import { Shield, AlertTriangle, Info, Filter, Search, BarChart3, ArrowUpRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AgrawallLevel } from '../../types/audit';
import { useAudit } from '../../hooks/useAudit';
import { Sparkles } from 'lucide-react';
import { InlineAuditUploader } from './InlineAuditUploader';

export const AuditorDashboard: React.FC = () => {
    const { audits } = useAudit();
    const [selectedAudit, setSelectedAudit] = useState<any>(null);
    const [showUploader, setShowUploader] = useState(false);

    const getLevelColor = (level: AgrawallLevel) => {
        switch (level) {
            case 1: return 'text-success bg-success/10 border-success/20';
            case 2: return 'text-info bg-info/10 border-info/20';
            case 3: return 'text-warning bg-warning/10 border-warning/20';
            case 4: return 'text-danger bg-danger/10 border-danger/20';
            default: return 'text-prevenort-text/40 bg-prevenort-surface/50 border-prevenort-border';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-prevenort-text">Gestión de Casos Clínicos</h2>
                    <p className="text-prevenort-text/40 text-sm">Análisis de Discrepancias y Reclamos Radiológicos (Agrawall)</p>
                </div>
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl transition-all font-black text-xs uppercase tracking-tight shadow-lg shadow-blue-500/20 border border-blue-400/30"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>NUEVO CASO IA</span>
                </button>
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Total Casos</p>
                        <h3 className="text-2xl font-black text-prevenort-text">{audits.length}</h3>
                    </div>
                    <div className="p-3 bg-prevenort-surface rounded-xl border border-prevenort-border">
                        <FileText className="w-5 h-5 text-prevenort-text/40" />
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Nuevos (Pendientes)</p>
                        <h3 className="text-2xl font-black text-info">
                            {audits.filter(a => a.status === 'pending').length}
                        </h3>
                    </div>
                    <div className="p-3 bg-info/10 rounded-xl border border-info/10">
                        <Info className="w-5 h-5 text-info" />
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">En Gestión</p>
                        <h3 className="text-2xl font-black text-warning">0</h3>
                    </div>
                    <div className="p-3 bg-warning/10 rounded-xl border border-warning/10">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Resueltos</p>
                        <h3 className="text-2xl font-black text-success">
                            {audits.filter(a => a.status === 'completed').length}
                        </h3>
                    </div>
                    <div className="p-3 bg-success/10 rounded-xl border border-success/10">
                        <Shield className="w-5 h-5 text-success" />
                    </div>
                </div>
            </div>

            {/* Agrawall Distribution Grid */}
            <div className="card-premium p-6 bg-gradient-to-br from-prevenort-surface to-transparent border border-prevenort-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-info/20 rounded-lg text-info">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-prevenort-text uppercase tracking-wider">Distribución Agrawall</h3>
                        <p className="text-[10px] text-prevenort-text/40 uppercase tracking-tighter">Niveles de Discrepancia detectados por IA</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[0, 1, 2, 3, 4, 5].map((level) => {
                        const count = audits.filter(a => a.score === level).length;
                        return (
                            <div key={level} className="bg-prevenort-surface border border-prevenort-border rounded-xl p-4 flex flex-col items-center group hover:bg-prevenort-primary/5 transition-all">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black mb-2 border",
                                    level === 0 ? "bg-success/20 text-success border-success/20" :
                                        level <= 2 ? "bg-info/20 text-info border-info/20" :
                                            "bg-warning/20 text-warning border-warning/20"
                                )}>
                                    {level}
                                </div>
                                <span className="text-xl font-black text-prevenort-text">{count}</span>
                                <span className="text-[8px] text-prevenort-text/30 uppercase font-bold tracking-widest mt-1">Nivel {level}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Inline Uploader */}
            {showUploader && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl">
                        <InlineAuditUploader onClose={() => setShowUploader(false)} />
                    </div>
                </div>
            )}


            <div className={cn(
                "grid gap-6",
                selectedAudit ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
            )}>
                {/* List Side */}
                <div className={cn(selectedAudit ? "lg:col-span-2" : "lg:col-span-1", "space-y-4")}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Listado de Hallazgos</h3>
                            <div className="h-px w-8 bg-prevenort-border" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-prevenort-text/20" />
                                <input
                                    type="text"
                                    placeholder="Buscar paciente, RUT o descripción..."
                                    className="bg-prevenort-surface border border-prevenort-border rounded-lg pl-9 pr-4 py-1.5 text-[11px] text-prevenort-text focus:outline-none focus:border-prevenort-primary/30 transition-all w-64"
                                />
                            </div>
                            <button className="p-1.5 bg-prevenort-surface border border-prevenort-border rounded-lg hover:bg-prevenort-primary/5 transition-colors">
                                <Filter className="w-3.5 h-3.5 text-prevenort-text/40" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-prevenort-surface border border-prevenort-border rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-prevenort-border bg-prevenort-bg/30">
                                    <th className="px-6 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">Paciente / ID</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">Institución</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap text-center">Nivel Agrawall</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">Estado</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-prevenort-border">
                                {audits.map((audit) => (
                                    <tr
                                        key={audit.id}
                                        onClick={() => setSelectedAudit(audit)}
                                        className={cn(
                                            "hover:bg-prevenort-primary/5 transition-colors cursor-pointer group",
                                            selectedAudit?.id === audit.id && "bg-info/10 border-l-2 border-info"
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-prevenort-text/90 group-hover:text-prevenort-primary transition-colors">
                                                    {audit.patient_name || 'Paciente IA'}
                                                </span>
                                                <span className="text-[10px] text-prevenort-text/20 font-mono">
                                                    ID: {audit.id.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[10px] text-prevenort-text/50 uppercase font-black tracking-tighter">
                                                <Shield className="w-3 h-3 text-prevenort-text/20" />
                                                <span>{audit.projects?.name || 'VITALMÉDICA'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black border",
                                                    getLevelColor(audit.score)
                                                )}>
                                                    {audit.score}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest leading-none",
                                                audit.status === 'pending' ? 'bg-info/20 text-info border-info/20' : 'bg-success/20 text-success border-success/20'
                                            )}>
                                                {audit.status === 'pending' ? 'NUEVO' : 'COMPLETADO'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ArrowUpRight className="w-3.5 h-3.5 text-prevenort-text/10 group-hover:text-prevenort-text/60 ml-auto transition-colors" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Side - Solo aparece cuando hay selección */}
                {selectedAudit && (
                    <div className="lg:col-span-1">
                        <div className="card-premium space-y-6 sticky top-6 bg-prevenort-surface border-prevenort-border">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-prevenort-primary font-bold uppercase tracking-widest">Detalle de Auditoría</span>
                                <button onClick={() => setSelectedAudit(null)} className="text-prevenort-text/20 hover:text-prevenort-text text-xl">×</button>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-prevenort-text">{selectedAudit.patient_name || 'Análisis de Proyecto'}</h3>
                                <p className="text-sm text-prevenort-text/40 mb-4">{selectedAudit.projects?.name}</p>

                                <div className={cn("p-4 rounded-xl border mb-6 shadow-sm", getLevelColor(selectedAudit.score))}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Escala Agrawall Nivel {selectedAudit.score}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{selectedAudit.compliance_details?.aiClassificationReason || 'Cumplimiento analizado por IA'}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest mb-2">Hallazgos Extraídos (IA)</p>
                                        <div className="space-y-2">
                                            {typeof selectedAudit.anomalies === 'string'
                                                ? selectedAudit.anomalies.split('\n').filter(Boolean).map((f: string, i: number) => (
                                                    <div key={i} className="flex gap-2 p-2 bg-prevenort-bg border border-prevenort-border rounded-lg text-[11px] text-prevenort-text/70">
                                                        <span className="text-prevenort-primary font-bold">•</span>
                                                        <span>{f}</span>
                                                    </div>
                                                ))
                                                : (selectedAudit.anomalies || []).map((f: string, i: number) => (
                                                    <div key={i} className="flex gap-2 p-2 bg-prevenort-bg border border-prevenort-border rounded-lg text-[11px] text-prevenort-text/70">
                                                        <span className="text-prevenort-primary font-bold">•</span>
                                                        <span>{f}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="p-4 bg-prevenort-bg/50 border border-prevenort-border rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> Contenido del Informe
                                            </p>
                                        </div>
                                        <div className="text-[11px] text-prevenort-text/60 leading-relaxed font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {selectedAudit.reportContent}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button className="py-2.5 px-4 bg-prevenort-surface border border-prevenort-border text-prevenort-text rounded-lg text-sm font-bold hover:bg-prevenort-primary/5 hover:border-prevenort-primary/30 transition-all">
                                        Validar
                                    </button>
                                    <button className="py-2.5 px-4 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm font-bold hover:bg-danger/20 transition-all">
                                        Escalar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
