import React, { useEffect, useRef, useState } from 'react';
import { X, History, UploadCloud, RotateCcw, ExternalLink, ShieldCheck, Loader2, AlertTriangle, FileText, CalendarClock, Eye, Download, PenTool, Archive, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDocumentVersions } from '../../hooks/useDocumentVersions';
import { useDocumentAccessLog } from '../../hooks/useDocumentAccessLog';
import { getSignedDocumentUrl } from '../../lib/storageUrls';
import { logDocumentAccess } from '../../hooks/useDocuments';
import { useMyLevel } from '../../lib/accessLevels';
import { timeAgo } from '../../lib/timeAgo';
import { obtenerSolicitudDeDocumento } from '../../hooks/useFirma';
import { SolicitudFirmaPanel } from './firma/SolicitudFirmaPanel';
import type { Document } from '../../types/communication';
import type { SolicitudRow } from '../../types/firma';

interface DocumentVersionsModalProps {
    doc: Document;
    canManage: boolean; // autor del documento o useMyLevel() <= 2
    onClose: () => void;
    onChanged: () => void; // refresca la lista de documentos del padre
    notify: (msg: string, ok: boolean) => void; // reutiliza el toast del padre
}

const fmtFecha = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// documents.expiry_date es 'YYYY-MM-DD' (date); formatea sin desfase de zona horaria.
const fmtFechaSolo = (iso?: string | null) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
};

type ExpiryMode = 'keep' | 'new' | 'clear';

const ACCESS_ACTION_META: Record<string, { label: string; icon: React.ElementType }> = {
    ver:            { label: 'Vio el documento',        icon: Eye },
    descargar:      { label: 'Abrió/descargó el archivo', icon: Download },
    firmar:         { label: 'Firmó el documento',       icon: PenTool },
    nueva_version:  { label: 'Subió una nueva versión',  icon: UploadCloud },
    restaurar:      { label: 'Restauró una versión',     icon: RotateCcw },
    archivar:       { label: 'Archivó el documento',     icon: Archive },
    eliminar:       { label: 'Eliminó el documento',     icon: Trash2 },
};

export const DocumentVersionsModal: React.FC<DocumentVersionsModalProps> = ({ doc, canManage, onClose, onChanged, notify }) => {
    const { versions, loading, fetchVersions, uploadNewVersion, restoreVersion } = useDocumentVersions();
    const { level } = useMyLevel();
    const { entries: accessEntries, loading: accessLoading, unavailable: accessUnavailable, fetchLog } = useDocumentAccessLog();
    const [uploading, setUploading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Paso de confirmación (firma + vencimiento) tras elegir el archivo, antes de subir.
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [expiryMode, setExpiryMode] = useState<ExpiryMode>('keep');
    const [expiryInput, setExpiryInput] = useState(''); // usado en modo 'new', o para asignar si el doc no tenía vencimiento

    // Solicitud de firma asociada (si existe), para la sección de seguimiento.
    const [solicitud, setSolicitud] = useState<SolicitudRow | null>(null);
    const cargarSolicitud = async () => setSolicitud(await obtenerSolicitudDeDocumento(doc.id));

    useEffect(() => { fetchVersions(doc.id); }, [doc.id, fetchVersions]);
    useEffect(() => { if (level <= 2) fetchLog(doc.id); }, [doc.id, level, fetchLog]);
    useEffect(() => { cargarSolicitud(); }, [doc.id]);

    const abrirVersion = async (url: string) => {
        const signed = await getSignedDocumentUrl(url);
        if (signed) {
            window.open(signed, '_blank');
            logDocumentAccess(doc.id, 'descargar');
        } else {
            notify('No se pudo abrir la versión', false);
        }
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permitir re-seleccionar el mismo archivo luego
        if (!file) return;
        setPendingFile(file);
        setExpiryMode('keep');
        setExpiryInput('');
    };

    const cancelPending = () => {
        setPendingFile(null);
        setExpiryMode('keep');
        setExpiryInput('');
    };

    const handleConfirmUpload = async () => {
        if (!pendingFile) return;

        // Resuelve qué mandar a expiry_date: undefined = no tocar la columna.
        let expiryDateToSend: string | null | undefined;
        if (doc.expiryDate) {
            if (expiryMode === 'keep') expiryDateToSend = undefined;
            else if (expiryMode === 'clear') expiryDateToSend = null;
            else expiryDateToSend = expiryInput || null; // 'new'
        } else {
            expiryDateToSend = expiryInput || undefined; // asignación opcional
        }

        setUploading(true);
        const res = await uploadNewVersion(doc, pendingFile, expiryDateToSend);
        setUploading(false);
        if (res.success) {
            logDocumentAccess(doc.id, 'nueva_version');
            notify('Nueva versión subida', true);
            cancelPending();
            await fetchVersions(doc.id);
            if (level <= 2) fetchLog(doc.id);
            onChanged();
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo subir la nueva versión'), false);
        }
    };

    const handleRestore = async (versionId: string, versionNum: number, versionUrl: string) => {
        const ok = window.confirm(`¿Restaurar la versión ${versionNum}? La versión actual quedará archivada en el historial.`);
        if (!ok) return;
        setRestoringId(versionId);
        const res = await restoreVersion(doc.id, versionUrl);
        setRestoringId(null);
        if (res.success) {
            logDocumentAccess(doc.id, 'restaurar');
            notify(`Versión ${versionNum} restaurada`, true);
            await fetchVersions(doc.id);
            if (level <= 2) fetchLog(doc.id);
            onChanged();
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo restaurar'), false);
        }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[85vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <History className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight truncate">Versiones</h3>
                            <p className="text-[10px] text-brand-text/40 truncate">{doc.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subir nueva versión */}
                {canManage && (
                    <div className="px-6 pt-4">
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

                        {!pendingFile ? (
                            <button
                                type="button"
                                onClick={handlePickFile}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand-border rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-text/40 hover:border-brand-primary/40 hover:text-brand-primary transition-all"
                            >
                                <UploadCloud className="w-4 h-4" /> Subir nueva versión
                            </button>
                        ) : (
                            /* Paso único de confirmación: firma + vencimiento juntos */
                            <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2.5 px-1">
                                    <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                                    <span className="text-xs font-bold text-brand-text truncate">{pendingFile.name}</span>
                                </div>

                                {doc.signed && (
                                    <p className="flex items-start gap-1.5 text-[10px] text-warning/90 font-bold px-1 leading-relaxed">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Este documento está firmado. La nueva versión nacerá SIN firma.
                                    </p>
                                )}

                                <div className="space-y-2">
                                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 px-1">
                                        <CalendarClock className="w-3.5 h-3.5" /> Vencimiento
                                    </p>

                                    {doc.expiryDate ? (
                                        <div className="space-y-2 px-1">
                                            <p className="text-[11px] text-brand-text/60 font-bold">
                                                Este documento vence el <span className="text-brand-text">{fmtFechaSolo(doc.expiryDate)}</span>
                                            </p>
                                            <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                                                <input type="radio" name="expiryMode" checked={expiryMode === 'keep'} onChange={() => setExpiryMode('keep')} />
                                                Mantener esta fecha
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                                                <input type="radio" name="expiryMode" checked={expiryMode === 'new'} onChange={() => setExpiryMode('new')} />
                                                Nueva fecha
                                            </label>
                                            {expiryMode === 'new' && (
                                                <input
                                                    type="date"
                                                    value={expiryInput}
                                                    onChange={(e) => setExpiryInput(e.target.value)}
                                                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/40 ml-6"
                                                />
                                            )}
                                            <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                                                <input type="radio" name="expiryMode" checked={expiryMode === 'clear'} onChange={() => setExpiryMode('clear')} />
                                                Quitar vencimiento
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="px-1 space-y-1.5">
                                            <label className="text-[10px] text-brand-text/40 font-bold">Asignar fecha de vencimiento (opcional)</label>
                                            <input
                                                type="date"
                                                value={expiryInput}
                                                onChange={(e) => setExpiryInput(e.target.value)}
                                                className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/40"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={cancelPending}
                                        disabled={uploading}
                                        className="flex-1 py-2.5 border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/50 hover:bg-brand-surface transition-all disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmUpload}
                                        disabled={uploading || (expiryMode === 'new' && !expiryInput)}
                                        className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                        {uploading ? 'Subiendo...' : 'Confirmar subida'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Documento actual */}
                <div className="px-6 pt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2">Versión actual</p>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-bg border border-brand-border rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-brand-text truncate">{doc.title}</span>
                            {doc.signed && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 border border-success/20 text-success rounded-full text-[8px] font-black uppercase shrink-0">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Firmada
                                </span>
                            )}
                            {doc.expiryDate && (
                                <span className="text-[9px] text-brand-text/40 font-bold shrink-0">Vence {fmtFechaSolo(doc.expiryDate)}</span>
                            )}
                        </div>
                        <button onClick={() => abrirVersion(doc.url)} className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors shrink-0">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Historial */}
                <div className="px-6 py-4 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2">Historial</p>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-brand-primary animate-spin" /></div>
                    ) : versions.length === 0 ? (
                        <p className="text-center text-brand-text/30 text-xs py-10 uppercase font-black tracking-widest">Sin versiones anteriores</p>
                    ) : (
                        <div className="space-y-2">
                            {versions.map(v => (
                                <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full shrink-0">v{v.version}</span>
                                            <span className="text-sm font-bold text-brand-text truncate">{v.title || doc.title}</span>
                                            {v.signed && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 border border-success/20 text-success rounded-full text-[8px] font-black uppercase shrink-0">
                                                    <ShieldCheck className="w-2.5 h-2.5" /> Firmada
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-brand-text/40 mt-1">
                                            Reemplazada el {fmtFecha(v.replacedAt)}{v.replacedByName ? ` por ${v.replacedByName}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => abrirVersion(v.url)} title="Ver esta versión"
                                            className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                        {canManage && (
                                            <button onClick={() => handleRestore(v.id, v.version, v.url)} title="Restaurar esta versión"
                                                disabled={restoringId === v.id}
                                                className={cn(
                                                    'p-1.5 rounded-lg text-brand-text/30 hover:text-warning hover:bg-warning/10 transition-colors',
                                                    restoringId === v.id && 'opacity-50 cursor-not-allowed'
                                                )}>
                                                {restoringId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Firma — visible solo si existe una solicitud asociada al documento. */}
                {solicitud && (
                    <div className="px-6 py-4 border-t border-brand-border">
                        <SolicitudFirmaPanel solicitud={solicitud} onAnulada={cargarSolicitud} />
                    </div>
                )}

                {/* Accesos — visible solo si useMyLevel <= 2. Si la consulta falla
                    (RLS u otro motivo), se oculta la sección sin mostrar error. */}
                {level <= 2 && !accessUnavailable && (
                    <div className="px-6 py-4 border-t border-brand-border max-h-56 overflow-y-auto custom-scrollbar">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> Accesos
                        </p>
                        {accessLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-brand-primary animate-spin" /></div>
                        ) : accessEntries.length === 0 ? (
                            <p className="text-center text-brand-text/30 text-[11px] py-6 uppercase font-black tracking-widest">Sin accesos registrados</p>
                        ) : (
                            <div className="space-y-1.5">
                                {accessEntries.map(entry => {
                                    const meta = ACCESS_ACTION_META[entry.accion] || { label: entry.accion, icon: Eye };
                                    const Icon = meta.icon;
                                    return (
                                        <div key={entry.id} className="flex items-center gap-2.5 px-3 py-2 bg-brand-bg/50 rounded-lg">
                                            <Icon className="w-3.5 h-3.5 text-brand-text/30 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[11px] font-bold text-brand-text truncate">{entry.userName}</span>
                                                <span className="text-[11px] text-brand-text/50"> · {meta.label}</span>
                                            </div>
                                            <span className="text-[9px] text-brand-text/30 font-bold shrink-0">{timeAgo(entry.createdAt)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
