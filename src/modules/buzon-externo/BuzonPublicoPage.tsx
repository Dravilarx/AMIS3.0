import React, { useState, useRef, useEffect } from 'react';
import { Logo } from '../../components/Logo';

// ─────────────────────────────────────────────────────────────────────────────
// Página pública del "Buzón de subida externa" v2 — /buzon/{token}, SIN sesión.
// Deliberadamente AISLADA: no importa src/lib/supabase.ts (el cliente
// autenticado) ni ningún hook/módulo interno de AMIS. Habla con la Edge
// Function por fetch() y sube los archivos DIRECTO a Storage (signed upload
// URL con PUT), sin que el binario pase por la función. Así el chunk de esta
// página no arrastra el bundle autenticado.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/buzon-subir`;

const MAX_ARCHIVO_BYTES = 200 * 1024 * 1024;
const MAX_ARCHIVOS = 10;
const CONCURRENCIA = 3; // subidas simultáneas
const TIPOS_ACEPTADOS = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/quicktime',
];
const ACCEPT_ATTR = '.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,.jpg,.jpeg,.png,video/mp4,video/quicktime,.mov';

type Paso = 'pin' | 'form' | 'resumen';
type EstadoArchivo = 'pendiente' | 'subiendo' | 'ok' | 'error';

interface ArchivoLocal {
    id: string;
    file: File;
    estado: EstadoArchivo;
    progreso: number; // 0-100
    ruta?: string;    // ruta asignada por preparar-subida (para 'confirmar')
}

const extraerToken = (): string => {
    const partes = window.location.pathname.split('/').filter(Boolean); // ['buzon', '{token}']
    return partes[1] || '';
};

const fmtTamano = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const u = ['KB', 'MB', 'GB'];
    let v = bytes, i = -1;
    do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
    return `${v.toFixed(1)} ${u[i]}`;
};

// PUT del archivo directo a la signed upload URL. Progreso vía XHR (fetch no
// expone progreso de subida). No requiere apikey: el token va en la URL.
const subirArchivo = (signedUrl: string, file: File, onProgreso: (pct: number) => void): Promise<boolean> =>
    new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);
        xhr.setRequestHeader('content-type', file.type);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
        xhr.onerror = () => resolve(false);
        xhr.send(file);
    });

export const BuzonPublicoPage: React.FC = () => {
    const token = extraerToken();

    // El tema "vermellon" (marca AMIS) se define como :root[data-theme="vermellon"]
    // en index.css — necesita el atributo en <html>, no en un div interno.
    useEffect(() => {
        const previo = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'vermellon');
        return () => {
            if (previo) document.documentElement.setAttribute('data-theme', previo);
            else document.documentElement.removeAttribute('data-theme');
        };
    }, []);

    const [paso, setPaso] = useState<Paso>('pin');
    const [pin, setPin] = useState('');
    const [etiqueta, setEtiqueta] = useState('');
    // Si el buzón define un remitente fijo, no se pide "Tu nombre": se usa este.
    const [remitenteFijo, setRemitenteFijo] = useState<string | null>(null);
    const [validando, setValidando] = useState(false);
    const [errorPin, setErrorPin] = useState<string | null>(null);

    const [nombre, setNombre] = useState('');
    const [nota, setNota] = useState('');
    const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const [resumen, setResumen] = useState<{ ok: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tokenFaltante = !token;

    const setEstadoArchivo = (id: string, patch: Partial<ArchivoLocal>) =>
        setArchivos(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

    const handleValidar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{4,6}$/.test(pin)) { setErrorPin('Ingresa una clave de 4 a 6 dígitos.'); return; }
        setValidando(true);
        setErrorPin(null);
        try {
            const res = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
                body: JSON.stringify({ action: 'validar', token, pin }),
            });
            const data = await res.json().catch(() => ({ ok: false, motivo: 'No se pudo validar la clave.' }));
            if (data.ok) {
                setEtiqueta(data.etiqueta || '');
                setRemitenteFijo(typeof data.remitenteFijo === 'string' && data.remitenteFijo.trim() ? data.remitenteFijo.trim() : null);
                setPaso('form');
            } else setErrorPin(data.motivo || 'Clave incorrecta.');
        } catch {
            setErrorPin('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
        } finally {
            setValidando(false);
        }
    };

    const agregarArchivos = (files: FileList | File[]) => {
        setErrorEnvio(null);
        const nuevos: ArchivoLocal[] = [];
        for (const file of Array.from(files)) {
            if (archivos.length + nuevos.length >= MAX_ARCHIVOS) { setErrorEnvio(`Máximo ${MAX_ARCHIVOS} archivos por envío.`); break; }
            if (file.size > MAX_ARCHIVO_BYTES) { setErrorEnvio(`"${file.name}" supera el límite de 200MB.`); continue; }
            if (!TIPOS_ACEPTADOS.includes(file.type)) { setErrorEnvio(`"${file.name}" tiene un tipo no permitido.`); continue; }
            nuevos.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, file, estado: 'pendiente', progreso: 0 });
        }
        if (nuevos.length) setArchivos(prev => [...prev, ...nuevos]);
    };

    const quitarArchivo = (id: string) => setArchivos(prev => prev.filter(a => a.id !== id));

    // Sube en paralelo con un límite de concurrencia. Devuelve, por cada archivo
    // que terminó OK, su { id, ruta } — así el llamador no depende del estado de
    // React (que es una captura stale dentro de handleEnviar).
    const subirLote = async (
        lote: ArchivoLocal[],
        subidas: { idx: number; ruta: string; signedUrl: string }[],
    ): Promise<{ id: string; ruta: string; nombreOriginal: string }[]> => {
        const porIdx = new Map(subidas.map(s => [s.idx, s]));
        const okList: { id: string; ruta: string; nombreOriginal: string }[] = [];
        let cursor = 0;
        const worker = async () => {
            while (cursor < lote.length) {
                const i = cursor++;
                const a = lote[i];
                const plan = porIdx.get(i);
                if (!plan) { setEstadoArchivo(a.id, { estado: 'error' }); continue; }
                setEstadoArchivo(a.id, { estado: 'subiendo', progreso: 0, ruta: plan.ruta });
                const ok = await subirArchivo(plan.signedUrl, a.file, (pct) => setEstadoArchivo(a.id, { progreso: pct }));
                if (ok) { okList.push({ id: a.id, ruta: plan.ruta, nombreOriginal: a.file.name }); setEstadoArchivo(a.id, { estado: 'ok', progreso: 100 }); }
                else setEstadoArchivo(a.id, { estado: 'error' });
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, lote.length) }, worker));
        return okList;
    };

    // Nombre efectivo: el fijo del buzón (si existe) o el que escribió el remitente.
    const nombreEfectivo = (remitenteFijo || nombre).trim();

    const handleEnviar = async () => {
        if (!nombreEfectivo) { setErrorEnvio('Ingresa tu nombre.'); return; }
        // La descripción es OPCIONAL: puede ir vacía.

        // Lote = todo lo que aún no está 'ok'. Al reintentar desde el resumen se
        // vuelve al formulario con los fallidos en estado 'error', y esta misma
        // selección los reenvía sin tocar los que ya subieron.
        const lote = archivos.filter(a => a.estado !== 'ok');
        if (lote.length === 0) { setErrorEnvio('No hay archivos para enviar.'); return; }

        setEnviando(true);
        setErrorEnvio(null);
        lote.forEach(a => setEstadoArchivo(a.id, { estado: 'pendiente', progreso: 0 }));

        try {
            // 1) Preparar: la función valida el lote y devuelve una signed URL por archivo.
            const prep = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
                body: JSON.stringify({
                    action: 'preparar-subida',
                    token, pin,
                    archivos: lote.map(a => ({ nombre_original: a.file.name, mimetype: a.file.type, tamano: a.file.size })),
                }),
            });
            const prepData = await prep.json().catch(() => ({ ok: false, motivo: 'No se pudo preparar la subida.' }));
            if (!prepData.ok) { setErrorEnvio(prepData.motivo || 'No se pudo preparar la subida.'); setEnviando(false); return; }

            // 2) Subir cada archivo directo a Storage (en paralelo, con progreso).
            const subidosOk = await subirLote(lote, prepData.subidas);

            // 3) Confirmar solo los que subieron OK.
            const enviosConfirmar = subidosOk.map(s => ({ ruta: s.ruta, nombre_original: s.nombreOriginal }));

            if (enviosConfirmar.length > 0) {
                const conf = await fetch(EDGE_FUNCTION_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
                    body: JSON.stringify({ action: 'confirmar', token, pin, envios: enviosConfirmar, nombre: nombreEfectivo, nota: nota.trim() }),
                });
                const confData = await conf.json().catch(() => ({ ok: false }));
                const registrados = confData.ok ? (confData.registrados || 0) : 0;
                // Los archivos que quedaron fuera del lote (excluidos por estar ya 'ok'
                // en un intento previo) ya cuentan como enviados.
                const yaEnviadosAntes = archivos.length - lote.length;
                setResumen({ ok: yaEnviadosAntes + registrados, total: archivos.length });
                setPaso('resumen');
            } else {
                setErrorEnvio('Ningún archivo se pudo subir. Revisa tu conexión e intenta de nuevo.');
            }
        } catch {
            setErrorEnvio('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    const enviarOtros = () => {
        setArchivos([]);
        setNombre('');
        setNota('');
        setErrorEnvio(null);
        setResumen(null);
        setPaso('form');
        // El PIN y el token quedan en memoria: no se vuelve a pedir la clave.
    };

    return (
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <Logo type="mark" height={40} />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-text/30 font-bold">Buzón de documentos</p>
                </div>

                <div className="bg-brand-surface border border-brand-border rounded-3xl shadow-2xl p-6">
                    {tokenFaltante ? (
                        <p className="text-center text-sm text-brand-text/50 py-8">Enlace incompleto.</p>
                    ) : paso === 'pin' ? (
                        <form onSubmit={handleValidar} className="space-y-5">
                            <div className="text-center space-y-1">
                                <h1 className="text-base font-black text-brand-text uppercase tracking-tight">Ingresa la clave</h1>
                                <p className="text-xs text-brand-text/40">Te la entregó quien te compartió este enlace</p>
                            </div>
                            <input
                                type="text" inputMode="numeric" pattern="[0-9]*" autoFocus maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••"
                                className="w-full text-center text-3xl tracking-[0.4em] font-black bg-brand-bg border border-brand-border rounded-2xl px-4 py-4 text-brand-text outline-none focus:border-brand-primary/50"
                            />
                            {errorPin && <p className="text-center text-xs font-bold text-danger">{errorPin}</p>}
                            <button type="submit" disabled={validando || pin.length < 4}
                                className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 disabled:opacity-40 transition-all">
                                {validando ? 'Verificando...' : 'Continuar'}
                            </button>
                        </form>
                    ) : paso === 'form' ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleEnviar(); }} className="space-y-4">
                            <div className="text-center space-y-1 mb-2">
                                <h1 className="text-base font-black text-brand-text uppercase tracking-tight">Enviar documentos</h1>
                                {etiqueta && <p className="text-xs text-brand-text/40">{etiqueta}</p>}
                            </div>

                            {/* "Tu nombre" solo si el buzón no trae un remitente fijo. */}
                            {!remitenteFijo && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Tu nombre</label>
                                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/50" />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Descripción breve (opcional)</label>
                                    <span className="text-[9px] text-brand-text/20">{nota.length}/500</span>
                                </div>
                                <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 500))} rows={2}
                                    placeholder="De qué se tratan los documentos..."
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/50 resize-none" />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Archivos</label>
                                    <span className="text-[9px] text-brand-text/20">{archivos.length}/{MAX_ARCHIVOS}</span>
                                </div>

                                {archivos.length < MAX_ARCHIVOS && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) agregarArchivos(e.dataTransfer.files); }}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-6 px-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center ${
                                            dragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border'
                                        }`}
                                    >
                                        <input ref={fileInputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
                                            onChange={(e) => { if (e.target.files?.length) agregarArchivos(e.target.files); e.target.value = ''; }} />
                                        <p className="text-xs font-bold text-brand-text/50">Toca para elegir o arrastra aquí</p>
                                        <p className="text-[10px] text-brand-text/25">Puedes enviar hasta {MAX_ARCHIVOS} archivos · PDF, Word, Excel, fotos o videos · máx. 200MB cada uno</p>
                                    </div>
                                )}

                                {archivos.length > 0 && (
                                    <div className="space-y-1.5 mt-2">
                                        {archivos.map(a => (
                                            <div key={a.id} className="p-2.5 bg-brand-bg border border-brand-border rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-brand-text truncate">{a.file.name}</p>
                                                        <p className="text-[9px] text-brand-text/30">{fmtTamano(a.file.size)}</p>
                                                    </div>
                                                    {a.estado === 'ok' && <span className="text-success text-sm shrink-0">✓</span>}
                                                    {a.estado === 'error' && <span className="text-danger text-xs font-black shrink-0">✗</span>}
                                                    {(a.estado === 'pendiente' && !enviando) && (
                                                        <button type="button" onClick={() => quitarArchivo(a.id)} className="text-brand-text/30 hover:text-danger text-xs shrink-0">Quitar</button>
                                                    )}
                                                </div>
                                                {(a.estado === 'subiendo' || (a.estado === 'ok' && a.progreso === 100)) && (
                                                    <div className="mt-1.5 h-1 bg-brand-border rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${a.estado === 'ok' ? 'bg-success' : 'bg-brand-primary'}`} style={{ width: `${a.progreso}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {errorEnvio && <p className="text-center text-xs font-bold text-danger">{errorEnvio}</p>}

                            <button type="submit" disabled={enviando || archivos.length === 0}
                                className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 disabled:opacity-40 transition-all">
                                {enviando ? 'Enviando...' : `Enviar ${archivos.length || ''} documento${archivos.length === 1 ? '' : 's'}`}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4 py-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                                resumen && resumen.ok === resumen.total ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'
                            }`}>
                                <span className="text-3xl">{resumen && resumen.ok === resumen.total ? '✓' : '!'}</span>
                            </div>
                            <div>
                                <h1 className="text-base font-black text-brand-text uppercase tracking-tight">
                                    {resumen?.ok || 0} de {resumen?.total || 0} documento{(resumen?.total || 0) === 1 ? '' : 's'} enviado{(resumen?.ok || 0) === 1 ? '' : 's'}
                                </h1>
                                <p className="text-xs text-brand-text/40 mt-1">
                                    {resumen && resumen.ok === resumen.total ? 'Todo quedó registrado. Gracias.' : 'Algunos no se pudieron enviar. Puedes intentar de nuevo.'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                {resumen && resumen.ok < resumen.total && (
                                    <button onClick={() => setPaso('form')}
                                        className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-warning text-white transition-all">
                                        Reintentar los que faltaron
                                    </button>
                                )}
                                <button onClick={enviarOtros}
                                    className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-brand-border text-brand-text/60 hover:bg-brand-bg transition-all">
                                    Enviar otros documentos
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-brand-text/20 mt-6 uppercase tracking-widest font-bold">AMIS 3.0</p>
            </div>
        </div>
    );
};
