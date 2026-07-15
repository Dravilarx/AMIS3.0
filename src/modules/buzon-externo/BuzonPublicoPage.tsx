import React, { useState, useRef, useEffect } from 'react';
import { Logo } from '../../components/Logo';

// ─────────────────────────────────────────────────────────────────────────────
// Página pública del "Buzón de subida externa" — /buzon/{token}, SIN sesión.
// Deliberadamente AISLADA: no importa src/lib/supabase.ts (el cliente
// autenticado) ni ningún hook/módulo interno de AMIS — solo hace fetch()
// directo a la Edge Function. Así el chunk de este componente (React.lazy en
// App.tsx) no arrastra lógica ni dependencias del sistema autenticado.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/buzon-subir`;

const MAX_ARCHIVO_BYTES = 50 * 1024 * 1024;
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

type Paso = 'pin' | 'form' | 'exito';

const extraerToken = (): string => {
    const partes = window.location.pathname.split('/').filter(Boolean); // ['buzon', '{token}']
    return partes[1] || '';
};

export const BuzonPublicoPage: React.FC = () => {
    const token = extraerToken();

    // El tema "vermellon" (marca AMIS) se define como :root[data-theme="vermellon"]
    // en index.css — necesita el atributo en <html>, no en un div interno. Esta
    // ruta es la única cosa que se renderiza en la página (ver App.tsx), así
    // que fijarlo acá no interfiere con nada del resto de la app.
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
    const [validando, setValidando] = useState(false);
    const [errorPin, setErrorPin] = useState<string | null>(null);

    const [nombre, setNombre] = useState('');
    const [nota, setNota] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tokenFaltante = !token;

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
                setPaso('form');
            } else {
                setErrorPin(data.motivo || 'Clave incorrecta.');
            }
        } catch {
            setErrorPin('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
        } finally {
            setValidando(false);
        }
    };

    const validarArchivoLocal = (f: File): string | null => {
        if (f.size > MAX_ARCHIVO_BYTES) return 'El archivo supera el límite de 50MB.';
        if (!TIPOS_ACEPTADOS.includes(f.type)) return 'Ese tipo de archivo no está permitido.';
        return null;
    };

    const elegirArchivo = (f: File | undefined | null) => {
        if (!f) return;
        const err = validarArchivoLocal(f);
        if (err) { setErrorEnvio(err); return; }
        setErrorEnvio(null);
        setArchivo(f);
    };

    const handleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) { setErrorEnvio('Ingresa tu nombre.'); return; }
        if (!nota.trim()) { setErrorEnvio('Describe brevemente el documento.'); return; }
        if (!archivo) { setErrorEnvio('Selecciona un archivo.'); return; }

        setEnviando(true);
        setErrorEnvio(null);
        try {
            const form = new FormData();
            form.append('action', 'subir');
            form.append('token', token);
            form.append('pin', pin);
            form.append('nombre', nombre.trim());
            form.append('nota', nota.trim());
            form.append('archivo', archivo);

            const res = await fetch(EDGE_FUNCTION_URL, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY }, body: form });
            const data = await res.json().catch(() => ({ ok: false, motivo: 'No se pudo enviar el documento.' }));
            if (data.ok) {
                setPaso('exito');
            } else {
                setErrorEnvio(data.motivo || 'No se pudo enviar el documento.');
            }
        } catch {
            setErrorEnvio('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    };

    const enviarOtro = () => {
        setNombre('');
        setNota('');
        setArchivo(null);
        setErrorEnvio(null);
        setPaso('form');
        // El PIN y el token quedan en memoria: no se vuelve a pedir la clave.
    };

    return (
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••"
                                className="w-full text-center text-3xl tracking-[0.4em] font-black bg-brand-bg border border-brand-border rounded-2xl px-4 py-4 text-brand-text outline-none focus:border-brand-primary/50"
                            />
                            {errorPin && <p className="text-center text-xs font-bold text-danger">{errorPin}</p>}
                            <button
                                type="submit"
                                disabled={validando || pin.length < 4}
                                className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 disabled:opacity-40 transition-all"
                            >
                                {validando ? 'Verificando...' : 'Continuar'}
                            </button>
                        </form>
                    ) : paso === 'form' ? (
                        <form onSubmit={handleEnviar} className="space-y-4">
                            <div className="text-center space-y-1 mb-2">
                                <h1 className="text-base font-black text-brand-text uppercase tracking-tight">Enviar documento</h1>
                                {etiqueta && <p className="text-xs text-brand-text/40">{etiqueta}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Tu nombre</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    maxLength={120}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Descripción breve</label>
                                    <span className="text-[9px] text-brand-text/20">{nota.length}/500</span>
                                </div>
                                <textarea
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value.slice(0, 500))}
                                    rows={3}
                                    placeholder="De qué se trata el documento..."
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/50 resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Archivo</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragOver(false); elegirArchivo(e.dataTransfer.files?.[0]); }}
                                    className={`flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center ${
                                        dragOver ? 'border-brand-primary bg-brand-primary/5' : archivo ? 'border-success/40 bg-success/5' : 'border-brand-border'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPT_ATTR}
                                        className="hidden"
                                        onChange={(e) => elegirArchivo(e.target.files?.[0])}
                                    />
                                    {archivo ? (
                                        <>
                                            <p className="text-xs font-bold text-brand-text truncate max-w-full px-2">{archivo.name}</p>
                                            <p className="text-[10px] text-brand-text/30">Toca para cambiar</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-bold text-brand-text/50">Toca para elegir un archivo</p>
                                            <p className="text-[10px] text-brand-text/25">PDF, Word, Excel, foto o video · máx. 50MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {errorEnvio && <p className="text-center text-xs font-bold text-danger">{errorEnvio}</p>}

                            <button
                                type="submit"
                                disabled={enviando}
                                className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 disabled:opacity-40 transition-all"
                            >
                                {enviando ? 'Enviando...' : 'Enviar documento'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4 py-6">
                            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
                                <span className="text-3xl">✓</span>
                            </div>
                            <div>
                                <h1 className="text-base font-black text-brand-text uppercase tracking-tight">Documento recibido correctamente</h1>
                                <p className="text-xs text-brand-text/40 mt-1">Gracias, ya quedó registrado.</p>
                            </div>
                            <button
                                onClick={enviarOtro}
                                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-brand-border text-brand-text/60 hover:bg-brand-bg transition-all"
                            >
                                Enviar otro documento
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-brand-text/20 mt-6 uppercase tracking-widest font-bold">AMIS 3.0</p>
            </div>
        </div>
    );
};
