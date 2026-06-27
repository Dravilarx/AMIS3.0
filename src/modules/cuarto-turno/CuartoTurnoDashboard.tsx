import React, { useState, useEffect } from 'react';
import {
    Clock, Loader2, Play, CheckCircle2, Lock, Plus, X,
    AlertTriangle, Timer, ShieldAlert, Wrench, User, ChevronRight,
    Sun, Moon, Zap, History,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useCuartoTurno, type Catalogo, type Turno } from '../../hooks/useCuartoTurno';
import { HistorialTurnos } from './HistorialTurnos';
import { TurnoDetalle } from './TurnoDetalle';

const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';
const sensitiveLbl = cn(labelCls, 'flex items-center gap-1.5 text-warning/70');

const SEVERIDAD_STYLE: Record<string, string> = {
    'Baja':    'text-brand-text/60 bg-brand-border/20 border-brand-border/40',
    'Media':   'text-info    bg-info/10    border-info/20',
    'Alta':    'text-warning bg-warning/10 border-warning/20',
    'Crítica': 'text-danger  bg-danger/10  border-danger/20',
};

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Horario automático según tipo de turno; editable solo para tipos sin horario fijo (Contingencia).
const horarioPorTipo = (valor: string): { inicio: string; fin: string; editable: boolean } => {
    const v = norm(valor);
    if (v.includes('noche')) return { inicio: '20:00', fin: '08:00', editable: false };
    if (v.includes('dia'))   return { inicio: '08:00', fin: '20:00', editable: false };
    return { inicio: '', fin: '', editable: true };
};

const iconTipo = (valor: string) => {
    const v = norm(valor);
    if (v.includes('noche')) return Moon;
    if (v.includes('dia'))   return Sun;
    return Zap;
};

const fmtFecha = (iso?: string) =>
    iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SelectCat: React.FC<{ value: string; onChange: (v: string) => void; options: Catalogo[]; label: string }> =
    ({ value, onChange, options, label }) => (
        <div className="space-y-1.5">
            <label className={labelCls}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} disabled={options.length === 0}
                className={inputCls + ' appearance-none disabled:opacity-50'}>
                <option value="">{options.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                {options.map(c => <option key={c.id} value={c.valor}>{c.valor}</option>)}
            </select>
        </div>
    );

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40', checked ? 'bg-brand-primary' : 'bg-brand-border')}>
        <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
    </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 1) ABRIR TURNO
// ═══════════════════════════════════════════════════════════════════════════════
const AbrirTurno: React.FC<{
    tiposTurno: Catalogo[];
    addTurno: (p: any) => Promise<{ success: boolean; error: any }>;
}> = ({ tiposTurno, addTurno }) => {
    const [tipo, setTipo]     = useState('');
    const [fecha, setFecha]   = useState(new Date().toISOString().slice(0, 10));
    const [inicio, setInicio] = useState('');
    const [fin, setFin]       = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState<string | null>(null);

    const editable = tipo ? horarioPorTipo(tipo).editable : false;

    const elegirTipo = (v: string) => {
        setTipo(v);
        const h = horarioPorTipo(v);
        setInicio(h.inicio);
        setFin(h.fin);
    };

    const confirmar = async () => {
        if (!tipo) { setError('Selecciona el tipo de turno.'); return; }
        setSaving(true); setError(null);
        const { success, error: err } = await addTurno({
            fecha, tipoTurno: tipo, horaInicio: inicio || undefined, horaFin: fin || undefined, estado: 'abierto',
        });
        setSaving(false);
        if (!success) setError(err?.message || 'No se pudo abrir el turno.');
    };

    return (
        <div className="max-w-lg mx-auto mt-6 animate-in fade-in duration-500">
            <div className="rounded-3xl border border-brand-border bg-brand-surface/40 p-6 space-y-6">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-3">
                        <Play className="w-6 h-6 text-brand-primary" />
                    </div>
                    <h2 className="text-xl font-black text-brand-text">Abrir turno</h2>
                    <p className="text-xs text-brand-text/40 mt-1">No tienes un turno abierto. Abre uno para empezar a registrar.</p>
                </div>

                {/* Tipo de turno */}
                <div className="space-y-2">
                    <label className={labelCls}>Tipo de turno</label>
                    <div className="grid grid-cols-3 gap-2">
                        {tiposTurno.length === 0 ? (
                            <p className="col-span-3 text-[11px] text-warning/70 text-center py-3 border border-warning/20 bg-warning/5 rounded-xl">Sin tipos de turno en el catálogo.</p>
                        ) : tiposTurno.map(t => {
                            const Icon = iconTipo(t.valor);
                            const active = tipo === t.valor;
                            return (
                                <button key={t.id} type="button" onClick={() => elegirTipo(t.valor)}
                                    className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all',
                                        active ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-surface border-brand-border text-brand-text/50 hover:text-brand-text')}>
                                    <Icon className="w-4 h-4" /> {t.valor}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Fecha + horario */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <label className={labelCls}>Fecha</label>
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={cn(labelCls, 'flex items-center gap-1')}>Inicio {!editable && tipo && <Lock className="w-2.5 h-2.5" />}</label>
                        <input type="time" value={inicio} onChange={e => setInicio(e.target.value)} disabled={!editable} className={inputCls + ' disabled:opacity-70'} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={cn(labelCls, 'flex items-center gap-1')}>Fin {!editable && tipo && <Lock className="w-2.5 h-2.5" />}</label>
                        <input type="time" value={fin} onChange={e => setFin(e.target.value)} disabled={!editable} className={inputCls + ' disabled:opacity-70'} />
                    </div>
                </div>
                {tipo && !editable && (
                    <p className="text-[10px] text-brand-text/40 -mt-2">Horario automático según el tipo de turno.</p>
                )}

                {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[11px] font-bold text-center">{error}</div>}

                <button onClick={confirmar} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {saving ? 'Abriendo…' : 'Abrir turno'}
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque de incidencia (formulario inline reutilizable por sección)
// ═══════════════════════════════════════════════════════════════════════════════
const IncSection: React.FC<{
    title: string; icon: React.ElementType; count: number; children: React.ReactNode;
    formRender: (cerrar: () => void) => React.ReactNode; disabled?: boolean;
}> = ({ title, icon: Icon, count, children, formRender, disabled }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl border border-brand-border bg-brand-surface/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-xs font-black uppercase tracking-wide text-brand-text">{title}</h3>
                    <span className="text-[10px] font-mono text-brand-text/30">{count}</span>
                </div>
                {!disabled && (
                    <button onClick={() => setOpen(o => !o)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[9px] font-black uppercase tracking-wider hover:bg-brand-primary/20 transition-all">
                        {open ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />} {open ? 'Cerrar' : 'Agregar'}
                    </button>
                )}
            </div>
            {open && !disabled && <div className="p-4 border-b border-brand-border bg-brand-bg/30">{formRender(() => setOpen(false))}</div>}
            <div className="divide-y divide-brand-border/40">{children}</div>
        </div>
    );
};

const SubmitRow: React.FC<{ saving: boolean; onCancel: () => void }> = ({ saving, onCancel }) => (
    <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-brand-border text-brand-text/60 text-[10px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Guardar
        </button>
    </div>
);

const SevBadge: React.FC<{ sev?: string }> = ({ sev }) => sev ? (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', SEVERIDAD_STYLE[sev] ?? 'text-brand-text/50 border-brand-border')}>{sev}</span>
) : null;

// ═══════════════════════════════════════════════════════════════════════════════
// 2) TURNO ACTIVO (panel + incidencias + contadores + cerrar)
// ═══════════════════════════════════════════════════════════════════════════════
const TurnoActivo: React.FC<{ turno: Turno; ct: ReturnType<typeof useCuartoTurno>; tecnologoNombre: string }> =
    ({ turno, ct, tecnologoNombre }) => {
    const cerrado = (turno.estado ?? 'abierto') === 'cerrado';
    const TipoIcon = iconTipo(turno.tipoTurno);

    // ── Contadores del turno (editable salvo cerrado) ──
    const [cont, setCont] = useState({
        recibidos: '', recibidosFueraPlazo: '', entregados: '', entregadosFueraPlazo: '',
        estabilizado: false, horaEstabilizacion: '', apoyoMedicoExtra: false, observaciones: '',
    });
    useEffect(() => {
        setCont({
            recibidos:            turno.recibidos?.toString() ?? '',
            recibidosFueraPlazo:  turno.recibidosFueraPlazo?.toString() ?? '',
            entregados:           turno.entregados?.toString() ?? '',
            entregadosFueraPlazo: turno.entregadosFueraPlazo?.toString() ?? '',
            estabilizado:         turno.estabilizado ?? false,
            horaEstabilizacion:   turno.horaEstabilizacion ?? '',
            apoyoMedicoExtra:     turno.apoyoMedicoExtra ?? false,
            observaciones:        turno.observaciones ?? '',
        });
    }, [turno.id]);
    const setC = (k: string, v: any) => setCont(p => ({ ...p, [k]: v }));
    const numOrNull = (s: string) => s === '' ? null : Number(s);

    const [savingCont, setSavingCont] = useState(false);
    const guardarContadores = async () => {
        setSavingCont(true);
        await ct.updateTurno(turno.id, {
            recibidos: numOrNull(cont.recibidos), recibidosFueraPlazo: numOrNull(cont.recibidosFueraPlazo),
            entregados: numOrNull(cont.entregados), entregadosFueraPlazo: numOrNull(cont.entregadosFueraPlazo),
            estabilizado: cont.estabilizado, horaEstabilizacion: cont.horaEstabilizacion || null,
            apoyoMedicoExtra: cont.apoyoMedicoExtra, observaciones: cont.observaciones || null,
        });
        setSavingCont(false);
    };

    // ── Cerrar turno ──
    const [showCerrar, setShowCerrar] = useState(false);
    const [closing, setClosing] = useState(false);
    const confirmarCierre = async () => {
        setClosing(true);
        await ct.closeTurno(turno.id, {
            recibidos: numOrNull(cont.recibidos), recibidosFueraPlazo: numOrNull(cont.recibidosFueraPlazo),
            entregados: numOrNull(cont.entregados), entregadosFueraPlazo: numOrNull(cont.entregadosFueraPlazo),
            estabilizado: cont.estabilizado, horaEstabilizacion: cont.horaEstabilizacion || null,
            observaciones: cont.observaciones || null,
        });
        setClosing(false);
        setShowCerrar(false);
    };

    // Incidencias de ESTE turno
    const personalT = ct.incidencias.filter(i => i.idTurno === turno.id);
    const slaT       = ct.slaDesviaciones.filter(i => i.idTurno === turno.id);
    const criticosT  = ct.casosCriticos.filter(i => i.idTurno === turno.id);
    const tecnicasT  = ct.incidTecnicas.filter(i => i.idTurno === turno.id);

    return (
        <div className="space-y-6">
            {/* Cabecera del turno activo */}
            <div className={cn('rounded-3xl border p-5', cerrado ? 'border-brand-border bg-brand-surface/40' : 'border-brand-primary/30 bg-brand-primary/5')}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center border', cerrado ? 'bg-brand-surface border-brand-border text-brand-text/40' : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary')}>
                            <TipoIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-brand-text">Turno {turno.tipoTurno}</h2>
                                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', cerrado ? 'text-brand-text/50 bg-brand-border/20 border-brand-border/40' : 'text-success bg-success/10 border-success/20')}>
                                    {cerrado ? 'Cerrado' : 'Abierto'}
                                </span>
                            </div>
                            <p className="text-xs text-brand-text/50 mt-0.5">
                                {fmtFecha(turno.fecha)} · {turno.horaInicio ?? '?'}–{turno.horaFin ?? '?'}
                            </p>
                            <p className="text-[10px] text-brand-text/40 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" /> Tecnólogo: {tecnologoNombre}</p>
                        </div>
                    </div>
                    {!cerrado && (
                        <button onClick={() => setShowCerrar(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-text text-brand-bg rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all">
                            <CheckCircle2 className="w-4 h-4" /> Cerrar / validar turno
                        </button>
                    )}
                </div>
            </div>

            {/* Panel de contadores */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface/40 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wide text-brand-text/60">Contadores del turno</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5"><label className={labelCls}>Recibidos</label><input type="number" min={0} value={cont.recibidos} onChange={e => setC('recibidos', e.target.value)} disabled={cerrado} className={inputCls + ' disabled:opacity-60'} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>Recibidos f/plazo</label><input type="number" min={0} value={cont.recibidosFueraPlazo} onChange={e => setC('recibidosFueraPlazo', e.target.value)} disabled={cerrado} className={inputCls + ' disabled:opacity-60'} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>Entregados</label><input type="number" min={0} value={cont.entregados} onChange={e => setC('entregados', e.target.value)} disabled={cerrado} className={inputCls + ' disabled:opacity-60'} /></div>
                    <div className="space-y-1.5"><label className={labelCls}>Entregados f/plazo</label><input type="number" min={0} value={cont.entregadosFueraPlazo} onChange={e => setC('entregadosFueraPlazo', e.target.value)} disabled={cerrado} className={inputCls + ' disabled:opacity-60'} /></div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2"><Switch checked={cont.estabilizado} onChange={v => setC('estabilizado', v)} disabled={cerrado} /><span className="text-xs font-bold text-brand-text">Estabilizado</span></div>
                    {cont.estabilizado && (
                        <div className="flex items-center gap-2"><label className={labelCls}>Hora estab.</label><input type="time" value={cont.horaEstabilizacion} onChange={e => setC('horaEstabilizacion', e.target.value)} disabled={cerrado} className={inputCls + ' w-32 disabled:opacity-60'} /></div>
                    )}
                    <div className="flex items-center gap-2"><Switch checked={cont.apoyoMedicoExtra} onChange={v => setC('apoyoMedicoExtra', v)} disabled={cerrado} /><span className="text-xs font-bold text-brand-text">Apoyo médico extra</span></div>
                </div>
                <div className="space-y-1.5"><label className={labelCls}>Observaciones</label><textarea rows={2} value={cont.observaciones} onChange={e => setC('observaciones', e.target.value)} disabled={cerrado} className={inputCls + ' resize-none disabled:opacity-60'} /></div>
                {!cerrado && (
                    <div className="flex justify-end">
                        <button onClick={guardarContadores} disabled={savingCont} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                            {savingCont ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Guardar contadores
                        </button>
                    </div>
                )}
            </div>

            {/* Secciones de incidencias (heredan id_turno y fecha del turno) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PERSONAL */}
                <IncSection title="Incidencias de Personal" icon={AlertTriangle} count={personalT.length} disabled={cerrado}
                    formRender={(cerrar) => <FormPersonal ct={ct} turno={turno} onDone={cerrar} />}>
                    {personalT.map(i => (
                        <div key={i.id} className="px-4 py-2.5 flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-xs text-brand-text/80 truncate">{i.tipoIncidencia || '—'}{i.medico ? ` · ${i.medico}` : ''}{i.detalle ? ` — ${i.detalle}` : ''}</span>
                            <SevBadge sev={i.severidad} />
                        </div>
                    ))}
                    {personalT.length === 0 && <p className="px-4 py-3 text-[11px] text-brand-text/30">Sin incidencias.</p>}
                </IncSection>

                {/* SLA */}
                <IncSection title="Desviaciones SLA" icon={Timer} count={slaT.length} disabled={cerrado}
                    formRender={(cerrar) => <FormSla ct={ct} turno={turno} onDone={cerrar} />}>
                    {slaT.map(i => (
                        <div key={i.id} className="px-4 py-2.5 flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-xs text-brand-text/80 truncate">{i.tipoDesviacion || '—'}{i.medico ? ` · ${i.medico}` : ''}{i.minutosExceso != null ? ` · +${i.minutosExceso}min` : ''}</span>
                            <SevBadge sev={i.severidad} />
                        </div>
                    ))}
                    {slaT.length === 0 && <p className="px-4 py-3 text-[11px] text-brand-text/30">Sin desviaciones.</p>}
                </IncSection>

                {/* CRÍTICOS */}
                <IncSection title="Casos Críticos" icon={ShieldAlert} count={criticosT.length} disabled={cerrado}
                    formRender={(cerrar) => <FormCritico ct={ct} turno={turno} onDone={cerrar} />}>
                    {criticosT.map(i => (
                        <div key={i.id} className="px-4 py-2.5 flex items-center gap-2">
                            {/* PRIVACIDAD: nunca se muestra paciente ni rut */}
                            <span className="flex-1 min-w-0 text-xs text-brand-text/80 truncate">{i.institucion || '—'}{i.modalidad ? ` · ${i.modalidad}` : ''}{i.minutosRetraso != null ? ` · ${i.minutosRetraso}min` : ''}</span>
                            {i.fueraPlazo && <span className="text-[9px] font-black px-2 py-0.5 rounded-full border text-danger bg-danger/10 border-danger/20 uppercase">Fuera de plazo</span>}
                        </div>
                    ))}
                    {criticosT.length === 0 && <p className="px-4 py-3 text-[11px] text-brand-text/30">Sin casos.</p>}
                </IncSection>

                {/* TÉCNICAS */}
                <IncSection title="Incidencias Técnicas" icon={Wrench} count={tecnicasT.length} disabled={cerrado}
                    formRender={(cerrar) => <FormTecnica ct={ct} turno={turno} onDone={cerrar} />}>
                    {tecnicasT.map(i => (
                        <div key={i.id} className="px-4 py-2.5 flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-xs text-brand-text/80 truncate">{i.categoriaTecnica || '—'}{i.sistema ? ` · ${i.sistema}` : ''}{i.estado ? ` · ${i.estado}` : ''}</span>
                            <SevBadge sev={i.severidad} />
                        </div>
                    ))}
                    {tecnicasT.length === 0 && <p className="px-4 py-3 text-[11px] text-brand-text/30">Sin incidencias.</p>}
                </IncSection>
            </div>

            {/* Modal cierre */}
            {showCerrar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
                            <h2 className="text-base font-black text-brand-text">Cerrar / validar turno</h2>
                            <button onClick={() => setShowCerrar(false)} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-6 py-5 space-y-3">
                            <p className="text-xs text-brand-text/50">Confirma el resumen final. Una vez cerrado, el turno queda de solo lectura.</p>
                            <div className="rounded-2xl border border-brand-border bg-brand-surface/40 p-4 grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-brand-text/40 text-xs">Recibidos</span><span className="text-brand-text font-bold text-right">{cont.recibidos || 0}{cont.recibidosFueraPlazo ? ` (${cont.recibidosFueraPlazo} f/p)` : ''}</span>
                                <span className="text-brand-text/40 text-xs">Entregados</span><span className="text-brand-text font-bold text-right">{cont.entregados || 0}{cont.entregadosFueraPlazo ? ` (${cont.entregadosFueraPlazo} f/p)` : ''}</span>
                                <span className="text-brand-text/40 text-xs">Estabilizado</span><span className="text-brand-text font-bold text-right">{cont.estabilizado ? `Sí${cont.horaEstabilizacion ? ` · ${cont.horaEstabilizacion}` : ''}` : 'No'}</span>
                                <span className="text-brand-text/40 text-xs">Incidencias</span><span className="text-brand-text font-bold text-right">{personalT.length + slaT.length + criticosT.length + tecnicasT.length}</span>
                            </div>
                            {cont.observaciones && <p className="text-xs text-brand-text/60 italic">"{cont.observaciones}"</p>}
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setShowCerrar(false)} className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">Cancelar</button>
                                <button onClick={confirmarCierre} disabled={closing} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-text text-brand-bg text-[11px] font-black uppercase tracking-wider hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50">
                                    {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar cierre
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Formularios de incidencia (heredan id_turno + fecha del turno) ────────────
const FormPersonal: React.FC<{ ct: any; turno: Turno; onDone: () => void }> = ({ ct, turno, onDone }) => {
    const [f, setF] = useState({ tipoIncidencia: '', medico: '', bloqueHorario: '', minutosAtraso: '', causa: '', severidad: '', detalle: '' });
    const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);
    const esTardio = norm(f.tipoIncidencia).includes('ingreso tardio');
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { success } = await ct.addIncidencia({
            idTurno: turno.id, fecha: turno.fecha, medico: f.medico || undefined, bloqueHorario: f.bloqueHorario || undefined,
            tipoIncidencia: f.tipoIncidencia || undefined, minutosAtraso: esTardio && f.minutosAtraso ? Number(f.minutosAtraso) : undefined,
            causa: f.causa || undefined, severidad: f.severidad || undefined, detalle: f.detalle || undefined,
        });
        setSaving(false); if (success) onDone();
    };
    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <SelectCat label="Tipo de incidencia" value={f.tipoIncidencia} onChange={v => set('tipoIncidencia', v)} options={ct.tiposIncidencia} />
                {esTardio
                    ? <div className="space-y-1.5"><label className={labelCls}>Minutos de atraso</label><input type="number" min={1} value={f.minutosAtraso} onChange={e => set('minutosAtraso', e.target.value)} className={inputCls} /></div>
                    : <div className="space-y-1.5"><label className={labelCls}>Médico</label><input type="text" value={f.medico} onChange={e => set('medico', e.target.value)} className={inputCls} /></div>}
            </div>
            {esTardio && <div className="space-y-1.5"><label className={labelCls}>Médico</label><input type="text" value={f.medico} onChange={e => set('medico', e.target.value)} className={inputCls} /></div>}
            <div className="grid grid-cols-2 gap-3">
                <SelectCat label="Causa" value={f.causa} onChange={v => set('causa', v)} options={ct.causas} />
                <SelectCat label="Severidad" value={f.severidad} onChange={v => set('severidad', v)} options={ct.severidades} />
            </div>
            <div className="space-y-1.5"><label className={labelCls}>Bloque horario</label><input type="text" value={f.bloqueHorario} onChange={e => set('bloqueHorario', e.target.value)} placeholder="ej. 20:00–00:00" className={inputCls} /></div>
            <div className="space-y-1.5"><label className={labelCls}>Detalle</label><textarea rows={2} value={f.detalle} onChange={e => set('detalle', e.target.value)} className={inputCls + ' resize-none'} /></div>
            <SubmitRow saving={saving} onCancel={onDone} />
        </form>
    );
};

const FormSla: React.FC<{ ct: any; turno: Turno; onDone: () => void }> = ({ ct, turno, onDone }) => {
    const [f, setF] = useState({ medico: '', tipoDesviacion: '', modalidad: '', minutosExceso: '', severidad: '', detalle: '' });
    const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { success } = await ct.addSlaDesviacion({
            idTurno: turno.id, fecha: turno.fecha, medico: f.medico || undefined, tipoDesviacion: f.tipoDesviacion || undefined,
            modalidad: f.modalidad || undefined, minutosExceso: f.minutosExceso ? Number(f.minutosExceso) : undefined,
            severidad: f.severidad || undefined, detalle: f.detalle || undefined,
        });
        setSaving(false); if (success) onDone();
    };
    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <SelectCat label="Tipo de desviación" value={f.tipoDesviacion} onChange={v => set('tipoDesviacion', v)} options={ct.tiposDesviacion} />
                <SelectCat label="Modalidad" value={f.modalidad} onChange={v => set('modalidad', v)} options={ct.modalidades} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className={labelCls}>Médico</label><input type="text" value={f.medico} onChange={e => set('medico', e.target.value)} className={inputCls} /></div>
                <div className="space-y-1.5"><label className={labelCls}>Minutos de exceso</label><input type="number" min={0} value={f.minutosExceso} onChange={e => set('minutosExceso', e.target.value)} className={inputCls} /></div>
            </div>
            <SelectCat label="Severidad" value={f.severidad} onChange={v => set('severidad', v)} options={ct.severidades} />
            <div className="space-y-1.5"><label className={labelCls}>Detalle</label><textarea rows={2} value={f.detalle} onChange={e => set('detalle', e.target.value)} className={inputCls + ' resize-none'} /></div>
            <SubmitRow saving={saving} onCancel={onDone} />
        </form>
    );
};

const FormCritico: React.FC<{ ct: any; turno: Turno; onDone: () => void }> = ({ ct, turno, onDone }) => {
    const [f, setF] = useState({ institucion: '', modalidad: '', idEstudio: '', paciente: '', rut: '', fueraPlazo: false, minutosRetraso: '', medicoResponsable: '', detalle: '' });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { success } = await ct.addCasoCritico({
            idTurno: turno.id, fecha: turno.fecha, institucion: f.institucion || undefined, modalidad: f.modalidad || undefined,
            idEstudio: f.idEstudio || undefined, paciente: f.paciente || undefined, rut: f.rut || undefined,
            fueraPlazo: f.fueraPlazo, minutosRetraso: f.minutosRetraso ? Number(f.minutosRetraso) : undefined,
            medicoResponsable: f.medicoResponsable || undefined, detalle: f.detalle || undefined,
        });
        setSaving(false); if (success) onDone();
    };
    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className={labelCls}>Institución</label><input type="text" value={f.institucion} onChange={e => set('institucion', e.target.value)} className={inputCls} /></div>
                <SelectCat label="Modalidad" value={f.modalidad} onChange={v => set('modalidad', v)} options={ct.modalidades} />
            </div>
            <div className="space-y-1.5"><label className={labelCls}>N° Estudio</label><input type="text" value={f.idEstudio} onChange={e => set('idEstudio', e.target.value)} className={inputCls} /></div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
                <Lock className="w-3.5 h-3.5 text-warning/70 shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-warning/60">Paciente y RUT son datos sensibles — no se muestran en estadística</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className={sensitiveLbl}><Lock className="w-3 h-3" /> Paciente</label><input type="text" value={f.paciente} onChange={e => set('paciente', e.target.value)} autoComplete="off" className={inputCls} /></div>
                <div className="space-y-1.5"><label className={sensitiveLbl}><Lock className="w-3 h-3" /> RUT</label><input type="text" value={f.rut} onChange={e => set('rut', e.target.value)} autoComplete="off" className={inputCls} /></div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={f.fueraPlazo} onChange={v => set('fueraPlazo', v)} /><span className="text-xs font-bold text-brand-text">Fuera de plazo</span></div>
                <div className="flex items-center gap-2 flex-1"><label className={labelCls}>Min. retraso</label><input type="number" min={0} value={f.minutosRetraso} onChange={e => set('minutosRetraso', e.target.value)} className={inputCls} /></div>
            </div>
            <div className="space-y-1.5"><label className={labelCls}>Médico responsable</label><input type="text" value={f.medicoResponsable} onChange={e => set('medicoResponsable', e.target.value)} className={inputCls} /></div>
            <div className="space-y-1.5"><label className={labelCls}>Detalle</label><textarea rows={2} value={f.detalle} onChange={e => set('detalle', e.target.value)} className={inputCls + ' resize-none'} /></div>
            <SubmitRow saving={saving} onCancel={onDone} />
        </form>
    );
};

const FormTecnica: React.FC<{ ct: any; turno: Turno; onDone: () => void }> = ({ ct, turno, onDone }) => {
    const [f, setF] = useState({ categoriaTecnica: '', centroAfectado: '', sistema: '', estado: '', severidad: '', detalle: '', accionTomada: '' });
    const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { success } = await ct.addIncidTecnica({
            idTurno: turno.id, fecha: turno.fecha, categoriaTecnica: f.categoriaTecnica || undefined, centroAfectado: f.centroAfectado || undefined,
            sistema: f.sistema || undefined, estado: f.estado || undefined, severidad: f.severidad || undefined,
            detalle: f.detalle || undefined, accionTomada: f.accionTomada || undefined,
        });
        setSaving(false); if (success) onDone();
    };
    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <SelectCat label="Categoría técnica" value={f.categoriaTecnica} onChange={v => set('categoriaTecnica', v)} options={ct.categoriasTecnicas} />
                <SelectCat label="Estado" value={f.estado} onChange={v => set('estado', v)} options={ct.estadosIncidencia} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className={labelCls}>Centro afectado</label><input type="text" value={f.centroAfectado} onChange={e => set('centroAfectado', e.target.value)} className={inputCls} /></div>
                <div className="space-y-1.5"><label className={labelCls}>Sistema</label><input type="text" value={f.sistema} onChange={e => set('sistema', e.target.value)} className={inputCls} /></div>
            </div>
            <SelectCat label="Severidad" value={f.severidad} onChange={v => set('severidad', v)} options={ct.severidades} />
            <div className="space-y-1.5"><label className={labelCls}>Detalle</label><textarea rows={2} value={f.detalle} onChange={e => set('detalle', e.target.value)} className={inputCls + ' resize-none'} /></div>
            <div className="space-y-1.5"><label className={labelCls}>Acción tomada</label><textarea rows={2} value={f.accionTomada} onChange={e => set('accionTomada', e.target.value)} className={inputCls + ' resize-none'} /></div>
            <SubmitRow saving={saving} onCancel={onDone} />
        </form>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export const CuartoTurnoDashboard: React.FC = () => {
    const ct = useCuartoTurno();
    const { user } = useAuth();
    const [verHistorial, setVerHistorial] = useState(false);
    const [detalleId, setDetalleId] = useState<string | null>(null);

    const tecnologoNombre = (ct.userId && ct.tecnologos[ct.userId]?.fullName)
        || user?.name || user?.email || 'Yo';

    const resolveTecnologo = (id?: string) => {
        if (!id) return '—';
        const t = ct.tecnologos[id];
        return t?.fullName || t?.email || '—';
    };

    // Vista de detalle de turno (página completa)
    if (detalleId) {
        return <TurnoDetalle turnoId={detalleId} onVolver={() => setDetalleId(null)} />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-brand-text flex items-center gap-2"><Clock className="w-6 h-6 text-brand-primary" /> 4° Turno</h1>
                    <p className="text-brand-text/40 text-sm">Registro por sesión de turno</p>
                </div>
                <button onClick={() => setVerHistorial(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-brand-text/60 text-[10px] font-black uppercase tracking-wider hover:text-brand-text hover:border-brand-primary/30 transition-all">
                    <History className="w-4 h-4" /> {verHistorial ? 'Ocultar historial' : 'Ver historial'} <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', verHistorial && 'rotate-90')} />
                </button>
            </div>

            {ct.loading && !ct.turnoActivo ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : ct.turnoActivo ? (
                <TurnoActivo turno={ct.turnoActivo} ct={ct} tecnologoNombre={tecnologoNombre} />
            ) : (
                <AbrirTurno tiposTurno={ct.tiposTurno} addTurno={ct.addTurno} />
            )}

            {verHistorial && (
                <HistorialTurnos
                    turnos={ct.turnos}
                    loading={ct.loading}
                    resolveTecnologo={resolveTecnologo}
                    onOpen={setDetalleId}
                />
            )}
        </div>
    );
};
