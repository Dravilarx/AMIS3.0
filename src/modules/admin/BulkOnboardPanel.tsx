import React, { useMemo, useState } from 'react';
import {
    Users, Search, Loader2, CheckCircle2, AlertTriangle, ShieldAlert, Download,
    Copy, Check, RefreshCw, UserPlus, X, MinusCircle, ChevronLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBulkOnboard, type ResultadoOnboard, type ResumenOnboard } from '../../hooks/useBulkOnboard';

const SITIO_AMIS = 'https://amis-3-0.vercel.app';
const MAX_LOTE = 100;

// Mismo formato exacto que el alta de a uno (CreateInternalUserModal.textoCorreo).
const textoCorreo = (fullName: string, email: string, password: string) =>
`Asunto: Tu acceso a AMIS 3.0

Hola ${fullName}:

Ya tienes acceso a AMIS 3.0.

Sitio para ingresar: ${SITIO_AMIS}
Usuario: ${email}
Contraseña inicial: ${password}

Por seguridad, deberás cambiar tu contraseña la primera vez que ingreses.`;

// Escapa un valor para CSV (comillas, comas, saltos de línea).
const csvCell = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;

const estadoBadge = (estado: ResultadoOnboard['estado']) => {
    if (estado === 'creada') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (estado === 'omitida') return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-danger/10 text-danger border-danger/20';
};
const estadoLabel = (estado: ResultadoOnboard['estado']) =>
    estado === 'creada' ? 'Creada' : estado === 'omitida' ? 'Omitida' : 'Error';

export const BulkOnboardPanel: React.FC = () => {
    const { elegibles, loading, error, recargar, crearTanda, quitarElegibles } = useBulkOnboard();

    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [filtroRol, setFiltroRol] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const [confirmando, setConfirmando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [errFn, setErrFn] = useState<string | null>(null);

    // Resultados de la última tanda.
    const [resumen, setResumen] = useState<ResumenOnboard | null>(null);
    const [resultados, setResultados] = useState<ResultadoOnboard[]>([]);
    const [copiado, setCopiado] = useState<string | null>(null);

    // ── Roles disponibles para el filtro ──
    const roles = useMemo(() => {
        const s = new Set<string>();
        elegibles.forEach(e => { if (e.rol) s.add(e.rol); });
        return Array.from(s).sort();
    }, [elegibles]);

    // ── Lista filtrada ──
    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return elegibles.filter(e =>
            (!filtroRol || e.rol === filtroRol) &&
            (!q || e.nombre.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
        );
    }, [elegibles, filtroRol, busqueda]);

    const toggle = (id: string) => {
        setSeleccion(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const seleccionarFiltrados = () => {
        setSeleccion(prev => {
            const next = new Set(prev);
            filtrados.forEach(e => next.add(e.id));
            return next;
        });
    };
    const limpiar = () => setSeleccion(new Set());

    const nSel = seleccion.size;
    const excedeLote = nSel > MAX_LOTE;

    // ── Crear la tanda ──
    const ejecutar = async () => {
        setConfirmando(false);
        setProcesando(true);
        setErrFn(null);
        try {
            const ids = Array.from(seleccion);
            const { resumen: r, resultados: res } = await crearTanda(ids);
            setResumen(r);
            setResultados(res);
            // Sacar del listado a las que quedaron creadas (ya no son candidatas).
            const creadasIds = res.filter(x => x.estado === 'creada').map(x => x.professionalId);
            if (creadasIds.length) quitarElegibles(creadasIds);
            setSeleccion(new Set());
        } catch (e: any) {
            setErrFn(e?.message || 'No se pudo completar el alta masiva.');
        } finally {
            setProcesando(false);
        }
    };

    const creadas = useMemo(() => resultados.filter(r => r.estado === 'creada'), [resultados]);

    const copiarTexto = async (id: string, texto: string) => {
        try {
            await navigator.clipboard.writeText(texto);
            setCopiado(id);
            setTimeout(() => setCopiado(c => (c === id ? null : c)), 1800);
        } catch { /* ignore */ }
    };

    const descargarCSV = () => {
        const encabezado = ['Nombre', 'Email', 'Contraseña', 'Texto de correo'].map(csvCell).join(',');
        const filas = creadas.map(r =>
            [r.nombre, r.email, r.password || '', textoCorreo(r.nombre, r.email, r.password || '')].map(csvCell).join(',')
        );
        const csv = '﻿' + [encabezado, ...filas].join('\r\n'); // BOM para Excel
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accesos-amis-${creadas.length}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ═══════════════════════ VISTA DE RESULTADOS ═══════════════════════
    if (resumen) {
        return (
            <div className="space-y-5">
                <button
                    onClick={() => { setResumen(null); setResultados([]); }}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver al listado
                </button>

                {/* Resumen */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Creadas</p>
                        <p className="text-3xl font-black text-emerald-600">{resumen.creadas}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Omitidas</p>
                        <p className="text-3xl font-black text-amber-600">{resumen.omitidas}</p>
                    </div>
                    <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-danger/70">Errores</p>
                        <p className="text-3xl font-black text-danger">{resumen.errores}</p>
                    </div>
                </div>

                {/* Aviso de seguridad */}
                {creadas.length > 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black text-amber-700">Esta lista contiene contraseñas.</p>
                            <p className="text-[12px] text-amber-700/80 mt-0.5">
                                Envía a cada persona su acceso y luego elimina la planilla; no la dejes guardada.
                            </p>
                        </div>
                    </div>
                )}

                {/* Descargar planilla */}
                {creadas.length > 0 && (
                    <button
                        onClick={descargarCSV}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all"
                    >
                        <Download className="w-4 h-4" /> Descargar planilla ({creadas.length})
                    </button>
                )}

                {/* Tabla de resultados */}
                <div className="border border-brand-border rounded-2xl overflow-hidden">
                    <div className="max-h-[52vh] overflow-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-brand-surface/95 backdrop-blur border-b border-brand-border">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                                    <th className="px-4 py-3">Persona</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Detalle / Correo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/60">
                                {resultados.map((r, i) => (
                                    <tr key={`${r.professionalId}-${i}`} className="text-sm">
                                        <td className="px-4 py-3 font-bold text-brand-text">{r.nombre || '—'}</td>
                                        <td className="px-4 py-3 text-brand-text/60">{r.email || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border', estadoBadge(r.estado))}>
                                                {estadoLabel(r.estado)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.estado === 'creada' && r.password ? (
                                                <button
                                                    onClick={() => copiarTexto(r.professionalId, textoCorreo(r.nombre, r.email, r.password!))}
                                                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-brand-primary hover:opacity-80 transition-opacity"
                                                >
                                                    {copiado === r.professionalId
                                                        ? <><Check className="w-3.5 h-3.5" /> Copiado</>
                                                        : <><Copy className="w-3.5 h-3.5" /> Copiar texto</>}
                                                </button>
                                            ) : (
                                                <span className="text-[12px] text-brand-text/50">{r.motivo || '—'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════ VISTA DE SELECCIÓN ═══════════════════════
    return (
        <div className="space-y-4">
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-brand-text uppercase tracking-tight">Alta masiva de cuentas</h2>
                        <p className="text-[12px] text-brand-text/50">
                            Elige a quiénes activar. Cada cuenta se crea con clave inicial y forzado de cambio al primer ingreso.
                        </p>
                    </div>
                </div>
                <button
                    onClick={recargar}
                    disabled={loading}
                    title="Recargar lista"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Recargar
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                    <input
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o email…"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                    />
                </div>
                <select
                    value={filtroRol}
                    onChange={e => setFiltroRol(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                >
                    <option value="">Todos los roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                    onClick={seleccionarFiltrados}
                    disabled={filtrados.length === 0}
                    className="px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/60 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-40"
                >
                    Seleccionar todos ({filtrados.length})
                </button>
                <button
                    onClick={limpiar}
                    disabled={nSel === 0}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/60 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-40"
                >
                    <MinusCircle className="w-3.5 h-3.5" /> Limpiar
                </button>
            </div>

            {/* Barra de estado / acción */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surface/40 px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-brand-text">{nSel} seleccionados</span>
                    {excedeLote && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Máximo {MAX_LOTE} por tanda. Reduce la selección o hazlo en tandas.
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setConfirmando(true)}
                    disabled={nSel === 0 || excedeLote || procesando}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all disabled:opacity-40"
                >
                    {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {procesando ? 'Creando cuentas…' : 'Crear cuentas de los seleccionados'}
                </button>
            </div>

            {errFn && (
                <p className="flex items-start gap-1.5 text-[12px] font-bold text-danger">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {errFn}
                </p>
            )}
            {error && (
                <p className="flex items-start gap-1.5 text-[12px] font-bold text-danger">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
                </p>
            )}

            {/* Listado */}
            <div className="border border-brand-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-brand-text/40">
                        <Loader2 className="w-5 h-5 animate-spin" /> Cargando profesionales…
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <CheckCircle2 className="w-8 h-8 text-brand-text/20" />
                        <p className="text-sm font-bold text-brand-text/50">
                            {elegibles.length === 0
                                ? 'No hay profesionales pendientes de activar.'
                                : 'Ningún profesional coincide con el filtro.'}
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[48vh] overflow-auto divide-y divide-brand-border/60">
                        {filtrados.map(e => {
                            const marcado = seleccion.has(e.id);
                            return (
                                <label
                                    key={e.id}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                                        marcado ? 'bg-brand-primary/5' : 'hover:bg-brand-surface/40'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={marcado}
                                        onChange={() => toggle(e.id)}
                                        className="w-4 h-4 rounded accent-brand-primary shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-brand-text truncate">{e.nombre}</p>
                                        <p className="text-[12px] text-brand-text/50 truncate">{e.email}</p>
                                    </div>
                                    {e.rol && (
                                        <span className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-surface text-brand-text/50 border border-brand-border">
                                            {e.rol}
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Diálogo de confirmación */}
            {confirmando && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-brand-surface border border-brand-border rounded-3xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                                <UserPlus className="w-4.5 h-4.5 text-brand-primary" />
                            </div>
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Confirmar alta masiva</h3>
                        </div>
                        <p className="text-[13px] text-brand-text/70">
                            Se crearán <span className="font-black text-brand-text">{nSel}</span> {nSel === 1 ? 'cuenta' : 'cuentas'} nuevas.
                            Cada persona recibirá una clave inicial que deberá cambiar al primer ingreso.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                onClick={() => setConfirmando(false)}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/50 hover:text-brand-text transition-colors"
                            >
                                <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                            <button
                                onClick={ejecutar}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all"
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Crear {nSel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
