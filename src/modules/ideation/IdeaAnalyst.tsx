import React, { useState, useRef } from 'react';
import { Sparkles, Target, FileText, Upload, Loader2, Radar, Clipboard, Zap, TrendingUp, Activity, Scale, BrainCircuit, FileSpreadsheet, MousePointer2, Trash2, Eye, Table2, LayoutGrid, ArrowUpDown, ExternalLink, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIdeas } from '../../hooks/useIdeas';

export const IdeaAnalyst: React.FC = () => {
    const { analyses, loading, processNewIdea, processTextIdea, deleteIdea, updateIdeaStatus } = useIdeas();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [pasteText, setPasteText] = useState('');
    const [ideaTitle, setIdeaTitle] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<'detail' | 'worklist'>('detail');
    const [sortField, setSortField] = useState<'date' | 'score' | 'decision'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File) => {
        if (!file) return;
        setIsAnalyzing(true);
        const result = await processNewIdea(file);
        if (result.success) {
            setSelectedAnalysis(result.analysis);
            setViewMode('detail');
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
            setViewMode('detail');
        } else {
            alert('Error en análisis: ' + result.error);
        }
        setIsAnalyzing(false);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteIdea(id);
        if (result.success) {
            if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
            setConfirmDelete(null);
        }
    };

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const getScore = (report: any) => report.strategic_analysis?.viabilityScore || report.viabilityScore || 0;
    const getDecision = (report: any) => report.strategic_analysis?.decision || report.decision || 'N/A';

    const sortedAnalyses = [...analyses].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') cmp = new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime();
        else if (sortField === 'score') cmp = getScore(a) - getScore(b);
        else cmp = getDecision(a).localeCompare(getDecision(b));
        return sortDir === 'desc' ? -cmp : cmp;
    });

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

    const decisionColor = (d: string) =>
        d === 'AVANZAR' ? 'text-success' : d === 'PIVOTAR' ? 'text-warning' : 'text-danger';
    const decisionBg = (d: string) =>
        d === 'AVANZAR' ? 'bg-success/20 text-success' : d === 'PIVOTAR' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger';

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Estratégico */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                <div className="flex items-center gap-2">
                    {/* View Mode Switcher */}
                    <div className="flex bg-prevenort-surface p-1 rounded-xl border border-prevenort-border mr-2">
                        <button
                            onClick={() => setViewMode('detail')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'detail' ? "bg-info text-white" : "text-prevenort-text/30 hover:text-prevenort-text")}
                            title="Vista Detalle"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('worklist')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'worklist' ? "bg-info text-white" : "text-prevenort-text/30 hover:text-prevenort-text")}
                            title="Worklist"
                        >
                            <Table2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Input Mode */}
                    <div className="flex bg-prevenort-surface p-1 rounded-xl border border-prevenort-border">
                        <button
                            onClick={() => setInputMode('file')}
                            className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                inputMode === 'file' ? "bg-prevenort-primary text-white" : "text-prevenort-text/40 hover:text-prevenort-text")}
                        >
                            <MousePointer2 className="w-3 h-3 inline-block mr-2" /> Documento
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                inputMode === 'text' ? "bg-prevenort-primary text-white" : "text-prevenort-text/40 hover:text-prevenort-text")}
                        >
                            <Clipboard className="w-3 h-3 inline-block mr-2" /> Texto
                        </button>
                    </div>
                </div>
            </header>

            {/* === COMPACT INPUT ZONE === */}
            {inputMode === 'text' ? (
                <div className="card-premium p-4 space-y-3 bg-prevenort-surface/50">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                        <input
                            type="text"
                            placeholder="TÍTULO DE LA IDEA"
                            value={ideaTitle}
                            onChange={(e) => setIdeaTitle(e.target.value)}
                            className="bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-2.5 text-prevenort-text text-xs font-bold focus:outline-none focus:border-info/50 uppercase tracking-widest"
                        />
                        <textarea
                            placeholder="Describe la idea o pega el contenido..."
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            rows={1}
                            className="bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-2.5 text-prevenort-text text-xs focus:outline-none focus:border-info/50 resize-none font-mono"
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={isAnalyzing || !ideaTitle || !pasteText}
                            className="bg-info hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-lg shadow-info/20 flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Analizar
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "flex items-center gap-4 px-5 py-3 border-2 border-dashed rounded-2xl transition-all cursor-pointer group",
                        isDragging
                            ? "bg-info/10 border-info scale-[1.01] shadow-[0_0_30px_rgba(37,99,235,0.15)]"
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
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all shrink-0",
                        isDragging ? "bg-info text-white animate-bounce" : "bg-prevenort-surface text-prevenort-text/20 group-hover:text-info group-hover:bg-info/10"
                    )}>
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-prevenort-text/60 font-black text-xs uppercase tracking-[0.15em]">
                            {isAnalyzing ? "Analizando..." : isDragging ? "¡Suelta aquí!" : "Arrastra un archivo o haz clic para seleccionar"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[8px] font-mono uppercase tracking-[0.15em] text-prevenort-text/25">
                            <span className="flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> PDF / DOCX</span>
                            <span className="flex items-center gap-1"><FileSpreadsheet className="w-2.5 h-2.5" /> EXCEL / CSV</span>
                            <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> TXT</span>
                        </div>
                    </div>
                    <div className="px-5 py-2 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:scale-105 transition-transform shrink-0">
                        {isAnalyzing ? 'Procesando...' : 'Subir'}
                    </div>
                </div>
            )}

            {/* === WORKLIST VIEW === */}
            {viewMode === 'worklist' ? (
                <div className="card-premium bg-prevenort-surface/50 overflow-hidden">
                    <div className="p-5 border-b border-prevenort-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-info" />
                            <h3 className="text-sm font-black text-prevenort-text uppercase tracking-widest">Worklist Estratégico</h3>
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-prevenort-text/40">{analyses.length} ideas</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-prevenort-surface text-[9px] font-black uppercase tracking-widest text-prevenort-text/30">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:text-prevenort-text/60 transition-colors" onClick={() => toggleSort('date')}>
                                        <span className="flex items-center gap-1">Fecha <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="p-4">Título / Idea</th>
                                    <th className="p-4 cursor-pointer hover:text-prevenort-text/60 transition-colors" onClick={() => toggleSort('decision')}>
                                        <span className="flex items-center gap-1">Decisión <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:text-prevenort-text/60 transition-colors text-center" onClick={() => toggleSort('score')}>
                                        <span className="flex items-center gap-1 justify-center">Score <ArrowUpDown className="w-3 h-3" /></span>
                                    </th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-prevenort-border">
                                {sortedAnalyses.map((report) => {
                                    const decision = getDecision(report);
                                    const score = getScore(report);
                                    return (
                                        <tr key={report.id} className="hover:bg-prevenort-surface/40 transition-colors group">
                                            <td className="p-4 text-prevenort-text/40 font-mono text-[10px] whitespace-nowrap">
                                                {new Date(report.analyzed_at).toLocaleDateString('es-CL')}
                                            </td>
                                            <td className="p-4">
                                                <p className="font-black text-prevenort-text/80 uppercase tracking-tight text-[11px] truncate max-w-[300px]">{report.title}</p>
                                                {report.executive_summary && (
                                                    <p className="text-[9px] text-prevenort-text/30 truncate max-w-[300px] mt-0.5">{report.executive_summary.slice(0, 80)}...</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider", decisionBg(decision))}>
                                                    {decision}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-lg font-black text-info">{score}</span>
                                                    <span className="text-[9px] text-prevenort-text/20 font-bold">/25</span>
                                                </div>
                                                <div className="flex gap-0.5 justify-center mt-1">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <div key={s} className={cn("h-1 w-3 rounded-full", s <= Math.round(score / 5) ? "bg-info" : "bg-prevenort-border")} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <select
                                                    value={report.status || 'completed'}
                                                    onChange={(e) => updateIdeaStatus(report.id, e.target.value)}
                                                    className="bg-prevenort-surface border border-prevenort-border rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider outline-none focus:border-info/50 text-prevenort-text/50 appearance-none cursor-pointer"
                                                >
                                                    <option value="completed">Completado</option>
                                                    <option value="in_review">En Revisión</option>
                                                    <option value="approved">Aprobada</option>
                                                    <option value="rejected">Rechazada</option>
                                                    <option value="archived">Archivada</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => { setSelectedAnalysis(report.strategic_analysis || report); setViewMode('detail'); }}
                                                        className="p-1.5 rounded-lg hover:bg-info/10 text-prevenort-text/30 hover:text-info transition-all"
                                                        title="Ver detalle"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {report.original_document_url && (
                                                        <a href={report.original_document_url} target="_blank" rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg hover:bg-prevenort-primary/10 text-prevenort-text/30 hover:text-prevenort-primary transition-all"
                                                            title="Ver documento original"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    {confirmDelete === report.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleDelete(report.id)} className="px-2 py-1 rounded-lg bg-danger text-white text-[8px] font-black uppercase">Sí</button>
                                                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg bg-prevenort-surface text-prevenort-text/40 text-[8px] font-black uppercase border border-prevenort-border">No</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(report.id)}
                                                            className="p-1.5 rounded-lg hover:bg-danger/10 text-prevenort-text/30 hover:text-danger transition-all"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {analyses.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <Sparkles className="w-8 h-8 text-prevenort-text/5 mx-auto mb-3" />
                                            <p className="text-prevenort-text/20 font-mono text-[10px] uppercase tracking-[0.3em]">No hay análisis aún</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : !data ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <Sparkles className="w-12 h-12 text-prevenort-text/5 mb-4" />
                    <p className="text-prevenort-text/20 font-mono text-[10px] uppercase tracking-[0.5em]">Esperando Datos de Entrada...</p>
                </div>
            ) : (
                /* === DETAIL VIEW === */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-24">
                    {/* Sidebar Repositorio con botonera */}
                    <div className="lg:col-span-3 space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-prevenort-text/30 uppercase tracking-[0.3em]">Repositorio ({analyses.length})</h3>
                        </div>
                        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1 scrollbar-premium">
                            {analyses.map((report) => {
                                const decision = getDecision(report);
                                const isActive = (selectedAnalysis?.id === report.id || (!selectedAnalysis && analyses[0]?.id === report.id));
                                return (
                                    <div
                                        key={report.id}
                                        className={cn(
                                            "relative p-3.5 rounded-2xl border transition-all group",
                                            isActive
                                                ? "bg-info/10 border-info/40"
                                                : "bg-prevenort-surface border-prevenort-border hover:border-prevenort-text/10"
                                        )}
                                    >
                                        <button
                                            className="w-full text-left"
                                            onClick={() => setSelectedAnalysis(report.strategic_analysis || report)}
                                        >
                                            <p className="text-[9px] text-prevenort-text/30 font-mono mb-1">{new Date(report.analyzed_at).toLocaleDateString('es-CL')}</p>
                                            <p className="text-[11px] font-black text-prevenort-text/80 uppercase truncate group-hover:text-prevenort-text transition-colors tracking-tight">{report.title}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase", decisionBg(decision))}>
                                                    {decision}
                                                </div>
                                                <span className="text-[9px] font-black text-info">{getScore(report)}/25</span>
                                            </div>
                                        </button>

                                        {/* Action Buttons */}
                                        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {report.original_document_url && (
                                                <a href={report.original_document_url} target="_blank" rel="noopener noreferrer"
                                                    className="p-1 rounded-lg hover:bg-prevenort-primary/10 text-prevenort-text/20 hover:text-prevenort-primary transition-all"
                                                    title="Ver documento"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                            {confirmDelete === report.id ? (
                                                <div className="flex items-center gap-1 bg-prevenort-surface border border-danger/30 rounded-lg px-1 py-0.5">
                                                    <button onClick={() => handleDelete(report.id)} className="text-[7px] font-black text-danger uppercase px-1">Sí</button>
                                                    <button onClick={() => setConfirmDelete(null)} className="text-[7px] font-black text-prevenort-text/30 uppercase px-1">No</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(report.id); }}
                                                    className="p-1 rounded-lg hover:bg-danger/10 text-prevenort-text/20 hover:text-danger transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-9 space-y-6 animate-in slide-in-from-right-8 duration-700">

                        {/* HEADER DE DECISIÓN */}
                        <div className="card-premium p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-prevenort-surface/80 border-prevenort-border">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-prevenort-text/40 uppercase tracking-widest">Decisión Estratégica</p>
                                <h4 className={cn("text-4xl font-black italic tracking-tighter", decisionColor(data.decision))}>{data.decision}</h4>
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
