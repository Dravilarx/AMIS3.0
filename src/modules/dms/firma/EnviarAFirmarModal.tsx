import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, UserPlus, FileSignature, Send, Loader2, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getSignedDocumentUrl } from '../../../lib/storageUrls';
import { useAuth } from '../../../hooks/useAuth';
import { useFirma, buscarUsuariosActivos } from '../../../hooks/useFirma';
import { useRubrica } from '../../../hooks/useRubrica';
import { usePdfDocument, PdfPageCanvas } from './PdfPageCanvas';
import { RubricaEditor } from './RubricaEditor';
import { RECUADRO_DEFAULT, COLORES_FIRMANTES, type PosicionEnEdicion } from '../../../types/firma';

const hoyMasDias = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
};

interface EnviarAFirmarModalProps {
    documentId: string;
    documentUrl: string;
    documentCategory: string;
    onClose: () => void;
    onListo?: () => void;
}

export const EnviarAFirmarModal: React.FC<EnviarAFirmarModalProps> = ({ documentId, documentUrl, documentCategory, onClose, onListo }) => {
    const { user } = useAuth();
    const { crearSolicitud, firmarDocumento } = useFirma();
    const { tieneRubrica, guardarRubrica, loading: rubricaLoading } = useRubrica();

    const [modo, setModo] = useState<'enviar' | 'ahora'>('enviar');
    const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
    const [cargandoPdf, setCargandoPdf] = useState(true);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const { pdf, numPages } = usePdfDocument(pdfBytes);
    const [currentPage, setCurrentPage] = useState(1);
    const [sizePx, setSizePx] = useState<{ width: number; height: number } | null>(null);

    const [firmantes, setFirmantes] = useState<PosicionEnEdicion[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; fullName: string }[]>([]);
    const [buscando, setBuscando] = useState(false);

    const [plazo, setPlazo] = useState(hoyMasDias(7));
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            setCargandoPdf(true);
            setPdfError(null);
            try {
                const signed = await getSignedDocumentUrl(documentUrl);
                if (!signed) throw new Error('No se pudo generar el enlace del documento');
                const res = await fetch(signed);
                if (!res.ok) throw new Error(`No se pudo descargar el documento (HTTP ${res.status})`);
                const bytes = await res.arrayBuffer();
                if (!cancelado) setPdfBytes(bytes);
            } catch (err: any) {
                console.error('Error cargando el PDF para posicionar firmas:', err);
                if (!cancelado) setPdfError(err.message || 'No se pudo cargar el documento');
            } finally {
                if (!cancelado) setCargandoPdf(false);
            }
        })();
        return () => { cancelado = true; };
    }, [documentUrl]);

    // Modo "firmar ahora": el único firmante soy yo. Depende de user?.id (no del
    // objeto user completo) para no resetear la posición del recuadro cada vez
    // que useAuth() re-renderiza con una referencia nueva.
    useEffect(() => {
        if (modo === 'ahora' && user) {
            setFirmantes([{
                userId: user.id,
                userName: user.name || 'Yo',
                color: COLORES_FIRMANTES[0],
                pagina: 0,
                posX: 0.1, posY: 0.1, ancho: RECUADRO_DEFAULT.ancho, alto: RECUADRO_DEFAULT.alto,
            }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modo, user?.id]);

    useEffect(() => {
        if (searchTerm.trim().length < 2) { setSearchResults([]); return; }
        let cancelled = false;
        setBuscando(true);
        const t = setTimeout(async () => {
            const res = await buscarUsuariosActivos(searchTerm);
            if (!cancelled) { setSearchResults(res); setBuscando(false); }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [searchTerm]);

    const agregarFirmante = (u: { id: string; fullName: string }) => {
        if (firmantes.some(f => f.userId === u.id)) return;
        const color = COLORES_FIRMANTES[firmantes.length % COLORES_FIRMANTES.length];
        setFirmantes(prev => [...prev, {
            userId: u.id, userName: u.fullName, color,
            pagina: currentPage - 1, posX: 0.1 + prev.length * 0.03, posY: 0.1 + prev.length * 0.05,
            ancho: RECUADRO_DEFAULT.ancho, alto: RECUADRO_DEFAULT.alto,
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const quitarFirmante = (userId: string) => setFirmantes(prev => prev.filter(f => f.userId !== userId));

    const moverAPagina = (userId: string, delta: number) => {
        setFirmantes(prev => prev.map(f => f.userId === userId ? { ...f, pagina: Math.max(0, Math.min(numPages - 1, f.pagina + delta)) } : f));
    };

    // Arrastre del recuadro dentro de la página visible.
    const onBoxPointerDown = (e: React.PointerEvent, userId: string) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const f = firmantes.find(x => x.userId === userId);
        if (!f || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        dragRef.current = { id: userId, offX: e.clientX - rect.left - f.posX * rect.width, offY: e.clientY - rect.top - f.posY * rect.height };
        setActiveId(userId);
    };

    const onContainerPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || !containerRef.current || !sizePx) return;
        const rect = containerRef.current.getBoundingClientRect();
        const f = firmantes.find(x => x.userId === drag.id);
        if (!f) return;
        let posX = (e.clientX - rect.left - drag.offX) / rect.width;
        let posY = (e.clientY - rect.top - drag.offY) / rect.height;
        posX = Math.max(0, Math.min(1 - f.ancho, posX));
        posY = Math.max(0, Math.min(1 - f.alto, posY));
        setFirmantes(prev => prev.map(x => x.userId === drag.id ? { ...x, posX, posY } : x));
    };

    const onContainerPointerUp = () => { dragRef.current = null; };

    const firmantesEnPagina = useMemo(() => firmantes.filter(f => f.pagina === currentPage - 1), [firmantes, currentPage]);

    const [mostrarRubricaInline, setMostrarRubricaInline] = useState(false);

    // Razón visible de por qué el botón de confirmar está deshabilitado — nunca
    // debe quedar un botón activo que en realidad no puede hacer nada.
    const disabledReason = useMemo(() => {
        if (enviando) return null; // ya en curso, el spinner es la señal
        if (cargandoPdf) return 'Cargando el documento...';
        if (pdfError) return 'No se pudo cargar el documento (ver mensaje abajo)';
        if (firmantes.length === 0) return 'Agrega al menos un firmante';
        if (numPages > 0 && firmantes.some(f => f.pagina < 0 || f.pagina >= numPages)) {
            return 'Reposiciona un recuadro: apunta a una página que ya no existe';
        }
        if (modo === 'ahora') {
            if (rubricaLoading) return 'Verificando tu rúbrica...';
            if (!tieneRubrica) return 'Registra tu rúbrica antes de firmar';
        }
        return null;
    }, [enviando, cargandoPdf, pdfError, firmantes, numPages, modo, rubricaLoading, tieneRubrica]);

    const handleConfirmar = async () => {
        if (disabledReason) { setMsg({ text: disabledReason, ok: false }); return; }

        setEnviando(true);
        setMsg(null);
        try {
            const res = await crearSolicitud({
                documentId,
                mensaje: mensaje.trim() || undefined,
                plazo,
                firmantes: firmantes.map(f => ({ userId: f.userId, pagina: f.pagina, posX: f.posX, posY: f.posY, ancho: f.ancho, alto: f.alto })),
            });
            if (!res.success || !res.solicitudId) {
                console.error('No se pudo crear la solicitud de firma:', res.error);
                setMsg({ text: res.error || 'No se pudo crear la solicitud', ok: false });
                return;
            }

            if (modo === 'ahora' && user) {
                const mio = firmantes[0];
                const miFirmanteCreado = res.firmantes?.find(f => f.userId === user.id);
                if (!miFirmanteCreado) {
                    console.error('No se encontró el id del firmante recién creado para "Firmar ahora":', res.firmantes);
                    setMsg({ text: 'Solicitud creada, pero no se pudo iniciar la firma automática. Firma manualmente desde "Pendientes de firma".', ok: false });
                    return;
                }
                const solicitudParaFirmar = {
                    id: res.solicitudId, documentId, solicitante: user.id, mensaje: mensaje.trim() || null,
                    plazo, estado: 'pendiente' as const, createdAt: new Date().toISOString(),
                    firmantes: [{
                        id: miFirmanteCreado.id, solicitudId: res.solicitudId, userId: user.id, userName: user.name,
                        pagina: mio.pagina, posX: mio.posX, posY: mio.posY, ancho: mio.ancho, alto: mio.alto,
                        estado: 'pendiente' as const, firmadoAt: null, fingerprint: null,
                    }],
                };
                const firmaRes = await firmarDocumento(solicitudParaFirmar, solicitudParaFirmar.firmantes[0], documentCategory);
                if (!firmaRes.success) {
                    console.error('Solicitud creada pero falló la firma automática:', firmaRes.error);
                    setMsg({ text: `Solicitud creada, pero falló la firma automática: ${firmaRes.error}`, ok: false });
                    return;
                }
            }

            setMsg({ text: modo === 'ahora' ? 'Documento firmado' : 'Solicitud enviada', ok: true });
            setTimeout(() => { onListo?.(); onClose(); }, 900);
        } catch (err: any) {
            console.error('Error inesperado en el flujo de firma:', err);
            setMsg({ text: err.message || 'Error inesperado al firmar', ok: false });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-5xl h-[90vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <FileSignature className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Firma de documento</h3>
                            <p className="text-[10px] text-brand-text/40">Posiciona los recuadros de firma sobre el PDF</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2 px-6 py-3 border-b border-brand-border shrink-0">
                    <button onClick={() => setModo('enviar')} className={cn('px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all', modo === 'enviar' ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text/40')}>Enviar a firmar</button>
                    <button onClick={() => setModo('ahora')} className={cn('px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all', modo === 'ahora' ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text/40')}>Firmar yo mismo</button>
                    <span className="text-[10px] text-brand-text/30 ml-1">Elige un modo; el botón de abajo confirma la acción</span>
                </div>

                {mostrarRubricaInline ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <p className="text-xs font-bold text-brand-text/60 mb-4">Necesitas registrar tu rúbrica antes de firmar.</p>
                        <RubricaEditor onGuardar={guardarRubrica} onGuardado={() => setMostrarRubricaInline(false)} />
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex">
                        <div className="w-72 border-r border-brand-border flex flex-col shrink-0">
                            {modo === 'enviar' && (
                                <div className="p-4 border-b border-brand-border space-y-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text/30" />
                                        <input
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Buscar usuario..."
                                            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                                        />
                                    </div>
                                    {buscando && <p className="text-[10px] text-brand-text/30">Buscando...</p>}
                                    {searchResults.length > 0 && (
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {searchResults.map(u => (
                                                <button key={u.id} onClick={() => agregarFirmante(u)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-brand-bg text-left">
                                                    <UserPlus className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                                                    <span className="text-xs font-semibold text-brand-text truncate">{u.fullName}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Firmantes ({firmantes.length})</p>
                                {firmantes.map(f => (
                                    <div key={f.userId} onClick={() => setActiveId(f.userId)} className={cn('p-2.5 rounded-xl border cursor-pointer transition-all', activeId === f.userId ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border')}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color }} />
                                            <span className="text-xs font-bold text-brand-text truncate flex-1">{f.userName}</span>
                                            {modo === 'enviar' && (
                                                <button onClick={(e) => { e.stopPropagation(); quitarFirmante(f.userId); }} className="text-brand-text/30 hover:text-danger">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-1.5 pl-4.5">
                                            <span className="text-[10px] text-brand-text/40">Página {f.pagina + 1}</span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); moverAPagina(f.userId, -1); }} className="p-0.5 rounded hover:bg-brand-bg text-brand-text/40"><ChevronLeft className="w-3 h-3" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moverAPagina(f.userId, 1); }} className="p-0.5 rounded hover:bg-brand-bg text-brand-text/40"><ChevronRight className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-brand-border space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Plazo</label>
                                    <input type="date" value={plazo} onChange={e => setPlazo(e.target.value)} className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-bg" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Mensaje (opcional)</label>
                                    <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-bg resize-none" />
                                </div>
                                {modo === 'ahora' && !rubricaLoading && !tieneRubrica && (
                                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                                        <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No tienes una rúbrica registrada</p>
                                        <button onClick={() => setMostrarRubricaInline(true)} className="w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 transition-all">
                                            Registrar rúbrica
                                        </button>
                                    </div>
                                )}
                                {msg && <p className={cn('text-[11px] font-bold', msg.ok ? 'text-emerald-600' : 'text-danger')}>{msg.text}</p>}
                                {!msg && disabledReason && <p className="text-[10px] font-bold text-brand-text/40">{disabledReason}</p>}
                                <button
                                    onClick={handleConfirmar}
                                    disabled={!!disabledReason}
                                    title={disabledReason || undefined}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20 disabled:opacity-40"
                                >
                                    {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {modo === 'ahora' ? 'Firmar ahora' : 'Enviar a firmar'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto flex flex-col items-center p-6 bg-brand-bg/40">
                            {cargandoPdf ? (
                                <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                            ) : pdfError ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center max-w-xs">
                                    <AlertTriangle className="w-8 h-8 text-danger" />
                                    <p className="text-xs font-bold text-danger">{pdfError}</p>
                                    <p className="text-[10px] text-brand-text/30">No es posible posicionar ni confirmar la firma sin el documento cargado.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg border border-brand-border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold text-brand-text/60">Página {currentPage} / {numPages}</span>
                                        <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg border border-brand-border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div
                                        ref={containerRef}
                                        onPointerMove={onContainerPointerMove}
                                        onPointerUp={onContainerPointerUp}
                                        className="relative"
                                    >
                                        <PdfPageCanvas pdf={pdf} pageNum={currentPage} onRendered={setSizePx}>
                                            {firmantesEnPagina.map(f => (
                                                <div
                                                    key={f.userId}
                                                    onPointerDown={(e) => onBoxPointerDown(e, f.userId)}
                                                    className="absolute rounded-md border-2 cursor-move flex items-center justify-center px-1 text-center"
                                                    style={{
                                                        left: `${f.posX * 100}%`, top: `${f.posY * 100}%`,
                                                        width: `${f.ancho * 100}%`, height: `${f.alto * 100}%`,
                                                        borderColor: f.color, background: `${f.color}33`,
                                                        touchAction: 'none',
                                                    }}
                                                >
                                                    <span className="text-[10px] font-black truncate" style={{ color: f.color }}>{f.userName}</span>
                                                </div>
                                            ))}
                                        </PdfPageCanvas>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
