import React, { useState, useRef } from 'react';
import { Sparkles, Target, FileText, Upload, Loader2, Radar, Clipboard, Zap, TrendingUp, Activity, Scale, BrainCircuit, FileSpreadsheet, MousePointer2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIdeas } from '../../hooks/useIdeas';

export const IdeaAnalyst: React.FC = () => {
    const { analyses, loading, processNewIdea, processTextIdea } = useIdeas();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [pasteText, setPasteText] = useState('');
    const [ideaTitle, setIdeaTitle] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
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

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleTextSubmit = async () => {
        if (!ideaTitle || !pasteText) {
            alert('Por favor, ingresa un título y el contenido de la idea.');
            return;
        }

        setIsAnalyzing(true);
        const result = await processTextIdea(ideaTitle, pasteText);
        if (result.success) {
            setSelectedAnalysis(result.analysis);
            setPasteText('');
            setIdeaTitle('');
        } else {
            alert('Error en análisis: ' + result.error);
        }
        setIsAnalyzing(false);
    };

    if (loading && analyses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-info animate-spin mb-4" />
                <p className="text-prevenort-text/40 text-[10px] font-mono uppercase tracking-[0.3em]">Iniciando Motor de Inteligencia Estratégica...</p>
            </div>
        );
    }

    const currentReport = selectedAnalysis || (analyses[0]?.strategic_analysis || analyses[0]);
    const rawReport = selectedAnalysis || analyses[0];

    // Helper to get formatted data for UI components
    const getReportData = () => {
        if (!currentReport) return null;

        return {
            title: currentReport.title || rawReport?.title || 'Sin Título',
            decision: currentReport.decision || 'PENDIENTE',
            viabilityScore: currentReport.viabilityScore || 0,
            strategicJustification: currentReport.strategicJustification || currentReport.executive_summary || currentReport.executiveSummary || 'Sin análisis estratégico disponible.',
            conceptualFile: currentReport.conceptualFile || {
                problem: currentReport.problem || 'N/A',
                solution: currentReport.solution || 'N/A',
                target: currentReport.target || 'N/A',
                businessModel: currentReport.businessModel || 'N/A',
                valueProposition: currentReport.valueProposition || 'N/A',
                criticalRisks: currentReport.criticalRisks || 'N/A'
            },
            scoringMatrix: currentReport.scoringMatrix || {
                economicPotential: { score: 0, justification: 'Pendiente' },
                executionFeasibility: { score: 0, justification: 'Pendiente' },
                riskLevel: { score: 0, justification: 'Pendiente' },
                operationalComplexity: { score: 0, justification: 'Pendiente' },
                timeToMoney: { score: 0, justification: 'Pendiente' }
            },
            consistencyAnalysis: currentReport.consistencyAnalysis || {
                synthesis: 'Pendiente',
                perspectives: { medical: 'N/A', engineering: 'N/A', financial: 'N/A', legal: 'N/A' }
            }
        };
    };

    const data = getReportData();

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Estratégico */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-info rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                        <BrainCircuit className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-prevenort-text tracking-tighter uppercase italic">Lluvia de Ideas AI</h1>
                        <p className="text-prevenort-text/40 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                            <Radar className="w-3 h-3" /> AGRAWALL STRATEGIC ANALYST (v6.0)
                        </p>
                    </div>
                </div>

                <div className="flex bg-prevenort-surface p-1 rounded-xl border border-prevenort-border">
                    <button
                        onClick={() => setInputMode('file')}
                        className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            inputMode === 'file' ? "bg-prevenort-primary text-white" : "text-prevenort-text/40 hover:text-prevenort-text")}
                    >
                        <MousePointer2 className="w-3 h-3 inline-block mr-2" /> Analizar Documento
                    </button>
                    <button
                        onClick={() => setInputMode('text')}
                        className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            inputMode === 'text' ? "bg-prevenort-primary text-white" : "text-prevenort-text/40 hover:text-prevenort-text")}
                    >
                        <Clipboard className="w-3 h-3 inline-block mr-2" /> Pegar Texto
                    </button>
                </div>
            </header>

            {/* Input Section */}
            <div className="card-premium p-6 space-y-4 bg-prevenort-surface/50 relative">
                {inputMode === 'text' ? (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="TÍTULO DE LA IDEA / PROYECTO"
                                value={ideaTitle}
                                onChange={(e) => setIdeaTitle(e.target.value)}
                                className="bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-prevenort-text text-xs font-bold focus:outline-none focus:border-info/50 uppercase tracking-widest"
                            />
                            <button
                                onClick={handleTextSubmit}
                                disabled={isAnalyzing || !ideaTitle || !pasteText}
                                className="bg-info hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-info/20 flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                Ejecutar Análisis Estratégico
                            </button>
                        </div>
                        <textarea
                            placeholder="PEGA AQUÍ LOS DETALLES DE TU LLUVIA DE IDEAS..."
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            className="w-full h-32 bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-3 text-prevenort-text text-sm focus:outline-none focus:border-info/50 resize-none font-mono"
                        />
                    </div>
                ) : (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer rounded-2xl group",
                            isDragging
                                ? "bg-info/10 border-info scale-[1.01] shadow-[0_0_40px_rgba(37,99,235,0.2)]"
                                : "bg-prevenort-surface/30 border-prevenort-border hover:border-prevenort-text/20 hover:bg-prevenort-surface/50"
                        )}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={onFileChange}
                            accept=".pdf,.txt,.docx,.doc,.xlsx,.xls,.csv"
                            disabled={isAnalyzing}
                        />

                        <div className="flex flex-col items-center gap-4 text-center p-8">
                            <div className={cn(
                                "p-4 rounded-full transition-all duration-500",
                                isDragging ? "bg-info text-white animate-bounce" : "bg-prevenort-surface text-prevenort-text/20 group-hover:text-info group-hover:bg-info/10"
                            )}>
                                {isAnalyzing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
                            </div>

                            <div>
                                <p className="text-prevenort-text/80 font-black text-sm uppercase tracking-[0.2em]">
                                    {isAnalyzing ? "Analizando Información..." : (isDragging ? "¡Suéltalo aquí!" : "Arrastra o selecciona un archivo")}
                                </p>
                                <div className="mt-3 flex items-center justify-center gap-4 text-[9px] font-mono uppercase tracking-[0.2em] text-prevenort-text/30">
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF / DOCX</span>
                                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> EXCEL / CSV</span>
                                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> TXT</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!data ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <Sparkles className="w-12 h-12 text-prevenort-text/5 mb-4" />
                    <p className="text-prevenort-text/20 font-mono text-[10px] uppercase tracking-[0.5em]">Esperando Datos de Entrada...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-24">
                    {/* Sidebar Historial */}
                    <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-[10px] font-black text-prevenort-text/30 uppercase tracking-[0.3em] pl-2">Repositorio de Análisis</h3>
                        <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2 scrollbar-premium">
                            {analyses.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedAnalysis(report.strategic_analysis || report)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden",
                                        (selectedAnalysis?.id === report.id || (!selectedAnalysis && analyses[0].id === report.id))
                                            ? "bg-info/10 border-info/40"
                                            : "bg-prevenort-surface border-prevenort-border hover:border-prevenort-text/10"
                                    )}
                                >
                                    <p className="text-[9px] text-prevenort-text/30 font-mono mb-1">{new Date(report.analyzed_at).toLocaleDateString()}</p>
                                    <p className="text-[11px] font-black text-prevenort-text/80 uppercase truncate group-hover:text-prevenort-text transition-colors tracking-tight">{report.title}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                                            (report.strategic_analysis?.decision || report.decision) === 'AVANZAR' ? "bg-success/20 text-success" :
                                                (report.strategic_analysis?.decision || report.decision) === 'PIVOTAR' ? "bg-warning/20 text-warning" :
                                                    "bg-danger/20 text-danger"
                                        )}>
                                            {report.strategic_analysis?.decision || report.decision || 'N/A'}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-9 space-y-8 animate-in slide-in-from-right-8 duration-700">

                        {/* HEADER DE DECISIÓN */}
                        <div className="card-premium p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-prevenort-surface/80 border-prevenort-border">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-prevenort-text/40 uppercase tracking-widest">Decisión Estratégica</p>
                                <h4 className={cn("text-4xl font-black italic tracking-tighter",
                                    data.decision === 'AVANZAR' ? "text-success" :
                                        data.decision === 'PIVOTAR' ? "text-warning" :
                                            "text-danger"
                                )}>{data.decision}</h4>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-prevenort-text/40 uppercase tracking-widest mb-1">Score de Viabilidad</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-prevenort-text">{data.viabilityScore}</span>
                                    <span className="text-xl font-bold text-prevenort-text/30">/ 25</span>
                                </div>
                            </div>
                        </div>

                        {/* MÓDULO 1: FICHA CONCEPTUAL */}
                        <div className="card-premium p-8 bg-prevenort-bg/40 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                <Target className="w-48 h-48" />
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xl font-black text-prevenort-text italic mb-2 flex items-center gap-3">
                                    <span className="bg-info text-white w-6 h-6 rounded flex items-center justify-center text-xs not-italic">1</span>
                                    Ficha Conceptual
                                </h3>
                                <div className="h-0.5 w-full bg-gradient-to-r from-info/50 to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <section className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-info uppercase tracking-widest">Problema / Oportunidad</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.problem}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-info uppercase tracking-widest">Solución Propuesta</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.solution}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-info uppercase tracking-widest">Público Objetivo (Target)</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.target}</p>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-info uppercase tracking-widest">Modelo de Negocio</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.businessModel}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-info uppercase tracking-widest">Propuesta de Valor</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.valueProposition}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-danger uppercase tracking-widest">Riesgos Críticos</p>
                                        <p className="text-sm text-prevenort-text/70 leading-relaxed font-medium">{data.conceptualFile.criticalRisks}</p>
                                    </div>
                                </section>
                            </div>

                            <div className="mt-8 p-6 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <p className="text-[10px] font-black text-prevenort-text/30 uppercase tracking-widest mb-2">Justificación Estratégica</p>
                                <p className="text-sm text-prevenort-text/60 italic leading-relaxed">"{data.strategicJustification}"</p>
                            </div>
                        </div>

                        {/* MÓDULO 2: EVALUACIÓN ESTRUCTURADA */}
                        <div className="card-premium p-8 bg-prevenort-bg/40 backdrop-blur-xl">
                            <div className="mb-8">
                                <h3 className="text-xl font-black text-prevenort-text italic mb-2 flex items-center gap-3">
                                    <span className="bg-info text-white w-6 h-6 rounded flex items-center justify-center text-xs not-italic">2</span>
                                    Evaluación Estructurada (Matriz de Puntuación)
                                </h3>
                                <div className="h-0.5 w-full bg-gradient-to-r from-info/50 to-transparent" />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                                {[
                                    { label: 'Potencial Económico', value: data.scoringMatrix.economicPotential.score },
                                    { label: 'Factibilidad Técnica', value: data.scoringMatrix.executionFeasibility.score },
                                    { label: 'Nivel de Riesgo', value: data.scoringMatrix.riskLevel.score },
                                    { label: 'Complejidad Op.', value: data.scoringMatrix.operationalComplexity.score },
                                    { label: 'Time to Money', value: data.scoringMatrix.timeToMoney.score },
                                ].map((item, i) => (
                                    <div key={i} className="card-premium p-4 flex flex-col items-center bg-prevenort-surface/50">
                                        <p className="text-[8px] font-black text-prevenort-text/40 uppercase tracking-widest text-center mb-3 h-6 flex items-center">{item.label}</p>
                                        <span className="text-3xl font-black text-info mb-2">{item.value}</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(step => (
                                                <div key={step} className={cn("h-1 w-3 rounded-full", step <= item.value ? "bg-info" : "bg-prevenort-border")} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-hidden border border-prevenort-border rounded-2xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-prevenort-surface text-[10px] font-black uppercase tracking-widest text-prevenort-text/40">
                                        <tr>
                                            <th className="p-4">Criterio</th>
                                            <th className="p-4 text-center">Puntos</th>
                                            <th className="p-4">Justificación Técnica</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-prevenort-border">
                                        {[
                                            { label: 'Potencial Económico', ...data.scoringMatrix.economicPotential },
                                            { label: 'Factibilidad Ejecución', ...data.scoringMatrix.executionFeasibility },
                                            { label: 'Nivel de Riesgo (5=Bajo)', ...data.scoringMatrix.riskLevel },
                                            { label: 'Complejidad Operativa', ...data.scoringMatrix.operationalComplexity },
                                            { label: 'Time to Money', ...data.scoringMatrix.timeToMoney },
                                        ].map((item, i) => (
                                            <tr key={i} className="hover:bg-prevenort-surface/30 transition-colors">
                                                <td className="p-4 font-black text-prevenort-text/80 uppercase tracking-tight">{item.label}</td>
                                                <td className="p-4 text-center font-black text-info text-lg">{item.score}</td>
                                                <td className="p-4 text-prevenort-text/50 leading-relaxed">{item.justification}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* MÓDULO 3: ANÁLISIS DE CONSISTENCIA */}
                        <div className="card-premium p-8 bg-prevenort-bg/40 backdrop-blur-xl">
                            <div className="mb-8">
                                <h3 className="text-xl font-black text-prevenort-text italic mb-2 flex items-center gap-3">
                                    <span className="bg-info text-white w-6 h-6 rounded flex items-center justify-center text-xs not-italic">3</span>
                                    Análisis de Consistencia y Visión Estratégica
                                </h3>
                                <div className="h-0.5 w-full bg-gradient-to-r from-info/50 to-transparent" />
                            </div>

                            <div className="mb-8 space-y-3">
                                <p className="text-[10px] font-black text-info uppercase tracking-widest">Cruces y Consistencia del Proyecto</p>
                                <p className="text-base text-prevenort-text/80 leading-relaxed italic font-medium">"{data.consistencyAnalysis.synthesis}"</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { icon: Activity, label: 'Médico / Salud', color: 'text-blue-400', content: data.consistencyAnalysis.perspectives.medical },
                                    { icon: Zap, label: 'Ingeniería', color: 'text-amber-400', content: data.consistencyAnalysis.perspectives.engineering },
                                    { icon: TrendingUp, label: 'Financiero', color: 'text-emerald-400', content: data.consistencyAnalysis.perspectives.financial },
                                    { icon: Scale, label: 'Legal / Reg.', color: 'text-purple-400', content: data.consistencyAnalysis.perspectives.legal },
                                ].map((item, i) => (
                                    <div key={i} className="card-premium p-5 bg-prevenort-surface/50 space-y-3 border-prevenort-border hover:border-prevenort-text/10 transition-all group">
                                        <div className="flex items-center gap-2">
                                            <item.icon className={cn("w-4 h-4", item.color)} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", item.color)}>{item.label}</span>
                                        </div>
                                        <p className="text-xs text-prevenort-text/50 leading-relaxed font-medium line-clamp-6">{item.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
