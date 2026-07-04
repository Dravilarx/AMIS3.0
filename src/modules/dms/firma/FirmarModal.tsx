import React, { useState, useEffect } from 'react';
import { X, PenTool, Loader2, CheckCircle2 } from 'lucide-react';
import { getSignedDocumentUrl } from '../../../lib/storageUrls';
import { useFirma } from '../../../hooks/useFirma';
import { useRubrica } from '../../../hooks/useRubrica';
import { usePdfDocument, PdfPageCanvas } from './PdfPageCanvas';
import { RubricaPad } from './RubricaPad';
import type { FirmanteRow, SolicitudRow } from '../../../types/firma';

interface FirmarModalProps {
    solicitud: SolicitudRow;
    miFirmante: FirmanteRow;
    documentUrl: string;
    documentTitle: string;
    documentCategory: string;
    onClose: () => void;
    onFirmado?: () => void;
}

// Fase 3: el firmante ve SU recuadro destacado sobre el PDF y confirma la firma.
export const FirmarModal: React.FC<FirmarModalProps> = ({ solicitud, miFirmante, documentUrl, documentTitle, documentCategory, onClose, onFirmado }) => {
    const { firmarDocumento } = useFirma();
    const { tieneRubrica, guardarRubrica, loading: rubricaLoading } = useRubrica();

    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [cargando, setCargando] = useState(true);
    const { pdf } = usePdfDocument(pdfBytes);
    const [firmando, setFirmando] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => {
        (async () => {
            setCargando(true);
            const signed = await getSignedDocumentUrl(documentUrl);
            if (signed) setPdfBytes(await (await fetch(signed)).arrayBuffer());
            setCargando(false);
        })();
    }, [documentUrl]);

    const handleFirmar = async () => {
        setFirmando(true);
        setMsg(null);
        const res = await firmarDocumento(solicitud, miFirmante, documentCategory);
        if (res.success) {
            setMsg({ text: 'Documento firmado correctamente', ok: true });
            setTimeout(() => { onFirmado?.(); onClose(); }, 900);
        } else {
            setMsg({ text: res.error || 'No se pudo firmar', ok: false });
        }
        setFirmando(false);
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[90vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <PenTool className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Firmar documento</h3>
                            <p className="text-[10px] text-brand-text/40 truncate max-w-xs">{documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!rubricaLoading && !tieneRubrica ? (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-brand-text/60">Necesitas registrar tu rúbrica antes de firmar.</p>
                            <RubricaPad onGuardar={guardarRubrica} />
                        </div>
                    ) : cargando ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <p className="text-[11px] font-bold text-brand-text/50 mb-3">Tu recuadro de firma está destacado en la página {miFirmante.pagina + 1}</p>
                            <div className="relative">
                                <PdfPageCanvas pdf={pdf} pageNum={miFirmante.pagina + 1}>
                                    <div
                                        className="absolute rounded-md border-2 border-brand-primary bg-brand-primary/15 flex items-center justify-center animate-pulse"
                                        style={{
                                            left: `${miFirmante.posX * 100}%`, top: `${miFirmante.posY * 100}%`,
                                            width: `${miFirmante.ancho * 100}%`, height: `${miFirmante.alto * 100}%`,
                                        }}
                                    >
                                        <span className="text-[10px] font-black text-brand-primary">Tu firma aquí</span>
                                    </div>
                                </PdfPageCanvas>
                            </div>
                        </div>
                    )}
                </div>

                {tieneRubrica && !cargando && (
                    <div className="p-6 border-t border-brand-border shrink-0 space-y-3">
                        {msg && (
                            <p className={`text-[11px] font-bold flex items-center gap-1.5 ${msg.ok ? 'text-emerald-600' : 'text-danger'}`}>
                                {msg.ok && <CheckCircle2 className="w-3.5 h-3.5" />} {msg.text}
                            </p>
                        )}
                        <button
                            onClick={handleFirmar}
                            disabled={firmando}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                        >
                            {firmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                            {firmando ? 'Firmando...' : 'Firmar aquí'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
