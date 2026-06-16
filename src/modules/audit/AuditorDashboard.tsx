import React, { useState, useMemo, useEffect } from 'react';
import {
    Shield, Info, Search, FileText, Sparkles,
    ChevronRight, X, Upload, Mail, Send, Loader2, CheckCircle2,
    Plus, Trash2, Eye, MailOpen, MailIcon, Paperclip,
    Building2, Stethoscope, CalendarDays, LayoutList, LayoutGrid,
    History, Lock, ArrowRight, FileDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAudit, type AuditCase, type AuditDocument, type AuditTrailEntry } from '../../hooks/useAudit';
import { useProfessionals } from '../../hooks/useProfessionals';
import { InlineAuditUploader } from './InlineAuditUploader';
import { analyzeClinicalReportFromPDF } from './agrawallAI';
import { KanbanBoard } from './KanbanBoard';
import { exportCaseToPDF } from './exportCasePDF';

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending:   { label: 'Nuevo',          color: 'text-info    bg-info/10    border-info/20' },
    reviewed:  { label: 'En Resolución',  color: 'text-warning bg-warning/10 border-warning/20' },
    escalated: { label: 'Escalado',       color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    completed: { label: 'Completado',     color: 'text-success bg-success/10 border-success/20' },
};

const AGRAWALL_CONFIG = {
    1: { label: 'Correcto',              color: 'text-success  bg-success/10  border-success/20' },
    2: { label: 'Discrepancia Menor',    color: 'text-info     bg-info/10     border-info/20' },
    3: { label: 'Discrepancia Moderada', color: 'text-warning  bg-warning/10  border-warning/20' },
    4: { label: 'Discrepancia Grave',    color: 'text-red-400  bg-red-500/10  border-red-500/20' },
};

const DOC_TYPES = [
    { value: 'informe',      label: 'Informe Médico' },
    { value: 'orden_medica', label: 'Orden Médica' },
    { value: 'examen',       label: 'Examen' },
    { value: 'correo',       label: 'Correo Electrónico' },
    { value: 'otro',         label: 'Otro Antecedente' },
];

const NONCONFORMITY_TYPES = [
    { value: 'error_informe',  label: 'Error de informe' },
    { value: 'retraso',        label: 'Retraso' },
    { value: 'trato_paciente', label: 'Trato al paciente' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'tecnico',        label: 'Técnico' },
    { value: 'otro',           label: 'Otro' },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    baja:    { label: 'Baja',    color: 'text-brand-text/60 bg-brand-text/5    border-brand-text/20' },
    media:   { label: 'Media',   color: 'text-brand-primary  bg-brand-primary/10  border-brand-primary/20' },
    alta:    { label: 'Alta',    color: 'text-brand-secondary bg-brand-secondary/10 border-brand-secondary/20' },
    critica: { label: 'Crítica', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

// ─── Badge Agrawall ───────────────────────────────────────────────────────────
const AgrawallBadge: React.FC<{ level?: number; size?: 'sm' | 'lg' }> = ({ level, size = 'sm' }) => {
    if (!level) return <span className="text-[9px] text-brand-text/20 font-mono">—</span>;
    const cfg = AGRAWALL_CONFIG[level as keyof typeof AGRAWALL_CONFIG];
    return (
        <span className={cn(
            'font-black border rounded-full uppercase tracking-wider',
            cfg.color,
            size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[9px]'
        )}>
            N{level} — {cfg.label}
        </span>
    );
};

// ─── Panel de detalle del caso ────────────────────────────────────────────────
const CaseDetailPanel: React.FC<{
    auditCase:    AuditCase;
    onClose:      () => void;
    professionals: { id: string; name: string; lastName: string }[];
}> = ({ auditCase, onClose, professionals }) => {
    const { updateCase, uploadDocument, deleteDocument, addCommunication, fetchTrail } = useAudit();

    const [activeTab,    setActiveTab]    = useState<'info' | 'docs' | 'comms' | 'agrawall' | 'bitacora'>('info');
    const [saving,       setSaving]       = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [analyzingPDF, setAnalyzingPDF] = useState(false);

    const [trail,        setTrail]        = useState<AuditTrailEntry[]>([]);
    const [loadingTrail, setLoadingTrail] = useState(false);
    const [exporting,    setExporting]    = useState(false);

    const [editData, setEditData] = useState({
        status:             auditCase.status,
        doctorId:           auditCase.doctorId           || '',
        institution:        auditCase.institution        || '',
        requestType:        auditCase.requestType        || 'Radiología',
        resolutionDate:     auditCase.resolutionDate      ? auditCase.resolutionDate.split('T')[0] : '',
        observations:       auditCase.observations       || '',
        measuresTaken:      auditCase.measuresTaken      || '',
        nonconformityType:  auditCase.nonconformityType  || '',
        severity:           auditCase.severity           || '',
        providerName:       auditCase.providerName       || '',
        problemDescription: auditCase.problemDescription || '',
        proposedSolution:   auditCase.proposedSolution   || '',
        correctiveAction:   auditCase.correctiveAction   || '',
    });

    const [newComm, setNewComm] = useState({
        direction: 'sent' as 'sent' | 'received',
        subject:   '',
        body:      '',
        toEmail:   '',
        fromEmail: '',
    });

    const [selectedDocType, setSelectedDocType] = useState<AuditDocument['docType']>('informe');

    const loadTrail = async () => {
        setLoadingTrail(true);
        const data = await fetchTrail(auditCase.id);
        setTrail(data);
        setLoadingTrail(false);
    };

    useEffect(() => {
        if (activeTab === 'bitacora') loadTrail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            await exportCaseToPDF(auditCase, fetchTrail);
        } catch (err) {
            console.error('[Audit] Error exportando expediente PDF:', err);
        } finally {
            setExporting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const doctor = professionals.find(p => p.id === editData.doctorId);
        await updateCase(auditCase.id, {
            ...editData,
            doctorName:     doctor ? `${doctor.name} ${doctor.lastName}` : auditCase.doctorName,
            resolutionDate: editData.resolutionDate || undefined,
            nonconformityType:  editData.nonconformityType  || undefined,
            severity:           editData.severity           || undefined,
        });
        setSaving(false);
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDoc(true);
        await uploadDocument(auditCase.id, file, selectedDocType);
        setUploadingDoc(false);
    };

    const handleAnalyzePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAnalyzingPDF(true);
        try {
            const result = await analyzeClinicalReportFromPDF(file);
            await updateCase(auditCase.id, {
                agrawallLevel:    result.score,
                agrawallReasoning: result.reasoning,
                agrawallFindings:  result.findings,
            });
            await uploadDocument(auditCase.id, file, 'informe', 'Analizado por Gemini IA');
        } catch (err) {
            console.error('Error análisis IA:', err);
        } finally {
            setAnalyzingPDF(false);
        }
    };

    const handleAddComm = async () => {
        if (!newComm.subject.trim() || !newComm.body.trim()) return;
        await addCommunication(auditCase.id, {
            ...newComm,
            hasAttachment: false,
        });
        setNewComm({ direction: 'sent', subject: '', body: '', toEmail: '', fromEmail: '' });
    };

    const TABS = [
        { id: 'info',     label: 'Información',  icon: <Info className="w-3.5 h-3.5" /> },
        { id: 'docs',     label: 'Documentos',   icon: <Paperclip className="w-3.5 h-3.5" />, count: auditCase.documents.length },
        { id: 'comms',    label: 'Comunicaciones', icon: <Mail className="w-3.5 h-3.5" />, count: auditCase.communications.length },
        { id: 'agrawall', label: 'Agrawall IA',  icon: <Sparkles className="w-3.5 h-3.5" /> },
        { id: 'bitacora', label: 'Bitácora',     icon: <History className="w-3.5 h-3.5" /> },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-brand-border">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black text-brand-text">{auditCase.patientName}</h2>
                            <AgrawallBadge level={auditCase.agrawallLevel} size="sm" />
                            <span className={cn(
                                'text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider',
                                STATUS_CONFIG[auditCase.status].color
                            )}>
                                {STATUS_CONFIG[auditCase.status].label}
                            </span>
                        </div>
                        <p className="text-[10px] text-brand-text/40 mt-0.5">
                            {auditCase.patientRut && <span className="font-mono">{auditCase.patientRut} · </span>}
                            {auditCase.institution} · {auditCase.requestType}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportPDF} disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary text-[10px] font-black uppercase tracking-wider hover:bg-brand-secondary/20 transition-all disabled:opacity-50">
                            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                            {exporting ? 'Generando...' : 'Exportar Expediente PDF'}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-brand-border overflow-x-auto flex-shrink-0">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'bg-brand-surface border-brand-primary text-brand-text'
                                    : 'border-transparent text-brand-text/40 hover:text-brand-text/70'
                            )}>
                            {tab.icon} {tab.label}
                            {'count' in tab && tab.count > 0 && (
                                <span className="w-4 h-4 bg-brand-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* ── Tab Info ── */}
                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Estado</label>
                                    <select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value as any }))}
                                        className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none">
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-1">
                                        <Stethoscope className="w-3 h-3" /> Médico Responsable
                                    </label>
                                    <select value={editData.doctorId} onChange={e => setEditData(p => ({ ...p, doctorId: e.target.value }))}
                                        className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none">
                                        <option value="">Sin asignar</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Institución
                                    </label>
                                    <input className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none"
                                        value={editData.institution}
                                        onChange={e => setEditData(p => ({ ...p, institution: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Tipo Solicitud</label>
                                    <select value={editData.requestType} onChange={e => setEditData(p => ({ ...p, requestType: e.target.value }))}
                                        className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none">
                                        {['Radiología', 'Cirugía', 'Consulta General', 'Reclamo Administrativo', 'Otro'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" /> Fecha Resolución
                                    </label>
                                    <input type="date" className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none"
                                        value={editData.resolutionDate}
                                        onChange={e => setEditData(p => ({ ...p, resolutionDate: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Tipo de No-Conformidad</label>
                                    <select value={editData.nonconformityType} onChange={e => setEditData(p => ({ ...p, nonconformityType: e.target.value }))}
                                        className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none">
                                        <option value="">Sin clasificar</option>
                                        {NONCONFORMITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Gravedad</label>
                                    <div className="flex items-center gap-2">
                                        <select value={editData.severity} onChange={e => setEditData(p => ({ ...p, severity: e.target.value }))}
                                            className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none">
                                            <option value="">Sin definir</option>
                                            {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        {editData.severity && SEVERITY_CONFIG[editData.severity] && (
                                            <span className={cn(
                                                'text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wider whitespace-nowrap',
                                                SEVERITY_CONFIG[editData.severity].color
                                            )}>
                                                {SEVERITY_CONFIG[editData.severity].label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Proveedor / Institución Responsable
                                    </label>
                                    <input className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none"
                                        placeholder="Entidad responsable de la no-conformidad"
                                        value={editData.providerName}
                                        onChange={e => setEditData(p => ({ ...p, providerName: e.target.value }))} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Descripción del Problema</label>
                                <textarea rows={3} className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none resize-none"
                                    placeholder="¿Qué ocurrió? Detalle de la no-conformidad..."
                                    value={editData.problemDescription}
                                    onChange={e => setEditData(p => ({ ...p, problemDescription: e.target.value }))} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Solución Propuesta</label>
                                <textarea rows={3} className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none resize-none"
                                    placeholder="Acción propuesta para resolver la no-conformidad..."
                                    value={editData.proposedSolution}
                                    onChange={e => setEditData(p => ({ ...p, proposedSolution: e.target.value }))} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-brand-secondary tracking-widest flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" /> Acción Correctiva (queda registrada para auditoría)
                                </label>
                                <textarea rows={3} className="bg-brand-surface border border-brand-secondary/30 rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none resize-none focus:border-brand-secondary/60"
                                    placeholder="Acción correctiva efectivamente implementada y verificable..."
                                    value={editData.correctiveAction}
                                    onChange={e => setEditData(p => ({ ...p, correctiveAction: e.target.value }))} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Observaciones</label>
                                <textarea rows={3} className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none resize-none"
                                    placeholder="Notas del caso, contexto clínico..."
                                    value={editData.observations}
                                    onChange={e => setEditData(p => ({ ...p, observations: e.target.value }))} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Medidas Tomadas</label>
                                <textarea rows={3} className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none resize-none"
                                    placeholder="Acciones realizadas para resolver el caso..."
                                    value={editData.measuresTaken}
                                    onChange={e => setEditData(p => ({ ...p, measuresTaken: e.target.value }))} />
                            </div>

                            <button onClick={handleSave} disabled={saving}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white font-black text-sm hover:brightness-110 transition-all disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    )}

                    {/* ── Tab Documentos ── */}
                    {activeTab === 'docs' && (
                        <div className="space-y-4">
                            {/* Upload */}
                            <div className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl">
                                <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value as any)}
                                    className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none appearance-none">
                                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                                <label className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase cursor-pointer transition-all',
                                    uploadingDoc ? 'bg-brand-surface text-brand-text/30' : 'bg-info/10 border border-info/20 text-info hover:bg-info/20'
                                )}>
                                    {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    {uploadingDoc ? 'Subiendo...' : 'Subir documento'}
                                    <input type="file" className="hidden" disabled={uploadingDoc}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.eml,.msg"
                                        onChange={handleDocUpload} />
                                </label>
                            </div>

                            {/* Lista documentos */}
                            {auditCase.documents.length === 0 ? (
                                <div className="text-center py-10 text-brand-text/20 text-xs">Sin documentos adjuntos.</div>
                            ) : auditCase.documents.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl">
                                    <FileText className="w-5 h-5 text-brand-text/30 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-brand-text truncate">{doc.fileName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-black text-brand-text/30 uppercase">
                                                {DOC_TYPES.find(d => d.value === doc.docType)?.label}
                                            </span>
                                            <span className="text-[9px] text-brand-text/20 font-mono">
                                                {new Date(doc.uploadedAt).toLocaleDateString('es-CL')}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => window.open(doc.fileUrl, '_blank')}
                                        className="p-1.5 rounded-lg text-brand-text/20 hover:text-info hover:bg-info/10 transition-colors">
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteDocument(doc.id)}
                                        className="p-1.5 rounded-lg text-brand-text/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tab Comunicaciones ── */}
                    {activeTab === 'comms' && (
                        <div className="space-y-4">
                            {/* Formulario nuevo correo */}
                            <div className="space-y-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Registrar Comunicación</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={newComm.direction} onChange={e => setNewComm(p => ({ ...p, direction: e.target.value as any }))}
                                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none">
                                        <option value="sent">Enviado</option>
                                        <option value="received">Recibido</option>
                                    </select>
                                    <input placeholder={newComm.direction === 'sent' ? 'Para (email)' : 'De (email)'}
                                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none"
                                        value={newComm.direction === 'sent' ? newComm.toEmail : newComm.fromEmail}
                                        onChange={e => setNewComm(p => newComm.direction === 'sent'
                                            ? { ...p, toEmail: e.target.value }
                                            : { ...p, fromEmail: e.target.value }
                                        )} />
                                </div>
                                <input placeholder="Asunto"
                                    className="bg-brand-bg border border-brand-border rounded-lg w-full px-3 py-2 text-xs text-brand-text outline-none"
                                    value={newComm.subject}
                                    onChange={e => setNewComm(p => ({ ...p, subject: e.target.value }))} />
                                <textarea rows={3} placeholder="Contenido del correo..."
                                    className="bg-brand-bg border border-brand-border rounded-lg w-full px-3 py-2 text-xs text-brand-text outline-none resize-none"
                                    value={newComm.body}
                                    onChange={e => setNewComm(p => ({ ...p, body: e.target.value }))} />
                                <button onClick={handleAddComm} disabled={!newComm.subject.trim() || !newComm.body.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-info/10 border border-info/20 text-info rounded-lg text-xs font-black uppercase hover:bg-info/20 transition-all disabled:opacity-40">
                                    <Send className="w-3 h-3" /> Registrar
                                </button>
                            </div>

                            {/* Historial */}
                            {auditCase.communications.length === 0 ? (
                                <div className="text-center py-8 text-brand-text/20 text-xs">Sin comunicaciones registradas.</div>
                            ) : [...auditCase.communications]
                                .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                                .map(comm => (
                                    <div key={comm.id} className={cn(
                                        'p-4 rounded-xl border space-y-2',
                                        comm.direction === 'sent'
                                            ? 'bg-info/5 border-info/20'
                                            : 'bg-brand-surface border-brand-border'
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {comm.direction === 'sent'
                                                    ? <Send className="w-3.5 h-3.5 text-info" />
                                                    : <MailOpen className="w-3.5 h-3.5 text-brand-text/40" />
                                                }
                                                <span className="text-xs font-bold text-brand-text">{comm.subject}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-brand-text/30">
                                                {new Date(comm.sentAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-brand-text/40">
                                            {comm.direction === 'sent' ? `Para: ${comm.toEmail}` : `De: ${comm.fromEmail}`}
                                        </p>
                                        <p className="text-xs text-brand-text/70 leading-relaxed whitespace-pre-line">{comm.body}</p>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* ── Tab Agrawall ── */}
                    {activeTab === 'agrawall' && (
                        <div className="space-y-5">
                            {auditCase.agrawallLevel ? (
                                <div className="space-y-4">
                                    <div className={cn(
                                        'p-5 rounded-2xl border-2 space-y-3',
                                        AGRAWALL_CONFIG[auditCase.agrawallLevel as keyof typeof AGRAWALL_CONFIG].color
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-current/10 flex items-center justify-center">
                                                <span className="text-3xl font-black">{auditCase.agrawallLevel}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-wider">
                                                    Nivel {auditCase.agrawallLevel} — {AGRAWALL_CONFIG[auditCase.agrawallLevel as keyof typeof AGRAWALL_CONFIG].label}
                                                </p>
                                                <p className="text-[10px] opacity-60 mt-0.5">Clasificado por Gemini IA</p>
                                            </div>
                                        </div>
                                        {auditCase.agrawallReasoning && (
                                            <p className="text-sm leading-relaxed opacity-80">{auditCase.agrawallReasoning}</p>
                                        )}
                                    </div>

                                    {auditCase.agrawallFindings.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Hallazgos identificados</p>
                                            {auditCase.agrawallFindings.map((f, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2.5 bg-brand-surface border border-brand-border rounded-lg">
                                                    <ChevronRight className="w-3.5 h-3.5 text-brand-text/30 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-brand-text/70">{f}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed border-brand-border rounded-2xl">
                                    <Sparkles className="w-8 h-8 text-brand-text/10 mx-auto mb-3" />
                                    <p className="text-sm text-brand-text/30 mb-1">Sin análisis Agrawall</p>
                                    <p className="text-xs text-brand-text/20">Sube el informe para análisis IA</p>
                                </div>
                            )}

                            {/* Re-analizar */}
                            <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    {auditCase.agrawallLevel ? 'Re-analizar con Gemini' : 'Analizar con Gemini IA'}
                                </p>
                                <label className={cn(
                                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all w-fit',
                                    analyzingPDF
                                        ? 'bg-brand-surface text-brand-text/30 cursor-not-allowed'
                                        : 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                                )}>
                                    {analyzingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    {analyzingPDF ? 'Analizando...' : 'Subir PDF del informe'}
                                    <input type="file" accept=".pdf" className="hidden" disabled={analyzingPDF} onChange={handleAnalyzePDF} />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── Tab Bitácora ── */}
                    {activeTab === 'bitacora' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-brand-surface border border-brand-border rounded-xl">
                                <Lock className="w-3.5 h-3.5 text-brand-secondary flex-shrink-0" />
                                <p className="text-[10px] text-brand-text/50 leading-relaxed">
                                    Registro permanente e inmutable de todos los movimientos del caso. Cada cambio queda trazado para auditoría.
                                </p>
                            </div>

                            {loadingTrail ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                                </div>
                            ) : trail.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-brand-border rounded-2xl">
                                    <History className="w-8 h-8 text-brand-text/10 mx-auto mb-3" />
                                    <p className="text-sm text-brand-text/30">Sin movimientos registrados aún.</p>
                                    <p className="text-xs text-brand-text/20 mt-1">Los cambios del caso aparecerán aquí automáticamente.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6">
                                    {/* Línea vertical del timeline */}
                                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-brand-border" />
                                    <div className="space-y-5">
                                        {trail.map(entry => (
                                            <div key={entry.id} className="relative">
                                                {/* Punto del timeline */}
                                                <div className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full bg-brand-primary border-2 border-brand-bg" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-brand-text leading-snug">{entry.action}</p>
                                                    {(entry.oldValue || entry.newValue) && (
                                                        <div className="flex items-center gap-2 text-[10px] font-mono">
                                                            <span className="px-2 py-0.5 rounded-md bg-brand-surface border border-brand-border text-brand-text/40 line-through">
                                                                {entry.oldValue || '—'}
                                                            </span>
                                                            <ArrowRight className="w-3 h-3 text-brand-text/30" />
                                                            <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                                                                {entry.newValue || '—'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-[10px] text-brand-text/30">
                                                        <span className="font-bold text-brand-text/50">{entry.userName || 'Sistema'}</span>
                                                        <span>·</span>
                                                        <span className="font-mono">
                                                            {new Date(entry.createdAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Dashboard principal ──────────────────────────────────────────────────────
export const AuditorDashboard: React.FC = () => {
    const { cases, loading, moveKanban } = useAudit();
    const { professionals }  = useProfessionals();

    const [searchTerm,    setSearchTerm]    = useState('');
    const [filterStatus,  setFilterStatus]  = useState('');
    const [filterLevel,   setFilterLevel]   = useState('');
    const [filterDoctor,  setFilterDoctor]  = useState('');
    const [showUploader,  setShowUploader]  = useState(false);
    const [selectedCase,  setSelectedCase]  = useState<AuditCase | null>(null);
    const [viewMode,      setViewMode]      = useState<'tabla' | 'kanban'>('tabla');

    const filtered = useMemo(() => cases.filter(c => {
        const s = searchTerm.toLowerCase();
        const matchSearch  = c.patientName.toLowerCase().includes(s) ||
                             (c.patientRut || '').includes(s) ||
                             (c.institution || '').toLowerCase().includes(s) ||
                             (c.doctorName  || '').toLowerCase().includes(s);
        const matchStatus  = !filterStatus || c.status           === filterStatus;
        const matchLevel   = !filterLevel  || String(c.agrawallLevel) === filterLevel;
        const matchDoctor  = !filterDoctor || c.doctorId          === filterDoctor;
        return matchSearch && matchStatus && matchLevel && matchDoctor;
    }), [cases, searchTerm, filterStatus, filterLevel, filterDoctor]);

    const kpis = {
        total:    cases.length,
        pending:  cases.filter(c => c.status === 'pending').length,
        inProgress: cases.filter(c => c.status === 'reviewed').length,
        completed: cases.filter(c => c.status === 'completed').length,
        nivel4:   cases.filter(c => c.agrawallLevel === 4).length,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-brand-text">Gestión de Calidad</h2>
                    <p className="text-brand-text/40 text-sm">Casos, no-conformidades y discrepancias — Escala Agrawall</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Toggle Tabla / Kanban */}
                    <div className="flex border border-brand-border rounded-xl overflow-hidden bg-brand-surface">
                        <button onClick={() => setViewMode('tabla')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all',
                                viewMode === 'tabla'
                                    ? 'bg-brand-primary/10 border-r border-brand-primary/30 text-brand-primary'
                                    : 'text-brand-text/40 hover:text-brand-text/70'
                            )}>
                            <LayoutList className="w-4 h-4" /> Tabla
                        </button>
                        <button onClick={() => setViewMode('kanban')}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all',
                                viewMode === 'kanban'
                                    ? 'bg-brand-primary/10 border-l border-brand-primary/30 text-brand-primary'
                                    : 'text-brand-text/40 hover:text-brand-text/70'
                            )}>
                            <LayoutGrid className="w-4 h-4" /> Kanban
                        </button>
                    </div>
                    <button onClick={() => setShowUploader(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nuevo Caso
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total',        val: kpis.total,      color: 'text-brand-text bg-brand-surface border-brand-border' },
                    { label: 'Nuevos',       val: kpis.pending,    color: 'text-info    bg-info/10    border-info/20' },
                    { label: 'En Resolución',val: kpis.inProgress, color: 'text-warning bg-warning/10 border-warning/20' },
                    { label: 'Completados',  val: kpis.completed,  color: 'text-success bg-success/10 border-success/20' },
                    { label: 'Nivel 4 ⚠️',  val: kpis.nivel4,     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                ].map(k => (
                    <div key={k.label} className={cn('flex items-center gap-4 px-4 py-3 rounded-2xl border', k.color)}>
                        <span className={cn('text-2xl font-black', k.color.split(' ')[0])}>{k.val}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 leading-tight">{k.label}</span>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text/20" />
                    <input placeholder="Buscar paciente, RUT, institución, médico..."
                        className="bg-brand-bg border border-brand-border rounded-xl w-full pl-9 pr-4 py-2 text-xs text-brand-text outline-none focus:border-info/50"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none appearance-none">
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none appearance-none">
                    <option value="">Todos los niveles</option>
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>Nivel {n}</option>)}
                </select>
                <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none appearance-none">
                    <option value="">Todos los médicos</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name} {p.lastName}</option>)}
                </select>
                {(filterStatus || filterLevel || filterDoctor || searchTerm) && (
                    <button onClick={() => { setFilterStatus(''); setFilterLevel(''); setFilterDoctor(''); setSearchTerm(''); }}
                        className="px-3 py-2 text-[10px] font-black uppercase text-danger hover:bg-danger/10 rounded-xl transition-colors">
                        Limpiar
                    </button>
                )}
                <span className="ml-auto text-[10px] font-mono text-brand-text/30">{filtered.length} de {cases.length}</span>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                    <Shield className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">Sin casos. Crea el primero con "Nuevo Caso".</p>
                </div>
            ) : viewMode === 'kanban' ? (
                <KanbanBoard
                    cases={filtered}
                    onSelect={setSelectedCase}
                    moveKanban={moveKanban}
                    renderBadge={(level) => <AgrawallBadge level={level} />}
                />
            ) : (
                <div className="rounded-2xl border border-brand-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-brand-surface/50 border-b border-brand-border">
                                {['Paciente', 'Institución', 'Agrawall', 'Médico', 'Estado', 'Fecha Solicitud', 'Fecha Resolución', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/50">
                            {filtered.map(c => (
                                <tr key={c.id} onClick={() => setSelectedCase(c)}
                                    className="hover:bg-brand-surface/50 cursor-pointer transition-colors group">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition-colors">{c.patientName}</p>
                                        {c.patientRut && <p className="text-[10px] font-mono text-brand-text/30">{c.patientRut}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-brand-text/60">{c.institution || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <AgrawallBadge level={c.agrawallLevel} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-brand-text/60">{c.doctorName || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider',
                                            STATUS_CONFIG[c.status].color
                                        )}>
                                            {STATUS_CONFIG[c.status].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-mono text-brand-text/40">
                                            {new Date(c.requestDate).toLocaleDateString('es-CL')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-mono text-brand-text/40">
                                            {c.resolutionDate ? new Date(c.resolutionDate).toLocaleDateString('es-CL') : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {c.documents.length > 0 && (
                                                <span className="text-[9px] text-brand-text/30 flex items-center gap-0.5">
                                                    <Paperclip className="w-2.5 h-2.5" /> {c.documents.length}
                                                </span>
                                            )}
                                            {c.communications.length > 0 && (
                                                <span className="text-[9px] text-brand-text/30 flex items-center gap-0.5 ml-1">
                                                    <MailIcon className="w-2.5 h-2.5" /> {c.communications.length}
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-brand-text/30 ml-1" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal nuevo caso */}
            {showUploader && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl">
                        <InlineAuditUploader onClose={() => setShowUploader(false)} />
                    </div>
                </div>
            )}

            {/* Panel de detalle */}
            {selectedCase && (
                <CaseDetailPanel
                    auditCase={selectedCase}
                    onClose={() => setSelectedCase(null)}
                    professionals={professionals.map(p => ({ id: p.id, name: p.name, lastName: p.lastName || '' }))}
                />
            )}
        </div>
    );
};
