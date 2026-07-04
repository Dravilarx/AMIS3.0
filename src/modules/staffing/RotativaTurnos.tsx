import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Loader2, AlertTriangle, AlertCircle,
    CheckCircle2, FileDown, FileSpreadsheet, CopyPlus, Send, Lock, Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useRotativaTurnos, mesEstaVacio, type Omitida } from '../../hooks/useRotativaTurnos';
import { detectarConflictosDuros, analizarNocheDia } from './turnos/conflictos';
import { diasDelMes, MESES, mesAnterior, mesSiguiente } from './turnos/fechas';
import { exportarPDF, exportarExcel, type ExportData } from './turnos/exportTurnos';
import { CeldaPopover } from './turnos/CeldaPopover';
import type { TurnoAsignacion } from '../../types/turnos';

const ROLES_EDICION = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const cellKey = (fecha: string, puestoId: string) => `${fecha}|${puestoId}`;

export const RotativaTurnos: React.FC = () => {
    const { user } = useAuth();
    const canEdit = ROLES_EDICION.includes(user?.role || '');

    const hoy = new Date();
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes] = useState(hoy.getMonth() + 1);

    const { professionals } = useProfessionals();
    const {
        puestos, asignaciones, mesInfo, loading, error,
        asignar, quitar, rellenarSemana, copiarMesAnterior, publicarMes,
    } = useRotativaTurnos(anio, mes);

    const [celdaSel, setCeldaSel] = useState<{ fecha: string; puestoId: string; fechaLabel: string } | null>(null);
    const [accionLoading, setAccionLoading] = useState(false);

    const dias = useMemo(() => diasDelMes(anio, mes), [anio, mes]);
    // Conflictos DUROS (solapamiento) — deberían ser inexistentes tras el bloqueo,
    // se marcan como defensa. Advertencias NOCHE→DÍA — permitidas, marcadas fuerte.
    const conflictosDuros = useMemo(() => detectarConflictosDuros(asignaciones, puestos), [asignaciones, puestos]);
    const nocheDia = useMemo(() => analizarNocheDia(asignaciones, puestos), [asignaciones, puestos]);

    // Índice de asignaciones por celda
    const porCelda = useMemo(() => {
        const map = new Map<string, TurnoAsignacion[]>();
        for (const a of asignaciones) {
            const k = cellKey(a.fecha, a.puestoId);
            const arr = map.get(k) || [];
            arr.push(a);
            map.set(k, arr);
        }
        return map;
    }, [asignaciones]);

    const estado = mesInfo?.estado ?? 'borrador';
    const mesLabel = MESES[mes - 1];

    // ── Navegación de mes ─────────────────────────────────────────────────────
    const irMesAnterior = () => { const p = mesAnterior(anio, mes); setAnio(p.anio); setMes(p.mes); setCeldaSel(null); };
    const irMesSiguiente = () => { const s = mesSiguiente(anio, mes); setAnio(s.anio); setMes(s.mes); setCeldaSel(null); };

    // ── Helpers de resumen ────────────────────────────────────────────────────
    const nombreProf = (id: string) => {
        const p = professionals.find(pp => pp.id === id);
        return p ? `${p.lastName} ${p.name}` : 'Profesional';
    };
    const resumenOmitidas = (omitidas: Omitida[]) =>
        omitidas.map(o => `• ${nombreProf(o.professionalId)} — ${o.puestoNombre} el ${o.fecha} (choca con ${o.chocaCon.puestoNombre} del ${o.chocaCon.fecha})`).join('\n');

    // ── Acciones de celda ─────────────────────────────────────────────────────
    const abrirCelda = (fecha: string, puestoId: string, fechaLabel: string) => {
        if (!canEdit) return;
        setCeldaSel({ fecha, puestoId, fechaLabel });
    };

    const handleAsignar = async (professionalId: string) => {
        if (!celdaSel) return;
        setAccionLoading(true);
        const res = await asignar(celdaSel.fecha, celdaSel.puestoId, professionalId);
        setAccionLoading(false);
        if (!res.success) window.alert(res.error || 'No se pudo asignar: solapamiento de horarios.');
    };

    const handleQuitar = async (asignacionId: string) => {
        setAccionLoading(true);
        await quitar(asignacionId);
        setAccionLoading(false);
    };

    const handleRellenarSemana = async (professionalId: string) => {
        if (!celdaSel) return;
        const puesto = puestos.find(p => p.id === celdaSel.puestoId);
        const prof = professionals.find(p => p.id === professionalId);
        const ok = window.confirm(
            `¿Copiar a ${prof ? `${prof.lastName} ${prof.name}` : 'este profesional'} en el puesto "${puesto?.nombre}" durante los 7 días de esa semana? Se respetan las celdas ya llenas y se omiten los días con solapamiento.`
        );
        if (!ok) return;
        setAccionLoading(true);
        const res = await rellenarSemana(celdaSel.fecha, celdaSel.puestoId, professionalId);
        setAccionLoading(false);
        setCeldaSel(null);
        if (res.omitidas && res.omitidas.length > 0) {
            window.alert(`${res.omitidas.length} asignación(es) omitida(s) por solapamiento:\n\n${resumenOmitidas(res.omitidas)}`);
        }
    };

    // ── Copiar mes anterior ───────────────────────────────────────────────────
    const puedeCopiar = canEdit && mesEstaVacio(asignaciones) && !loading;
    const handleCopiarMesAnterior = async () => {
        const prev = mesAnterior(anio, mes);
        const ok = window.confirm(
            `¿Copiar todas las asignaciones de ${MESES[prev.mes - 1]} ${prev.anio} a ${mesLabel} ${anio}? Se ajustan las fechas por día de la semana equivalente.`
        );
        if (!ok) return;
        setAccionLoading(true);
        const res = await copiarMesAnterior();
        setAccionLoading(false);
        if (!res.success) { window.alert(res.error || 'No se pudo copiar el mes anterior'); return; }
        if (res.omitidas && res.omitidas.length > 0) {
            window.alert(`${res.copiadas ?? 0} asignación(es) copiada(s). ${res.omitidas.length} omitida(s) por solapamiento:\n\n${resumenOmitidas(res.omitidas)}`);
        }
    };

    // ── Publicar ──────────────────────────────────────────────────────────────
    const obligatoriasVacias = useMemo(() => {
        let count = 0;
        for (const d of dias) {
            for (const p of puestos) {
                if (p.obligatorio && (porCelda.get(cellKey(d.fecha, p.id))?.length ?? 0) === 0) count++;
            }
        }
        return count;
    }, [dias, puestos, porCelda]);

    const handlePublicar = async () => {
        let msg = `¿Publicar la rotativa de ${mesLabel} ${anio}?`;
        if (nocheDia.pares.length > 0) {
            msg += `\n\nAdvertencias noche→día (${nocheDia.pares.length}):\n`
                + nocheDia.pares.map(p => `⚠ ${p.persona}: sale de ${p.nightPuesto} y entra a ${p.dayPuesto} el ${p.fecha}`).join('\n');
        }
        if (obligatoriasVacias > 0) {
            msg += `\n\n⚠️ Hay ${obligatoriasVacias} celda(s) de puestos obligatorios sin asignar.`;
        }
        msg += `\n\nPuedes publicar de todos modos.`;
        if (!window.confirm(msg)) return;
        setAccionLoading(true);
        const res = await publicarMes();
        setAccionLoading(false);
        if (!res.success) window.alert(res.error || 'No se pudo publicar');
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const buildExportData = (): ExportData => ({
        anio, mes, mesLabel, puestos,
        filas: dias.map(d => ({
            fecha: d.fecha,
            diaLabel: d.cortoLabel,
            finDeSemana: d.finDeSemana,
            celdas: Object.fromEntries(
                puestos.map(p => [
                    p.id,
                    (porCelda.get(cellKey(d.fecha, p.id)) || []).map(a => a.professionalApellido || a.professionalNombre),
                ])
            ),
        })),
    });

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                <p className="text-brand-text/40 text-xs font-mono uppercase tracking-[0.3em]">Cargando rotativa de turnos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-12 h-12 text-danger" />
                <p className="text-danger text-sm font-black uppercase tracking-widest">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-xl shadow-brand-primary/20">
                        <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-brand-text tracking-tighter uppercase leading-none">Rotativa de Turnos</h1>
                        <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.3em] mt-1.5">Planificación mensual de turnos médicos</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de mes */}
                    <div className="flex items-center gap-1 bg-brand-surface border border-brand-border rounded-xl p-1">
                        <button onClick={irMesAnterior} className="p-2 rounded-lg hover:bg-brand-bg text-brand-text/50 hover:text-brand-text transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-3 text-sm font-black text-brand-text uppercase tracking-tight min-w-[9rem] text-center">{mesLabel} {anio}</span>
                        <button onClick={irMesSiguiente} className="p-2 rounded-lg hover:bg-brand-bg text-brand-text/50 hover:text-brand-text transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    {/* Estado */}
                    <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border flex items-center gap-1.5',
                        estado === 'publicado' ? 'text-success bg-success/10 border-success/20' : 'text-warning bg-warning/10 border-warning/20'
                    )}>
                        {estado === 'publicado' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {estado}
                    </span>

                    {/* Export */}
                    <button onClick={() => exportarPDF(buildExportData())} className="flex items-center gap-1.5 px-3 py-2 bg-brand-surface border border-brand-border text-brand-text/70 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-bg transition-colors">
                        <FileDown className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={() => exportarExcel(buildExportData())} className="flex items-center gap-1.5 px-3 py-2 bg-brand-surface border border-brand-border text-brand-text/70 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-bg transition-colors">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </button>

                    {canEdit && (
                        <>
                            <button
                                onClick={handleCopiarMesAnterior}
                                disabled={!puedeCopiar || accionLoading}
                                title={puedeCopiar ? 'Copiar asignaciones del mes anterior' : 'Solo disponible si el mes está vacío'}
                                className="flex items-center gap-1.5 px-3 py-2 bg-brand-surface border border-brand-border text-brand-text/70 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <CopyPlus className="w-3.5 h-3.5" /> Copiar mes anterior
                            </button>
                            <button
                                onClick={handlePublicar}
                                disabled={accionLoading}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-primary to-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                            >
                                {accionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Publicar mes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Aviso edición de mes publicado */}
            {canEdit && estado === 'publicado' && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/5 border border-warning/20 text-warning">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-wide">Estás editando un mes ya publicado. Los cambios se guardan de inmediato.</p>
                </div>
            )}

            {/* Aviso solo lectura */}
            {!canEdit && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border text-brand-text/50">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-wide">Vista de solo lectura. No tienes permisos para editar la rotativa.</p>
                </div>
            )}

            {/* Grilla */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl shadow-xl overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-brand-bg">
                            <th className="sticky left-0 z-10 bg-brand-bg text-left px-3 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-r border-brand-border min-w-[7rem]">Día</th>
                            {puestos.map(p => (
                                <th key={p.id} className="px-3 py-3 text-left border-b border-r border-brand-border last:border-r-0 min-w-[8.5rem]">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-brand-text leading-tight">{p.nombre}</p>
                                    <p className="text-[8px] font-mono text-brand-text/40 mt-0.5">{p.horaInicio}–{p.horaFin}{p.obligatorio && <span className="text-warning ml-1">•oblig.</span>}</p>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dias.map((d, idx) => {
                            const nuevaSemana = idx === 0 || d.semana !== dias[idx - 1].semana;
                            return (
                                <React.Fragment key={d.fecha}>
                                    {nuevaSemana && (
                                        <tr>
                                            <td colSpan={puestos.length + 1} className="bg-brand-primary/5 border-y border-brand-primary/15 px-3 py-1">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary">Semana {d.semana}</span>
                                            </td>
                                        </tr>
                                    )}
                                    <tr className={cn(d.finDeSemana && 'bg-brand-bg/40')}>
                                        {/* Columna día */}
                                        <td className={cn(
                                            'sticky left-0 z-10 px-3 py-2 border-b border-r border-brand-border align-top',
                                            d.finDeSemana ? 'bg-brand-bg/80' : 'bg-brand-surface'
                                        )}>
                                            <p className="text-xs font-black text-brand-text leading-none">{d.cortoLabel}</p>
                                            <p className="text-[8px] text-brand-text/40 uppercase font-bold tracking-wider mt-0.5">{d.largoLabel}</p>
                                        </td>

                                        {/* Celdas por puesto */}
                                        {puestos.map(p => {
                                            const celdaAsigs = porCelda.get(cellKey(d.fecha, p.id)) || [];
                                            const vacia = celdaAsigs.length === 0;
                                            const obligVacia = p.obligatorio && vacia;
                                            const hard = celdaAsigs.some(a => conflictosDuros.has(a.id));
                                            const soft = celdaAsigs.some(a => nocheDia.porAsignacion.has(a.id));
                                            const tooltip = celdaAsigs
                                                .map(a => nocheDia.porAsignacion.get(a.id)?.mensaje || conflictosDuros.get(a.id)?.mensaje)
                                                .filter(Boolean).join(' · ');

                                            return (
                                                <td
                                                    key={p.id}
                                                    onClick={() => abrirCelda(d.fecha, p.id, `${d.largoLabel} ${d.cortoLabel}`)}
                                                    title={tooltip || undefined}
                                                    className={cn(
                                                        'px-2 py-1.5 border-b border-r border-brand-border last:border-r-0 align-top transition-colors min-h-[2.5rem]',
                                                        canEdit && 'cursor-pointer hover:bg-brand-primary/5',
                                                        obligVacia && 'ring-1 ring-inset ring-warning/40 bg-warning/[0.03]',
                                                        // Conflicto duro (defensa): anillo rojo fino
                                                        hard && !soft && 'ring-1 ring-inset ring-danger/60 bg-danger/[0.05]',
                                                        // Advertencia noche→día: tratamiento fuerte e inconfundible
                                                        soft && 'bg-danger/25 border-2 border-danger'
                                                    )}
                                                >
                                                    {vacia ? (
                                                        obligVacia ? (
                                                            <span className="flex items-center gap-1 text-warning/70"><AlertTriangle className="w-3 h-3" /><span className="text-[8px] font-black uppercase">Falta</span></span>
                                                        ) : (
                                                            <span className="text-brand-text/10 text-xs">—</span>
                                                        )
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            {celdaAsigs.map(a => {
                                                                const esSoft = nocheDia.porAsignacion.has(a.id);
                                                                const esHard = conflictosDuros.has(a.id);
                                                                return (
                                                                    <p key={a.id} className={cn(
                                                                        'text-[11px] font-bold leading-tight truncate flex items-center gap-1',
                                                                        esSoft ? 'text-danger font-black' : esHard ? 'text-danger' : 'text-brand-text'
                                                                    )}>
                                                                        {esSoft && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                                                                        {a.professionalApellido || a.professionalNombre}
                                                                    </p>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-brand-text/40">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 ring-inset ring-warning/40 bg-warning/[0.03]" /> Obligatorio sin asignar</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-danger bg-danger/25" /> Noche→Día sin descanso (permitido)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 ring-inset ring-danger/60 bg-danger/[0.05]" /> Solapamiento (no debería ocurrir)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-bg/60 border border-brand-border" /> Fin de semana</span>
            </div>

            {/* Popover de celda */}
            {celdaSel && (
                <CeldaPopover
                    puesto={puestos.find(p => p.id === celdaSel.puestoId)!}
                    fecha={celdaSel.fecha}
                    fechaLabel={celdaSel.fechaLabel}
                    asignacionesCelda={porCelda.get(cellKey(celdaSel.fecha, celdaSel.puestoId)) || []}
                    asignacionesMes={asignaciones}
                    puestos={puestos}
                    professionals={professionals}
                    onAsignar={handleAsignar}
                    onQuitar={handleQuitar}
                    onRellenarSemana={handleRellenarSemana}
                    onClose={() => setCeldaSel(null)}
                />
            )}
        </div>
    );
};
