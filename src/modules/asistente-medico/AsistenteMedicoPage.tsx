import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Loader2, RefreshCw, Plus, AlertTriangle, ChevronLeft, Send, CheckCircle2,
    Clock, MessageSquare, ShieldAlert, Building2, Stethoscope,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import {
    activarInvitacion, validarSesion, leerMensajes, enviarMensaje,
    ApiError, type Bandeja, type MensajeMedico,
} from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Asistente AMIS — PWA del médico externo (/m/:token). App instalable, a pantalla
// completa, SIN login de AMIS. Aislada: solo habla con las Edge Functions comm-*.
// Móvil primero. Un componente, tres estados: activación → principal → nueva.
// ─────────────────────────────────────────────────────────────────────────────

const LS_TOKEN = 'amis_asistente_token_sesion';

const TIPOS: { valor: string; etiqueta: string }[] = [
    { valor: 'consulta', etiqueta: 'Consulta' },
    { valor: 'adendum', etiqueta: 'Adéndum' },
    { valor: 'doble_opinion', etiqueta: 'Doble opinión' },
    { valor: 'correccion', etiqueta: 'Corrección' },
    { valor: 'examen_pendiente', etiqueta: 'Examen pendiente' },
];
const tipoEtiqueta = (v: string) => TIPOS.find(t => t.valor === v)?.etiqueta || v;

const tokenDeUrl = (): string => {
    const partes = window.location.pathname.split('/').filter(Boolean); // ['m', '{token}']
    return partes[0] === 'm' ? (partes[1] || '') : '';
};

const fmtFecha = (iso: string): string => {
    try {
        return new Date(iso).toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

type Estado = 'cargando' | 'error' | 'principal' | 'nueva';

export const AsistenteMedicoPage: React.FC = () => {
    // Tema fijo claro para lectura en teléfono (como hace el Buzón con su tema).
    useEffect(() => {
        const previo = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        return () => { if (previo) document.documentElement.setAttribute('data-theme', previo); };
    }, []);

    // Service worker mínimo → hace la app instalable ("agregar a pantalla de inicio").
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => { /* no bloquea la app */ });
        }
    }, []);

    const [estado, setEstado] = useState<Estado>('cargando');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [tokenSesion, setTokenSesion] = useState<string | null>(null);
    const [medico, setMedico] = useState<string | null>(null);
    const [centro, setCentro] = useState<string | null>(null);

    const [bandeja, setBandeja] = useState<Bandeja | null>(null);
    const [refrescando, setRefrescando] = useState(false);

    // ── Carga de la bandeja ──
    const cargarBandeja = useCallback(async (ts: string) => {
        setRefrescando(true);
        try {
            const b = await leerMensajes(ts);
            setBandeja(b);
        } catch (e) {
            // Si la sesión dejó de valer, vuelve a activación con mensaje.
            if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
                localStorage.removeItem(LS_TOKEN);
                setErrorMsg('Tu sesión ya no es válida. Vuelve a abrir el enlace que te envió el centro.');
                setEstado('error');
            }
        } finally {
            setRefrescando(false);
        }
    }, []);

    // ── Activación / validación al abrir ──
    useEffect(() => {
        let cancelado = false;
        (async () => {
            const guardado = localStorage.getItem(LS_TOKEN);
            const tokenUrl = tokenDeUrl();

            // 1. Si hay sesión guardada en este dispositivo, validarla primero.
            if (guardado) {
                try {
                    const v = await validarSesion(guardado);
                    if (cancelado) return;
                    if (v.valida) {
                        setTokenSesion(guardado);
                        setMedico(v.medico ?? null);
                        setCentro(v.centro ?? null);
                        await cargarBandeja(guardado);
                        if (!cancelado) setEstado('principal');
                        return;
                    }
                } catch { /* sesión no válida → intentar activar con el token de la URL */ }
                localStorage.removeItem(LS_TOKEN);
            }

            // 2. Sin sesión válida: activar la invitación con el :token de la URL.
            if (!tokenUrl) {
                if (!cancelado) {
                    setErrorMsg('Este enlace no es válido. Abre el enlace que te envió el centro.');
                    setEstado('error');
                }
                return;
            }
            try {
                const s = await activarInvitacion(tokenUrl);
                if (cancelado) return;
                localStorage.setItem(LS_TOKEN, s.token_sesion);
                setTokenSesion(s.token_sesion);
                setMedico(s.medico);
                setCentro(s.centro);
                await cargarBandeja(s.token_sesion);
                if (!cancelado) setEstado('principal');
            } catch (e) {
                if (cancelado) return;
                const msg = e instanceof ApiError
                    ? 'Este enlace no es válido o ya fue usado. Contacta al centro.'
                    : 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.';
                setErrorMsg(msg);
                setEstado('error');
            }
        })();
        return () => { cancelado = true; };
    }, [cargarBandeja]);

    const refrescar = () => { if (tokenSesion) cargarBandeja(tokenSesion); };

    // ═══════════════════ SPLASH / ACTIVACIÓN ═══════════════════
    if (estado === 'cargando') {
        return (
            <Pantalla>
                <div className="flex flex-col items-center gap-6 text-center">
                    <Logo type="mark" height={56} />
                    <div className="flex items-center gap-2 text-brand-text/50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-bold">Conectando…</span>
                    </div>
                </div>
            </Pantalla>
        );
    }

    if (estado === 'error') {
        return (
            <Pantalla>
                <div className="flex flex-col items-center gap-5 text-center max-w-xs">
                    <Logo type="mark" height={44} />
                    <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-danger" />
                    </div>
                    <p className="text-sm font-bold text-brand-text">{errorMsg}</p>
                </div>
            </Pantalla>
        );
    }

    // ═══════════════════ NUEVA CONSULTA ═══════════════════
    if (estado === 'nueva' && tokenSesion) {
        return (
            <NuevaConsulta
                tokenSesion={tokenSesion}
                onCancelar={() => setEstado('principal')}
                onEnviada={async () => { await cargarBandeja(tokenSesion); setEstado('principal'); }}
            />
        );
    }

    // ═══════════════════ PRINCIPAL (bandeja) ═══════════════════
    return (
        <div className="min-h-[100dvh] bg-brand-bg text-brand-text font-sans flex flex-col">
            {/* Encabezado */}
            <header className="sticky top-0 z-10 bg-brand-surface/95 backdrop-blur border-b border-brand-border">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                    <Logo type="mark" height={30} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-brand-text truncate flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            {medico || 'Médico'}
                        </p>
                        {centro && (
                            <p className="text-[11px] text-brand-text/50 truncate flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 shrink-0" /> {centro}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={refrescar}
                        disabled={refrescando}
                        title="Actualizar"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/50 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refrescando ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </header>

            {/* Contenido */}
            <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 pb-28">
                {/* Resumen */}
                {bandeja && (
                    <div className="flex items-center gap-4 mb-4 px-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" /> {bandeja.respondidos} respondidas
                        </span>
                        <span className="text-brand-text/20">·</span>
                        <span className="flex items-center gap-1.5 text-[13px] font-bold text-amber-600">
                            <Clock className="w-4 h-4" /> {bandeja.pendientes} pendientes
                        </span>
                    </div>
                )}

                {/* Lista */}
                {!bandeja || bandeja.mensajes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <MessageSquare className="w-10 h-10 text-brand-text/20" />
                        <p className="text-sm font-bold text-brand-text/50">Aún no tienes consultas.</p>
                        <p className="text-[12px] text-brand-text/40">Toca "Nueva consulta" para escribir al centro.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bandeja.mensajes.map(m => <TarjetaMensaje key={m.id} m={m} />)}
                    </div>
                )}
            </main>

            {/* FAB Nueva consulta */}
            <div className="fixed bottom-0 inset-x-0 z-20 pointer-events-none">
                <div className="max-w-lg mx-auto px-4 pb-5">
                    <button
                        onClick={() => setEstado('nueva')}
                        className="pointer-events-auto w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-xl shadow-brand-primary/25 active:scale-[0.98] transition-transform"
                    >
                        <Plus className="w-5 h-5" /> Nueva consulta
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Tarjeta de una consulta con sus respuestas ──
const TarjetaMensaje: React.FC<{ m: MensajeMedico }> = ({ m }) => (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary">
                    {tipoEtiqueta(m.tipo)}
                </span>
                {m.episodio && (
                    <span className="text-[11px] font-bold text-brand-text/50">Ep. {m.episodio}</span>
                )}
                {m.urgente && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-danger/10 text-danger">
                        Urgente
                    </span>
                )}
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                m.respondido
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}>
                {m.respondido ? 'Respondida' : 'Pendiente'}
            </span>
        </div>

        <p className="mt-3 text-sm text-brand-text whitespace-pre-wrap break-words">{m.texto}</p>
        <p className="mt-2 text-[11px] text-brand-text/40">{fmtFecha(m.fecha)}</p>

        {m.respuestas.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
                {m.respuestas.map((r, i) => (
                    <div key={i} className="rounded-xl bg-brand-primary/5 border border-brand-primary/15 p-3">
                        <p className="text-sm text-brand-text whitespace-pre-wrap break-words">{r.texto}</p>
                        <p className="mt-1.5 text-[11px] font-bold text-brand-primary">
                            {r.autor} <span className="font-normal text-brand-text/40">· {fmtFecha(r.fecha)}</span>
                        </p>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ── Formulario de nueva consulta ──
const NuevaConsulta: React.FC<{
    tokenSesion: string;
    onCancelar: () => void;
    onEnviada: () => void | Promise<void>;
}> = ({ tokenSesion, onCancelar, onEnviada }) => {
    const [tipo, setTipo] = useState('consulta');
    const [episodio, setEpisodio] = useState('');
    const [texto, setTexto] = useState('');
    const [urgente, setUrgente] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const puedeEnviar = useMemo(() => texto.trim().length > 0 && !enviando, [texto, enviando]);

    const enviar = async () => {
        if (!puedeEnviar) return;
        setEnviando(true);
        setError(null);
        setAviso(null);
        try {
            const r = await enviarMensaje({
                token_sesion: tokenSesion,
                tipo,
                referencia_paciente: episodio.trim() || null,
                texto: texto.trim(),
                urgente,
            });
            // Si el envío fue fuera de horario, mostrar el aviso ANTES de volver.
            if (r.fuera_horario && r.aviso) {
                setAviso(r.aviso);
                setEnviando(false);
                return;
            }
            await onEnviada();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo enviar. Intenta de nuevo.');
            setEnviando(false);
        }
    };

    // Panel de aviso fuera de horario (envío YA realizado con éxito).
    if (aviso) {
        return (
            <Pantalla>
                <div className="flex flex-col items-center gap-5 text-center max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-brand-text mb-1">Consulta enviada</p>
                        <p className="text-[13px] text-brand-text/60 leading-relaxed">{aviso}</p>
                    </div>
                    <button
                        onClick={() => onEnviada()}
                        className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-transform"
                    >
                        Entendido
                    </button>
                </div>
            </Pantalla>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-brand-bg text-brand-text font-sans flex flex-col">
            <header className="sticky top-0 z-10 bg-brand-surface/95 backdrop-blur border-b border-brand-border">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
                    <button
                        onClick={onCancelar}
                        className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-brand-text/50 hover:text-brand-text transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Volver
                    </button>
                    <h1 className="flex-1 text-center text-sm font-black uppercase tracking-tight">Nueva consulta</h1>
                    <span className="w-14" />
                </div>
            </header>

            <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 space-y-5">
                {/* Tipo */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest ml-1">Tipo</label>
                    <select
                        value={tipo}
                        onChange={e => setTipo(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                    >
                        {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                    </select>
                </div>

                {/* Episodio */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest ml-1">Número de episodio</label>
                    <input
                        value={episodio}
                        onChange={e => setEpisodio(e.target.value)}
                        inputMode="numeric"
                        placeholder="Ej: 480213"
                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                    />
                    <p className="text-[11px] text-brand-text/40 ml-1 leading-relaxed">
                        Solo el número de episodio o accession, sin nombre ni RUT del paciente.
                    </p>
                </div>

                {/* Texto */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest ml-1">Consulta</label>
                    <textarea
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        rows={6}
                        placeholder="Escribe tu consulta…"
                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3.5 text-sm text-brand-text outline-none focus:border-brand-primary/40 resize-none"
                    />
                </div>

                {/* Urgente */}
                <label className="flex items-center gap-3 px-1 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={urgente}
                        onChange={e => setUrgente(e.target.checked)}
                        className="w-5 h-5 rounded accent-danger shrink-0"
                    />
                    <span className="text-sm font-bold text-brand-text">Marcar como urgente</span>
                </label>

                {error && (
                    <p className="flex items-start gap-1.5 text-[12px] font-bold text-danger">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
                    </p>
                )}
            </main>

            {/* Enviar */}
            <div className="sticky bottom-0 bg-brand-bg border-t border-brand-border">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <button
                        onClick={enviar}
                        disabled={!puedeEnviar}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-transform disabled:opacity-40"
                    >
                        {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {enviando ? 'Enviando…' : 'Enviar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Contenedor centrado a pantalla completa (splash / error / aviso) ──
const Pantalla: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-[100dvh] bg-brand-bg text-brand-text font-sans flex items-center justify-center p-6">
        {children}
    </div>
);
