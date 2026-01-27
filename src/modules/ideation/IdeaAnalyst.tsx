import React, { useState } from 'react';
import { Lightbulb, Sparkles, Target, BarChart3, AlertTriangle, CheckCircle2, FileText, Upload, Loader2, Radar, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIdeas } from '../../hooks/useIdeas';

export const IdeaAnalyst: React.FC = () => {
    const { analyses, loading, processNewIdea } = useIdeas();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        const result = await processNewIdea(file);
        if (result.success) {
            setSelectedAnalysis(result.analysis);
        } else {
            alert('Error en análisis: ' + result.error);
        }
        setIsAnalyzing(false);
    };

    if (loading && analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.3em]">Cargando Matriz de Ideación Estratégica...</p>
            </div>
        );
    }

    const currentReport = selectedAnalysis || analyses[0];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Estratégico */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                        <Lightbulb className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white/90 tracking-tighter uppercase italic">Lluvia de Ideas AI</h1>
                        <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                            <Radar className="w-3 h-3" /> Expert Project Analyst Engine (v4.0)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <label className={cn(
                        "flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl cursor-pointer hover:bg-white/90 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5",
                        isAnalyzing && "opacity-50 pointer-events-none"
                    )}>
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Analizar Nueva Idea</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" />
                    </label>
                </div>
            </header>

            {!currentReport ? (
                <div className="card-premium py-32 flex flex-col items-center justify-center border-dashed border-white/5 bg-white/[0.01]">
                    <Sparkles className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-white/30 font-mono text-sm uppercase tracking-[0.3em]">Carga un documento para iniciar el análisis experto</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panel Lateral: Historial / Selector */}
                    <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] pl-2">Análisis Recientes</h3>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {analyses.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedAnalysis(report)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all group",
                                        (selectedAnalysis?.id === report.id || (!selectedAnalysis && analyses[0].id === report.id))
                                            ? "bg-blue-600/10 border-blue-500/40"
                                            : "bg-white/5 border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <p className="text-xs font-black text-white/80 uppercase truncate mb-1">{report.title}</p>
                                    <p className="text-[9px] text-white/30 font-mono">{new Date(report.analyzed_at).toLocaleDateString()}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reporte Principal: Reporte Ejecutivo */}
                    <div className="lg:col-span-9 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="card-premium bg-emerald-500/5 border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Viabilidad</span>
                                </div>
                                <p className="text-sm font-medium text-emerald-100/90">{currentReport.strategic_analysis?.viability || currentReport.strategicAnalysis?.viability}</p>
                            </div>
                            <div className="card-premium bg-blue-500/5 border-blue-500/20">
                                <div className="flex items-center gap-2 mb-2 text-blue-400">
                                    <Target className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Alineación</span>
                                </div>
                                <p className="text-sm font-medium text-blue-100/90">{currentReport.strategic_analysis?.strategicAlignment || currentReport.strategicAnalysis?.strategicAlignment}</p>
                            </div>
                            <div className="card-premium bg-amber-500/5 border-amber-500/20">
                                <div className="flex items-center gap-2 mb-2 text-amber-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Gaps Funcionales</span>
                                </div>
                                <p className="text-sm font-medium text-amber-100/90">{(currentReport.risks_and_mitigation?.functionalGaps || currentReport.functionalGaps)?.length || 0} identificados</p>
                            </div>
                        </div>

                        <div className="card-premium p-8 space-y-8 bg-black/40 backdrop-blur-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <ShieldCheck className="w-40 h-40 text-blue-500" />
                            </div>

                            <section>
                                <h2 className="text-2xl font-black text-white/90 mb-4 tracking-tight flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-blue-500" />
                                    Resumen Ejecutivo Profesional
                                </h2>
                                <p className="text-white/60 leading-relaxed text-sm italic border-l-2 border-blue-600/30 pl-6">
                                    "{currentReport.executive_summary || currentReport.executiveSummary}"
                                </p>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-400" />
                                        Métricas Clave & KPIs
                                    </h3>
                                    <div className="space-y-3">
                                        {(currentReport.resource_projections?.kpis || currentReport.kpis || []).map((kpi: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">{kpi.name}</span>
                                                <span className="text-xs font-black text-blue-400">{kpi.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Radar className="w-4 h-4 text-emerald-400" />
                                        Análisis FODA (SWOT)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas'].map((cat, i) => (
                                            <div key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <p className="text-[9px] font-black text-white/30 uppercase mb-2">{cat}</p>
                                                <div className="w-full h-1 bg-blue-500/20 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-white/40 text-center italic mt-2">
                                        Análisis detallado disponible en el PDF original.
                                    </p>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
