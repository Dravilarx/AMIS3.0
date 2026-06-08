import React, { useState } from 'react';
import { ShieldAlert, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Sparkles, Loader2, Layers, FolderOpen, Users, Trash2, X, FileCheck } from 'lucide-react';
import { useTenderFolder } from '../../hooks/useTenderFolder';
import { useTenderExport, type ExportDoc } from '../../hooks/useTenderExport';
import { useProfessionals } from '../../hooks/useProfessionals';
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
    const [showFolder, setShowFolder]     = useState(false);
    const [showExport, setShowExport] = useState(false);
    const { professionals: allProfs }     = useProfessionals();

    // Seleccionar la primera licitación válida
    const activeTender = tenders.find(t => t.id === selectedId) || tenders[0];
    const folder                          = useTenderFolder(activeTender?.id);
    const { exporting, progress, exportPDF, exportZipByProfessional, exportZipByDoc } = useTenderExport();

    const buildExportDocs = (): ExportDoc[] => {
        const docs: ExportDoc[] = [];
        for (const prof of folder.professionals) {
            for (const req of folder.requiredDocs) {
                const status = folder.getDocStatus(prof.professionalId, req.docType);
                if (status?.fileUrl && !status.isPending) {
                    docs.push({
                        professionalId:   prof.professionalId,
                        professionalName: prof.name,
                        docType:          req.docType,
                        docLabel:         req.label,
                        fileUrl:          status.fileUrl,
                        fileName:         status.fileName || `${req.docType}.pdf`,
                    });
                }
            }
        }
        return docs;
    };

    const tenderName = activeTender?.identificacion?.tipoServicio || activeTender?.id || 'Licitacion';
    const exportDocs = buildExportDocs();
    const totalCeldas   = folder.professionals.length * folder.requiredDocs.length;
    const celdasOk      = exportDocs.length;
    const celdasPending = folder.professionals.length * folder.requiredDocs.length > 0
        ? (() => {
            let p = 0;
            for (const prof of folder.professionals)
                for (const req of folder.requiredDocs) {
                    const s = folder.getDocStatus(prof.professionalId, req.docType);
                    if (s?.isPending) p++;
                }
            return p;
        })()
        : 0;
    const celdasFaltan = totalCeldas - celdasOk - celdasPending;

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
            <Loader2 className="w-10 h-10 text-info animate-spin mb-4" />
            <p className="text-brand-text/40 font-mono text-sm">Calculando viabilidad de proyectos...</p>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center card-premium border-danger/20">
            <p className="text-danger">Error en el motor de licitaciones: {error}</p>
        </div>
    );

    if (!activeTender) return (
        <div className="p-12 text-center card-premium border-brand-border space-y-4">
            <p className="text-brand-text/40 italic">No hay licitaciones registradas en el sistema.</p>
            <button
                onClick={() => setIsParserOpen(true)}
                className="mx-auto flex items-center gap-2 px-6 py-3 bg-brand-primary text-white hover:opacity-90 rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-xl"
            >
                <Sparkles className="w-5 h-5" />
                <span>Cargar y Analizar Bases con IA</span>
            </button>
        </div>
    );

    const getStatusColor = () => {
        switch (decision) {
            case 'PARTICIPAR': return 'text-success bg-success/10 border-success/20';
            case 'REVISAR': return 'text-warning bg-warning/10 border-warning/20';
            case 'NO_PARTICIPAR': return 'text-danger bg-danger/10 border-danger/20';
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
                    <h2 className="text-2xl font-black text-brand-text tracking-tighter uppercase">Análisis de Licitación</h2>
                    <p className="text-xs text-brand-text/40 font-mono uppercase tracking-widest">Validación contra Matriz de Riesgo v3.0</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-info/50 transition-all text-brand-text/60"
                        value={selectedId || ''}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        {tenders.map(t => (
                            <option key={t.id} value={t.id} className="bg-brand-surface text-brand-text">{t.id} - {t.identificacion.tipoServicio}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setIsParserOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-info text-white hover:opacity-90 rounded-lg transition-all font-bold text-xs uppercase tracking-tight shadow-xl shadow-info/20 border border-info/30"
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
                        <h3 className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.2em] mb-6 group-hover:text-info transition-colors">Identificación & Volumen</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-[9px] text-brand-text/30 uppercase font-mono mb-1">Servicio</p>
                                <p className="font-bold text-brand-text">{activeTender.identificacion.tipoServicio}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-brand-text/30 uppercase font-mono mb-1">Modalidad</p>
                                <p className="font-bold text-brand-text">{activeTender.identificacion.modalidad}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-brand-text/30 uppercase font-mono mb-1">Volumen Total</p>
                                <p className="font-bold text-info">{activeTender.volumen.total.toLocaleString()} un.</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-brand-text/30 uppercase font-mono mb-1">Duración</p>
                                <p className="font-bold text-brand-text">{activeTender.identificacion.duracion}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card-premium">
                            <h3 className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.2em] mb-4">Integración Técnica</h3>
                            <div className="space-y-3">
                                {Object.entries(activeTender.integracion).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-xs py-2 border-b border-brand-border last:border-0 hover:bg-brand-primary/5 transition-all px-1">
                                        <span className="capitalize text-brand-text/50">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className={value ? "text-success" : "text-brand-text/20 font-mono"}>
                                            {value ? "REQUERIDO" : "N/A"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card-premium">
                            <h3 className="text-[10px] font-black text-brand-text/20 uppercase tracking-[0.2em] mb-4">Penalidades (Max)</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-brand-text/50">Tope Porcentual del Contrato</span>
                                    <span className="font-black text-danger">{activeTender.multas.topePorcentualContrato}%</span>
                                </div>
                                <div className="w-full bg-brand-border/50 h-2 rounded-full overflow-hidden border border-brand-border p-[1px]">
                                    <div
                                        className="bg-gradient-to-r from-warning to-danger h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${activeTender.multas.topePorcentualContrato}%` }}
                                    />
                                </div>
                                <p className="text-[9px] text-brand-text/20 italic">Valores calculados sobre el presupuesto total anual de la licitación.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Lateral - Decisión (Semáforo) */}
                <div className="space-y-6">
                    {activeTender.riesgoSLA.escala > 7 && (
                        <div className="p-4 bg-danger/10 border border-danger/50 rounded-2xl flex items-start gap-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <div className="p-2 bg-danger rounded-lg shadow-lg">
                                <ShieldAlert className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-danger uppercase tracking-widest leading-none mb-1">IA ALERT: Riesgo Crítico Detectado</h4>
                                <p className="text-[10px] text-danger/80 italic leading-tight">Gemini ha identificado cláusulas de SLA draconianas. Se requiere auditoría legal inmediata.</p>
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
                                className="group flex items-center justify-center gap-3 w-[80%] py-4 bg-brand-text text-brand-bg rounded-2xl font-black uppercase tracking-tighter text-xs hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
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
                                    <ShieldAlert className="w-4 h-4 text-brand-text/40" />
                                    <span className="text-xs font-bold text-brand-text/70 uppercase">Escala Riesgo SLA</span>
                                </div>
                                <span className="text-2xl font-black font-mono text-brand-text">{riskScore}/8</span>
                            </div>
                            <div className="grid grid-cols-8 gap-1.5">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-3 rounded-sm transition-all duration-500",
                                            i < riskScore
                                                ? (riskScore > 6 ? "bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-info shadow-[0_0_10px_rgba(59,130,246,0.5)]")
                                                : "bg-brand-border/50"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-brand-text/40" />
                                    <span className="text-xs font-bold text-brand-text/70 uppercase">Margen Real Bruto</span>
                                </div>
                                <span className={cn("text-2xl font-black font-mono", realMargin > 20 ? "text-success" : "text-warning")}>
                                    {realMargin.toFixed(1)}%
                                </span>
                            </div>
                            {isOverCapacity && (
                                <div className="flex items-center gap-3 text-[10px] text-warning bg-warning/5 p-4 rounded-xl border border-warning/20 backdrop-blur-md animate-in slide-in-from-right-4">
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

            {/* ── CARPETA DE LICITACIÓN ── */}
            <div className="border border-brand-border rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowFolder(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-brand-surface/50 hover:bg-brand-surface transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-brand-text">Carpeta de Licitación</p>
                            <p className="text-[10px] text-brand-text/40 uppercase tracking-widest">
                                {folder.professionals.length} médico(s) · {folder.requiredDocs.length} documento(s) requerido(s)
                            </p>
                        </div>
                    </div>
                    <div className={cn('transition-transform duration-200', showFolder ? 'rotate-180' : '')}>
                        <AlertTriangle className="w-4 h-4 text-brand-text/20 rotate-180" />
                    </div>
                </button>

                {showFolder && (
                    <div className="p-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">

                        {/* ── Panel izquierdo/derecho en grid ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* ── Médicos participantes ── */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-info" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-brand-text/60">Médicos participantes</h4>
                                    </div>
                                </div>

                                {/* Selector para agregar médico */}
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50 appearance-none"
                                        defaultValue=""
                                        onChange={async e => {
                                            if (!e.target.value) return;
                                            await folder.addProfessional(e.target.value);
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">Agregar médico...</option>
                                        {allProfs
                                            .filter((p: any) => !folder.professionals.find((fp: any) => fp.professionalId === p.id))
                                            .map((p: any) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.lastName} — {p.role}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Lista de médicos */}
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {folder.professionals.length === 0 ? (
                                        <div className="text-center py-6 text-brand-text/20 text-xs">
                                            Sin médicos asignados. Agrega uno arriba.
                                        </div>
                                    ) : folder.professionals.map(prof => {
                                        const totalDocs   = folder.requiredDocs.length;
                                        const docsOk      = folder.requiredDocs.filter(d => {
                                            const s = folder.getDocStatus(prof.professionalId, d.docType);
                                            return s?.fileUrl && !s.isPending;
                                        }).length;
                                        const pct = totalDocs > 0 ? Math.round((docsOk / totalDocs) * 100) : 0;
                                        const allOk = totalDocs > 0 && docsOk === totalDocs;

                                        return (
                                            <div key={prof.id} className={cn(
                                                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                                                allOk
                                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                                    : 'bg-brand-surface border-brand-border'
                                            )}>
                                                <div className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden',
                                                    allOk
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-brand-surface text-brand-text/40 border border-brand-border'
                                                )}>
                                                    {prof.photoUrl
                                                        ? <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover" />
                                                        : prof.name[0]
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-brand-text truncate">{prof.name}</p>
                                                    <p className="text-[10px] text-brand-text/40 truncate">{prof.role}</p>
                                                    {totalDocs > 0 && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex-1 h-1 bg-brand-border rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn('h-full rounded-full transition-all', allOk ? 'bg-emerald-500' : 'bg-info')}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] font-mono text-brand-text/30">{docsOk}/{totalDocs}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {allOk && <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                                <button
                                                    onClick={() => folder.removeProfessional(prof.id)}
                                                    className="p-1 rounded text-brand-text/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                                                    title="Quitar de la licitación"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Documentos requeridos ── */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-purple-400" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-text/60">Documentos requeridos</h4>
                                </div>

                                {/* Selector para agregar doc */}
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50 appearance-none"
                                        defaultValue=""
                                        onChange={async e => {
                                            if (!e.target.value) return;
                                            await folder.addRequiredDoc(e.target.value);
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">Agregar documento...</option>
                                        {folder.DOC_OPTIONS
                                            .filter(d => !folder.requiredDocs.find(rd => rd.docType === d.value))
                                            .map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Lista de docs requeridos */}
                                <div className="space-y-1.5">
                                    {folder.requiredDocs.length === 0 ? (
                                        <div className="text-center py-6 text-brand-text/20 text-xs">
                                            Sin documentos requeridos. Agrega uno arriba.
                                        </div>
                                    ) : folder.requiredDocs.map(doc => (
                                        <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-lg">
                                            <span className="flex-1 text-xs text-brand-text/70">{doc.label}</span>
                                            <button
                                                onClick={() => folder.removeRequiredDoc(doc.id)}
                                                className="p-1 rounded text-brand-text/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Matriz de cumplimiento ── */}
                        {folder.professionals.length > 0 && folder.requiredDocs.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-brand-text/40 flex items-center gap-2">
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    Matriz de cumplimiento documental
                                </h4>
                                <div className="overflow-x-auto rounded-xl border border-brand-border">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-brand-surface/50 border-b border-brand-border">
                                                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-text/40 w-40">
                                                    Médico
                                                </th>
                                                {folder.requiredDocs.map(doc => (
                                                    <th key={doc.id} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/40 min-w-[100px]">
                                                        {doc.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {folder.professionals.map((prof, i) => (
                                                <tr key={prof.id} className={cn(
                                                    'border-b border-brand-border/50 last:border-0',
                                                    i % 2 === 0 ? 'bg-brand-surface' : 'bg-brand-bg/20'
                                                )}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-bold text-brand-text/80 truncate">{prof.name}</p>
                                                        <p className="text-[9px] text-brand-text/30">{prof.role}</p>
                                                    </td>
                                                    {folder.requiredDocs.map(doc => {
                                                        const status = folder.getDocStatus(prof.professionalId, doc.docType);
                                                        const hasDoc  = status?.fileUrl && !status.isPending;
                                                        const pending = status?.isPending;
                                                        return (
                                                            <td key={doc.id} className="px-3 py-2 text-center">
                                                                {hasDoc ? (
                                                                    <button
                                                                        onClick={() => window.open(status!.fileUrl!, '_blank')}
                                                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                                                        title={`Ver ${status?.fileName}`}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                    </button>
                                                                ) : pending ? (
                                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20" title="Pendiente">
                                                                        <span className="text-[8px] font-black text-amber-400">PND</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20" title="Falta">
                                                                        <X className="w-3.5 h-3.5 text-red-400" />
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[9px] text-brand-text/20 text-right font-mono">
                                    ✅ disponible · PND pendiente · ✗ falta — los documentos se suben desde la ficha del médico
                                </p>
                            </div>
                        )}

                        {/* ── Panel de exportación ── */}
                        {folder.professionals.length > 0 && folder.requiredDocs.length > 0 && (
                            <div className="border border-brand-border rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowExport(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-brand-surface/50 hover:bg-brand-surface transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-black uppercase tracking-widest text-brand-text/60">
                                            Exportar carpeta documental
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 text-[10px] font-mono">
                                            <span className="text-emerald-400">{celdasOk} ✅</span>
                                            {celdasPending > 0 && <span className="text-amber-400">{celdasPending} PND</span>}
                                            {celdasFaltan  > 0 && <span className="text-red-400">{celdasFaltan} ✗</span>}
                                        </div>
                                    </div>
                                </button>

                                {showExport && (
                                    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">

                                        {/* Resumen de completitud */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Disponibles', val: celdasOk,      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                                                { label: 'Pendientes',  val: celdasPending, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                                                { label: 'Faltan',      val: celdasFaltan,  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                                            ].map(s => (
                                                <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.color)}>
                                                    <p className="text-2xl font-black">{s.val}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-0.5">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {celdasFaltan > 0 && (
                                            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-400/80">
                                                    Faltan {celdasFaltan} documento(s). El paquete exportado solo incluirá los documentos disponibles. Los documentos faltantes deben subirse desde la ficha del médico.
                                                </p>
                                            </div>
                                        )}

                                        {exportDocs.length === 0 ? (
                                            <div className="text-center py-6 text-brand-text/20 text-xs">
                                                No hay documentos disponibles para exportar.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {/* PDF Consolidado */}
                                                <button
                                                    onClick={() => exportPDF(exportDocs, tenderName)}
                                                    disabled={exporting}
                                                    className="flex flex-col items-center gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50 group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <FileCheck className="w-5 h-5 text-red-400" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-red-400 uppercase tracking-widest">PDF Consolidado</p>
                                                        <p className="text-[10px] text-brand-text/30 mt-0.5">Todos los docs en un solo PDF</p>
                                                    </div>
                                                </button>

                                                {/* ZIP por médico */}
                                                <button
                                                    onClick={() => exportZipByProfessional(exportDocs, tenderName)}
                                                    disabled={exporting}
                                                    className="flex flex-col items-center gap-2 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl hover:bg-blue-500/10 transition-all disabled:opacity-50 group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Users className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest">ZIP por Médico</p>
                                                        <p className="text-[10px] text-brand-text/30 mt-0.5">Carpeta por cada profesional</p>
                                                    </div>
                                                </button>

                                                {/* ZIP por documento */}
                                                <button
                                                    onClick={() => exportZipByDoc(exportDocs, tenderName)}
                                                    disabled={exporting}
                                                    className="flex flex-col items-center gap-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl hover:bg-purple-500/10 transition-all disabled:opacity-50 group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <FolderOpen className="w-5 h-5 text-purple-400" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-purple-400 uppercase tracking-widest">ZIP por Documento</p>
                                                        <p className="text-[10px] text-brand-text/30 mt-0.5">Carpeta SIS, Título, Cédula...</p>
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* Barra de progreso */}
                                        {exporting && (
                                            <div className="space-y-2 animate-in fade-in duration-200">
                                                <div className="flex justify-between text-[10px] font-mono">
                                                    <span className="text-brand-text/40">Generando paquete...</span>
                                                    <span className="text-info">{progress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-info transition-all duration-300 rounded-full"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
