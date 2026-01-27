import React, { useState } from 'react';
import { Shield, AlertTriangle, Info, Filter, Search, BarChart3, ArrowUpRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ClinicalAudit, AgrawallLevel } from '../../types/audit';

const MOCK_AUDITS: ClinicalAudit[] = [
    {
        id: 'ADT-001',
        patientName: 'Eduardo Frei',
        examType: 'TC Tórax',
        date: '2026-01-26',
        professionalId: 'P-001',
        professionalName: 'Dr. Roberto Agrawall',
        reportContent: 'Hallazgos compatibles con neumotórax apical derecho de aproximadamente 20%... requiere drenaje inmediato.',
        agrawallScore: 4,
        aiClassificationReason: 'Identificación de neumotórax que requiere intervención quirúrgica inmediata.',
        status: 'pending',
        findings: ['Neumotórax 20%', 'Colapso pulmonar parcial']
    },
    {
        id: 'ADT-002',
        patientName: 'Michelle Bachelet',
        examType: 'RM Cerebro',
        date: '2026-01-26',
        professionalId: 'P-002',
        professionalName: 'Dra. María Paz',
        reportContent: 'Parénquima cerebral de morfología y señal conservada. No se observan colecciones ni sangrado.',
        agrawallScore: 1,
        aiClassificationReason: 'Estudio completamente normal.',
        status: 'reviewed',
        findings: ['Normal']
    },
    {
        id: 'ADT-003',
        patientName: 'Sebastián Piñera',
        examType: 'TC Abdomen',
        date: '2026-01-25',
        professionalId: 'P-003',
        professionalName: 'Dr. Jean Phillipe',
        reportContent: 'Imagen focal hipodensa en segmento IVb de 5mm, inespecífica, probablemente quiste simple.',
        agrawallScore: 2,
        aiClassificationReason: 'Hallazgo incidental inespecífico sin sospecha de malignidad inmediata.',
        status: 'reviewed',
        findings: ['Quiste hepático simple']
    }
];

export const AuditorDashboard: React.FC = () => {
    const [selectedAudit, setSelectedAudit] = useState<ClinicalAudit | null>(null);

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
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Tasa Crítica</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-red-400">12.5%</span>
                            <AlertTriangle className="w-4 h-4 text-red-400/50" />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Total Auditorías</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">1,248</span>
                            <Shield className="w-4 h-4 text-blue-400/50" />
                        </div>
                    </div>
                </div>
            </div>

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
                        {MOCK_AUDITS.map((audit) => (
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
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border text-lg font-black", getLevelColor(audit.agrawallScore))}>
                                            {audit.agrawallScore}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white/90">{audit.patientName}</h4>
                                            <p className="text-xs text-white/40">{audit.examType} • {audit.date}</p>
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
                                <h3 className="text-xl font-bold">{selectedAudit.patientName}</h3>
                                <p className="text-sm text-white/40 mb-4">{selectedAudit.examType}</p>

                                <div className={cn("p-4 rounded-xl border mb-6", getLevelColor(selectedAudit.agrawallScore))}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Escala Agrawall Nivel {selectedAudit.agrawallScore}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{selectedAudit.aiClassificationReason}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">Hallazgos Extraídos (IA)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedAudit.findings.map((f, i) => (
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
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center">
                            <Info className="w-12 h-12 text-white/10 mb-4" />
                            <h3 className="font-bold text-white/40">Seleccione una auditoría</h3>
                            <p className="text-xs text-white/20 max-w-[200px] mt-2">
                                Haga clic en un registro para ver el análisis detallado de la escala Agrawall.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
