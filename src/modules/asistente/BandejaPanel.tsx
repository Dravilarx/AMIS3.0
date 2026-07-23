import React, { useState, useMemo } from 'react';
import {
    Inbox, AlertTriangle, Stethoscope, Building2, Hash, Loader2, Send,
    CheckCircle2, RotateCcw, UserCheck, MessageSquare, Filter, X,
    Search, Crosshair, Lightbulb, Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useValidadoresLite, type ValidadorLite } from '../../hooks/useValidadoresLite';
import { timeAgo } from '../../lib/timeAgo';
import type { MensajeRow, EstadoMensaje } from './useBandeja';
import type { AsistenteInstitution } from './useAsistente';

type AccionAsignacion = { success: boolean; error?: string };

interface BandejaPanelProps {
    mensajes: MensajeRow[];
    loading: boolean;
    error: string | null;
    institutions: AsistenteInstitution[];
    onTomar: (id: string, estadoActual: EstadoMensaje) => Promise<{ success: boolean; otroUsuario?: boolean; error?: string }>;
    onResponder: (id: string, texto: string) => Promise<{ success: boolean; error?: string }>;
    onCerrar: (id: string) => Promise<{ success: boolean; error?: string }>;
    onReabrir: (id: string) => Promise<{ success: boolean; error?: string }>;
    onSugerir: (id: string, radiologoId: string) => Promise<AccionAsignacion>;
    onPasarPelota: (id: string, radiologoId: string) => Promise<AccionAsignacion>;
    onQuitarSugerido: (id: string) => Promise<AccionAsignacion>;
    onQuitarResponsable: (id: string) => Promise<AccionAsignacion>;
}

// Selector de radiólogo validador con buscador (pueden ser ~31). Controlado:
// el padre mantiene el id elegido; aquí solo se filtra y se elige.
const ValidadorSelector: React.FC<{
    validadores: ValidadorLite[];
    valor: string | null;
    onChange: (id: string | null) => void;
    disabled?: boolean;
}> = ({ validadores, valor, onChange, disabled }) => {
    const [q, setQ] = useState('');
    const elegido = validadores.find(v => v.id === valor) || null;
    const filtrados = useMemo(() => {
        const t = q.trim().toLowerCase();
        return t ? validadores.filter(v => v.nombre.toLowerCase().includes(t)) : validadores;
    }, [validadores, q]);

    return (
        <div className={cn('space-y-2', disabled && 'opacity-50 pointer-events-none')}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text/20" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={elegido ? elegido.nombre : 'Buscar radiólogo validador...'}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/50"
                />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-brand-border divide-y divide-brand-border">
                {filtrados.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-brand-text/30 text-center">Sin coincidencias</p>
                ) : filtrados.map(v => (
                    <button
                        key={v.id}
                        onClick={() => onChange(v.id)}
                        className={cn(
                            'w-full text-left px-3 py-2 transition-colors hover:bg-brand-bg/60',
                            valor === v.id && 'bg-brand-primary/10'
                        )}
                    >
                        <p className="text-xs font-bold text-brand-text truncate">{v.nombre}</p>
                        {v.specialty && <p className="text-[10px] text-brand-text/40 truncate">{v.specialty}</p>}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ESTADO_META: Record<EstadoMensaje, { label: string; cls: string }> = {
    nuevo:      { label: 'Nuevo',      cls: 'text-brand-primary bg-brand-primary/10 border-brand-primary/30' },
    tomado:     { label: 'Tomado',     cls: 'text-info    bg-info/10    border-info/20' },
    respondido: { label: 'Respondido', cls: 'text-success bg-success/10 border-success/20' },
    cerrado:    { label: 'Cerrado',    cls: 'text-brand-text/40 bg-brand-bg border-brand-border' },
    reabierto:  { label: 'Reabierto',  cls: 'text-warning bg-warning/10 border-warning/20' },
};

const TIPO_LABELS: Record<string, string> = {
    consulta: 'Consulta',
    adendum: 'Adéndum',
    doble_opinion: 'Doble opinión',
    correccion: 'Corrección',
    examen_pendiente: 'Examen pendiente',
};

const fmtFechaLarga = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Fecha y hora completas con formato fijo ("4 jul 2026, 17:22"), sin depender
// de si el Intl del entorno agrega punto tras el mes abreviado.
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtFechaHoraCompleta = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
};

export const BandejaPanel: React.FC<BandejaPanelProps> = ({
    mensajes, loading, error, institutions, onTomar, onResponder, onCerrar, onReabrir,
    onSugerir, onPasarPelota, onQuitarSugerido, onQuitarResponsable,
}) => {
    const { user } = useAuth();
    const { validadores } = useValidadoresLite();

    // Mapa id → nombre para resolver Sugerido/Responsable (torre de control).
    const nombreValidador = useMemo(() => {
        const m = new Map<string, string>();
        validadores.forEach(v => m.set(v.id, v.nombre));
        return m;
    }, [validadores]);
    const resolverRadiologo = (id: string | null) =>
        id ? (nombreValidador.get(id) || 'Radiólogo') : null;

    const [filterEstado, setFilterEstado] = useState<'todos' | EstadoMensaje>('todos');
    const [filterCentro, setFilterCentro] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [respuestaTexto, setRespuestaTexto] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
    // Radiólogo elegido en el selector de asignación (por caso seleccionado).
    const [radiologoElegido, setRadiologoElegido] = useState<string | null>(null);

    const showNotice = (msg: string, ok: boolean) => {
        setNotice({ msg, ok });
        setTimeout(() => setNotice(null), 4000);
    };

    const filtered = useMemo(() => mensajes.filter(m => {
        const matchEstado = filterEstado === 'todos' || m.estado === filterEstado;
        const matchCentro = !filterCentro || m.institutionId === filterCentro;
        return matchEstado && matchCentro;
    }), [mensajes, filterEstado, filterCentro]);

    const selected = mensajes.find(m => m.id === selectedId) || null;

    // Se selecciona automáticamente el primero visible si el seleccionado ya no está en la lista filtrada.
    const seleccionarMensaje = (id: string) => {
        setSelectedId(id);
        setRespuestaTexto('');
        setRadiologoElegido(null);
    };

    const centroNombre = (m: MensajeRow) => m.centro ? (m.centro.commercialName || m.centro.legalName) : '—';

    const handleTomar = async (m: MensajeRow) => {
        setActionLoading(true);
        const res = await onTomar(m.id, m.estado);
        setActionLoading(false);
        if (res.success) showNotice('Mensaje tomado', true);
        else showNotice(res.otroUsuario ? 'Otro usuario ya lo tomó' : (res.error || 'No se pudo tomar el mensaje'), false);
    };

    const handleResponder = async (m: MensajeRow) => {
        if (!respuestaTexto.trim()) return;
        setActionLoading(true);
        const res = await onResponder(m.id, respuestaTexto);
        setActionLoading(false);
        if (res.success) { setRespuestaTexto(''); showNotice('Respuesta enviada', true); }
        else showNotice(res.error || 'No se pudo enviar la respuesta', false);
    };

    const handleCerrar = async (m: MensajeRow) => {
        setActionLoading(true);
        const res = await onCerrar(m.id);
        setActionLoading(false);
        if (res.success) showNotice('Mensaje cerrado', true);
        else showNotice(res.error || 'No se pudo cerrar', false);
    };

    const handleReabrir = async (m: MensajeRow) => {
        setActionLoading(true);
        const res = await onReabrir(m.id);
        setActionLoading(false);
        if (res.success) showNotice('Mensaje reabierto', true);
        else showNotice(res.error || 'No se pudo reabrir', false);
    };

    // ── Asignación de radiólogo ──
    const handleSugerir = async (m: MensajeRow) => {
        if (!radiologoElegido) return;
        setActionLoading(true);
        const res = await onSugerir(m.id, radiologoElegido);
        setActionLoading(false);
        if (res.success) showNotice('Radiólogo sugerido', true);
        else showNotice(res.error || 'No se pudo sugerir', false);
    };
    const handlePasarPelota = async (m: MensajeRow) => {
        if (!radiologoElegido) return;
        setActionLoading(true);
        const res = await onPasarPelota(m.id, radiologoElegido);
        setActionLoading(false);
        if (res.success) showNotice('Pelota pasada al radiólogo', true);
        else showNotice(res.error || 'No se pudo pasar la pelota', false);
    };
    const handleQuitarSugerido = async (m: MensajeRow) => {
        setActionLoading(true);
        const res = await onQuitarSugerido(m.id);
        setActionLoading(false);
        if (res.success) showNotice('Sugerencia quitada', true);
        else showNotice(res.error || 'No se pudo quitar', false);
    };
    const handleQuitarResponsable = async (m: MensajeRow) => {
        setActionLoading(true);
        const res = await onQuitarResponsable(m.id);
        setActionLoading(false);
        if (res.success) showNotice('Pelota devuelta a la secretaría', true);
        else showNotice(res.error || 'No se pudo quitar', false);
    };

    // Etiqueta discreta de en quién está la pelota (para la lista/torre de control).
    const etiquetaAsignacion = (m: MensajeRow): { texto: string; cls: string } => {
        if (m.radiologoCaso) return { texto: `Con ${resolverRadiologo(m.radiologoCaso)}`, cls: 'text-info bg-info/10 border-info/20' };
        if (m.radiologoSugerido) return { texto: `Sugerido: ${resolverRadiologo(m.radiologoSugerido)}`, cls: 'text-warning bg-warning/10 border-warning/20' };
        return { texto: 'Sin asignar', cls: 'text-brand-text/40 bg-brand-bg border-brand-border' };
    };

    // Reglas de acciones. 'reabierto' se trata igual que 'nuevo' (Tomar/Responder
    // directo), ya que la tarea no especificó su comportamiento y dejarlo sin
    // ninguna acción disponible sería un callejón sin salida.
    const puedeTomar = (m: MensajeRow) => m.estado === 'nuevo' || m.estado === 'reabierto';
    const puedeResponder = (m: MensajeRow) =>
        m.estado === 'nuevo' || m.estado === 'reabierto' || (m.estado === 'tomado' && m.tomadoPor === user?.id);
    const puedeCerrar = (m: MensajeRow) => m.estado === 'respondido';
    const puedeReabrir = (m: MensajeRow) => m.estado === 'cerrado';

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-danger text-sm py-16">{error}</p>;
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                    <Filter className="w-3.5 h-3.5" /> Filtrar
                </span>
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as any)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/50 appearance-none"
                >
                    <option value="todos">Todos los estados</option>
                    <option value="nuevo">Nuevos</option>
                    <option value="tomado">Tomados</option>
                    <option value="respondido">Respondidos</option>
                    <option value="cerrado">Cerrados</option>
                    <option value="reabierto">Reabiertos</option>
                </select>
                <select
                    value={filterCentro}
                    onChange={(e) => setFilterCentro(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/50 appearance-none"
                >
                    <option value="">Todos los centros</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
                <span className="ml-auto text-[10px] font-mono text-brand-text/30">
                    {filtered.length} de {mensajes.length} mensajes
                </span>
            </div>

            {/* Notice */}
            {notice && (
                <div className={cn(
                    'px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-top-1',
                    notice.ok ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'
                )}>
                    <div className={cn('w-2 h-2 rounded-full', notice.ok ? 'bg-success' : 'bg-danger animate-pulse')} />
                    {notice.msg}
                </div>
            )}

            {/* Layout: lista + detalle */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-5 items-start">
                {/* Lista */}
                <div className="bg-brand-surface border border-brand-border rounded-[2rem] shadow-xl overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Inbox className="w-10 h-10 text-brand-text/10" />
                            <p className="text-brand-text/30 text-xs uppercase font-black tracking-widest">Sin mensajes</p>
                        </div>
                    ) : (
                        <div className="max-h-[70vh] overflow-y-auto divide-y divide-brand-border">
                            {filtered.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => seleccionarMensaje(m.id)}
                                    className={cn(
                                        'w-full text-left px-5 py-4 transition-colors hover:bg-brand-bg/60',
                                        selectedId === m.id && 'bg-brand-primary/5',
                                        m.estado === 'nuevo' && 'bg-brand-primary/[0.03]'
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        {m.urgente && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-danger/15 border border-danger/30 text-danger rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                <AlertTriangle className="w-2.5 h-2.5" /> Urgente
                                            </span>
                                        )}
                                        <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border', ESTADO_META[m.estado]?.cls)}>
                                            {ESTADO_META[m.estado]?.label || m.estado}
                                        </span>
                                        <span className="text-[9px] font-bold text-brand-text/30 uppercase tracking-wider">{TIPO_LABELS[m.tipo] || m.tipo}</span>
                                    </div>
                                    <p className="text-sm font-bold text-brand-text truncate">
                                        {m.medico ? `${m.medico.name} ${m.medico.lastName}` : 'Médico externo'}
                                    </p>
                                    <p className="text-[10px] text-brand-text/40 truncate mb-1.5">{centroNombre(m)}</p>
                                    <span className={cn('inline-block mb-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest', etiquetaAsignacion(m).cls)}>
                                        {etiquetaAsignacion(m).texto}
                                    </span>
                                    {m.referenciaPaciente && (
                                        <p className="text-[10px] text-brand-primary/70 font-bold mb-1">Episodio: {m.referenciaPaciente}</p>
                                    )}
                                    <p className="text-[11px] text-brand-text/50 line-clamp-2 mb-1.5">{m.texto}</p>
                                    <p className="text-[9px] text-brand-text/25 font-mono">{timeAgo(m.creadoAt)}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detalle */}
                <div className="bg-brand-surface border border-brand-border rounded-[2rem] shadow-xl p-6 lg:sticky lg:top-6 min-h-[20rem]">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <MessageSquare className="w-10 h-10 text-brand-text/10" />
                            <p className="text-brand-text/30 text-xs uppercase font-black tracking-widest">Selecciona un mensaje para ver el detalle</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Header del detalle */}
                            <div className="flex items-start justify-between gap-3 border-b border-brand-border pb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selected.urgente && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 bg-danger/15 border border-danger/30 text-danger rounded-full text-[9px] font-black uppercase tracking-widest">
                                            <AlertTriangle className="w-3 h-3" /> Urgente
                                        </span>
                                    )}
                                    <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', ESTADO_META[selected.estado]?.cls)}>
                                        {ESTADO_META[selected.estado]?.label || selected.estado}
                                    </span>
                                    <span className="text-[10px] font-bold text-brand-text/30 uppercase tracking-wider">{TIPO_LABELS[selected.tipo] || selected.tipo}</span>
                                </div>
                                <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-text hover:bg-brand-bg transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Banner destacado: por qué este mensaje vuelve a ofrecer "Tomar" */}
                            {selected.estado === 'reabierto' && (
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-warning/15 border-2 border-warning/40 text-warning">
                                    <RotateCcw className="w-4.5 h-4.5 shrink-0" />
                                    <p className="text-[11px] font-black uppercase tracking-widest">
                                        Reabierto — este mensaje volvió a la bandeja y puede tomarse de nuevo
                                    </p>
                                </div>
                            )}

                            {/* Datos del médico y centro */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-2.5">
                                    <Stethoscope className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-brand-text truncate">
                                            {selected.medico ? `${selected.medico.name} ${selected.medico.lastName}` : 'Médico externo'}
                                        </p>
                                        <p className="text-[10px] text-brand-text/40 truncate">
                                            {[selected.medico?.specialty, selected.medico?.hospitalName].filter(Boolean).join(' · ') || '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <Building2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-brand-text truncate">{centroNombre(selected)}</p>
                                        {selected.referenciaPaciente && (
                                            <p className="text-[10px] text-brand-text/40 flex items-center gap-1">
                                                <Hash className="w-2.5 h-2.5" /> Episodio: {selected.referenciaPaciente}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Texto completo del mensaje */}
                            <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl">
                                <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{selected.texto}</p>
                                <p className="text-[9px] text-brand-text/30 font-mono mt-2">{fmtFechaLarga(selected.creadoAt)}</p>
                            </div>

                            {/* ── Asignación de radiólogo (torre de control) ── */}
                            <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Asignación</p>

                                {/* Estado actual */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-3.5 h-3.5 text-warning shrink-0" />
                                        <span className="text-[11px] text-brand-text/50">Sugerido:</span>
                                        <span className="text-[11px] font-bold text-brand-text">{resolverRadiologo(selected.radiologoSugerido) || '—'}</span>
                                        {selected.radiologoSugerido && (
                                            <button
                                                onClick={() => handleQuitarSugerido(selected)}
                                                disabled={actionLoading}
                                                className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-text/30 hover:text-danger transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3 h-3" /> Quitar
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Crosshair className="w-3.5 h-3.5 text-info shrink-0" />
                                        <span className="text-[11px] text-brand-text/50">Responsable (con la pelota):</span>
                                        <span className="text-[11px] font-bold text-brand-text">{resolverRadiologo(selected.radiologoCaso) || '—'}</span>
                                        {selected.radiologoCaso && (
                                            <button
                                                onClick={() => handleQuitarResponsable(selected)}
                                                disabled={actionLoading}
                                                className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-text/30 hover:text-danger transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3 h-3" /> Quitar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Selector + acciones */}
                                <ValidadorSelector
                                    validadores={validadores}
                                    valor={radiologoElegido}
                                    onChange={setRadiologoElegido}
                                    disabled={actionLoading}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleSugerir(selected)}
                                        disabled={actionLoading || !radiologoElegido}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-warning/10 border border-warning/20 text-warning rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-warning/20 transition-all disabled:opacity-40"
                                    >
                                        <Lightbulb className="w-3.5 h-3.5" /> Sugerir
                                    </button>
                                    <button
                                        onClick={() => handlePasarPelota(selected)}
                                        disabled={actionLoading || !radiologoElegido}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-info/10 border border-info/20 text-info rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-info/20 transition-all disabled:opacity-40"
                                    >
                                        <Crosshair className="w-3.5 h-3.5" /> Pasar la pelota
                                    </button>
                                </div>
                                <p className="text-[9px] text-brand-text/30 leading-relaxed">
                                    Sugerir no cambia al responsable ni saca el caso de tu bandeja. Pasar la pelota lo deja a cargo del radiólogo, pero sigues viéndolo y puedes responder por urgencia.
                                </p>
                            </div>

                            {/* Hilo de respuestas */}
                            {selected.respuestas.length > 0 && (
                                <div className="space-y-2.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Respuestas</p>
                                    {selected.respuestas.map(r => (
                                        <div key={r.id} className="p-3.5 bg-brand-primary/5 border border-brand-primary/15 rounded-xl space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-bold text-brand-primary">{r.autorMostrado || 'Equipo Radiología'}</span>
                                                <span className="text-[9px] text-brand-text/30 font-mono text-right shrink-0">
                                                    {fmtFechaHoraCompleta(r.creadaAt)}
                                                    <span className="opacity-60"> · {timeAgo(r.creadaAt)}</span>
                                                </span>
                                            </div>
                                            <p className="text-sm text-brand-text/80 whitespace-pre-wrap">{r.texto}</p>
                                            <div className="pt-1.5 border-t border-brand-primary/10 space-y-0.5">
                                                <p className="text-[9px] text-brand-text/40 font-bold">
                                                    Respondida por: {r.respondidoPorNombre || 'Usuario desconocido'}
                                                </p>
                                                <p className="text-[9px] text-brand-text/30 italic">
                                                    Visible para el médico como: {r.autorMostrado || 'Equipo Radiología'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Acciones */}
                            <div className="pt-2 border-t border-brand-border space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {puedeTomar(selected) && (
                                        <button
                                            onClick={() => handleTomar(selected)}
                                            disabled={actionLoading}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                        >
                                            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                            Tomar
                                        </button>
                                    )}
                                    {puedeCerrar(selected) && (
                                        <button
                                            onClick={() => handleCerrar(selected)}
                                            disabled={actionLoading}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-bg border border-brand-border text-brand-text/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-surface transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Cerrar
                                        </button>
                                    )}
                                    {puedeReabrir(selected) && (
                                        <button
                                            onClick={() => handleReabrir(selected)}
                                            disabled={actionLoading}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/20 text-warning rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-warning/20 transition-all disabled:opacity-50"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                                        </button>
                                    )}
                                </div>

                                {puedeResponder(selected) && (
                                    <div className="space-y-2">
                                        <textarea
                                            value={respuestaTexto}
                                            onChange={(e) => setRespuestaTexto(e.target.value)}
                                            placeholder="Escribe tu respuesta..."
                                            rows={3}
                                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 resize-none"
                                        />
                                        <button
                                            onClick={() => handleResponder(selected)}
                                            disabled={actionLoading || !respuestaTexto.trim()}
                                            className={cn(
                                                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                                respuestaTexto.trim() && !actionLoading
                                                    ? 'bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20 hover:scale-[1.01]'
                                                    : 'bg-brand-bg text-brand-text/20 cursor-not-allowed border border-brand-border'
                                            )}
                                        >
                                            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                            Responder
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
