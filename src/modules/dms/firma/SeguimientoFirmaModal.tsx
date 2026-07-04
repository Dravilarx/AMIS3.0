import React, { useEffect, useState, useCallback } from 'react';
import { X, FileSignature, Loader2 } from 'lucide-react';
import { obtenerSolicitudDeDocumento } from '../../../hooks/useFirma';
import { SolicitudFirmaPanel } from './SolicitudFirmaPanel';
import type { SolicitudRow } from '../../../types/firma';

interface SeguimientoFirmaModalProps {
    documentId: string;
    documentTitle: string;
    onClose: () => void;
    onChanged?: () => void; // tras anular, refresca la lista de documentos del padre
}

// Acceso directo al seguimiento de una solicitud de firma (firmantes, estado,
// plazo, anular) desde el badge "En firma X/Y" / "Firmado" de la tarjeta —
// antes solo se llegaba a SolicitudFirmaPanel entrando al modal de Versiones.
export const SeguimientoFirmaModal: React.FC<SeguimientoFirmaModalProps> = ({ documentId, documentTitle, onClose, onChanged }) => {
    const [solicitud, setSolicitud] = useState<SolicitudRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSolicitud(await obtenerSolicitudDeDocumento(documentId));
        } catch (err: any) {
            console.error('Error cargando el estado de firma:', err);
            setError('No se pudo cargar el estado de firma');
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => { cargar(); }, [cargar]);

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <FileSignature className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Estado de firma</h3>
                            <p className="text-[10px] text-brand-text/40 truncate">{documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>
                    ) : error ? (
                        <p className="text-center text-danger text-xs font-bold py-10">{error}</p>
                    ) : solicitud ? (
                        <SolicitudFirmaPanel
                            solicitud={solicitud}
                            onAnulada={async () => { await cargar(); onChanged?.(); }}
                        />
                    ) : (
                        <p className="text-center text-brand-text/30 text-xs py-10 uppercase font-black tracking-widest">Sin solicitud de firma para este documento</p>
                    )}
                </div>
            </div>
        </div>
    );
};
