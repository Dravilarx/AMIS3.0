import React, { useEffect, useRef, useState } from 'react';
import { X, History, UploadCloud, RotateCcw, ExternalLink, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDocumentVersions } from '../../hooks/useDocumentVersions';
import { getSignedDocumentUrl } from '../../lib/storageUrls';
import type { Document } from '../../types/communication';

interface DocumentVersionsModalProps {
    doc: Document;
    canManage: boolean; // autor del documento o useMyLevel() <= 2
    onClose: () => void;
    onChanged: () => void; // refresca la lista de documentos del padre
    notify: (msg: string, ok: boolean) => void; // reutiliza el toast del padre
}

const fmtFecha = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const DocumentVersionsModal: React.FC<DocumentVersionsModalProps> = ({ doc, canManage, onClose, onChanged, notify }) => {
    const { versions, loading, fetchVersions, uploadNewVersion, restoreVersion } = useDocumentVersions();
    const [uploading, setUploading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchVersions(doc.id); }, [doc.id, fetchVersions]);

    const abrirVersion = async (url: string) => {
        const signed = await getSignedDocumentUrl(url);
        if (signed) window.open(signed, '_blank');
        else notify('No se pudo abrir la versión', false);
    };

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permitir re-seleccionar el mismo archivo luego
        if (!file) return;

        if (doc.signed) {
            const ok = window.confirm(
                'Este documento está firmado. La nueva versión nacerá SIN firma.\n\n¿Confirmas subir la nueva versión?'
            );
            if (!ok) return;
        }

        setUploading(true);
        const res = await uploadNewVersion(doc, file);
        setUploading(false);
        if (res.success) {
            notify('Nueva versión subida', true);
            await fetchVersions(doc.id);
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
            notify(`Versión ${versionNum} restaurada`, true);
            await fetchVersions(doc.id);
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
                        <button
                            type="button"
                            onClick={handlePickFile}
                            disabled={uploading}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand-border rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-text/40 hover:border-brand-primary/40 hover:text-brand-primary transition-all disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            {uploading ? 'Subiendo...' : 'Subir nueva versión'}
                        </button>
                        {doc.signed && (
                            <p className="flex items-center gap-1.5 text-[10px] text-warning/80 font-bold mt-2 px-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Este documento está firmado. Subir una nueva versión la dejará sin firma.
                            </p>
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
            </div>
        </div>
    );
};
