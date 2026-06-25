import React, { useState } from 'react';
import {
    Plus, X, Loader2, Clock, CalendarDays, CheckCircle2,
    Users, ArrowUpDown, Activity, ChevronRight, AlertTriangle, Timer,
    ShieldAlert, Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCuartoTurno, type Turno, type Incidencia, type SlaDesviacion, type CasoCritico, type IncidenciaTecnica, type Catalogo } from '../../hooks/useCuartoTurno';

// ─── Toggle switch ────────────────────────────────────────────────────────────
const Switch: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: string;
}> = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40',
                checked ? 'bg-brand-primary' : 'bg-brand-border'
            )}
        >
            <span className={cn(
                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                checked ? 'translate-x-4' : 'translate-x-0'
            )} />
        </button>
        {label && (
            <span className={cn(
                'text-xs font-bold transition-colors',
                checked ? 'text-brand-primary' : 'text-brand-text/50'
            )}>
                {label}
            </span>
        )}
    </label>
);

// ─── Formulario de nuevo turno ────────────────────────────────────────────────
const NuevoTurnoModal: React.FC<{
    onClose:    () => void;
    onSuccess:  () => void;
    tiposTurno: import('../../hooks/useCuartoTurno').Catalogo[];
    addTurno:   (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, tiposTurno, addTurno }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const [form, setForm] = useState({
        fecha:                   new Date().toISOString().split('T')[0],
        tipoTurno:               '',
        horaInicio:              '',
        horaFin:                 '',
        estabilizado:            false,
        horaEstabilizacion:      '',
        apoyoMedicoExtra:        false,
        recibidos:               '0',
        recibidosFueraPlazo:     '0',
        recibidosPendientes:     '0',
        entregados:              '0',
        entregadosFueraPlazo:    '0',
        entregadosPendientes:    '0',
        observaciones:           '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.tipoTurno) { setError('Selecciona un tipo de turno.'); return; }
        setSaving(true);
        setError(null);

        const toInt = (v: string) => v !== '' ? parseInt(v, 10) : undefined;

        const { success, error: err } = await addTurno({
            fecha:                  form.fecha,
            tipoTurno:              form.tipoTurno,
            horaInicio:             form.horaInicio          || undefined,
            horaFin:                form.horaFin             || undefined,
            estabilizado:           form.estabilizado,
            horaEstabilizacion:     form.estabilizado ? (form.horaEstabilizacion || undefined) : undefined,
            apoyoMedicoExtra:       form.apoyoMedicoExtra,
            recibidos:              toInt(form.recibidos),
            recibidosFueraPlazo:    toInt(form.recibidosFueraPlazo),
            recibidosPendientes:    toInt(form.recibidosPendientes),
            entregados:             toInt(form.entregados),
            entregadosFueraPlazo:   toInt(form.entregadosFueraPlazo),
            entregadosPendientes:   toInt(form.entregadosPendientes),
            observaciones:          form.observaciones || undefined,
        });

        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar el turno.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nuevo Turno</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">4° Turno — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Fecha + Tipo turno */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" /> Fecha
                            </label>
                            <input
                                type="date"
                                required
                                value={form.fecha}
                                onChange={e => set('fecha', e.target.value)}
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">Tipo de Turno</label>
                            <select
                                required
                                value={form.tipoTurno}
                                onChange={e => set('tipoTurno', e.target.value)}
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 appearance-none"
                            >
                                <option value="">Seleccionar...</option>
                                {tiposTurno.map(t => (
                                    <option key={t.id} value={t.valor}>{t.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hora inicio + fin */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Hora inicio
                            </label>
                            <input
                                type="time"
                                value={form.horaInicio}
                                onChange={e => set('horaInicio', e.target.value)}
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Hora fin
                            </label>
                            <input
                                type="time"
                                value={form.horaFin}
                                onChange={e => set('horaFin', e.target.value)}
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                            />
                        </div>
                    </div>

                    {/* Bloque Recibidos */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> Recibidos
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { key: 'recibidos',           label: 'Total'          },
                                { key: 'recibidosFueraPlazo', label: 'Fuera de plazo' },
                                { key: 'recibidosPendientes', label: 'Pendientes'     },
                            ].map(({ key, label }) => (
                                <div key={key} className="space-y-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-text/30">{label}</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={(form as any)[key]}
                                        onChange={e => set(key, e.target.value)}
                                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bloque Entregados */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                            <ArrowUpDown className="w-3 h-3" /> Entregados
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { key: 'entregados',           label: 'Total'          },
                                { key: 'entregadosFueraPlazo', label: 'Fuera de plazo' },
                                { key: 'entregadosPendientes', label: 'Pendientes'     },
                            ].map(({ key, label }) => (
                                <div key={key} className="space-y-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-text/30">{label}</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={(form as any)[key]}
                                        onChange={e => set(key, e.target.value)}
                                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 text-center"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Switches */}
                    <div className="flex flex-col gap-4 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                        <div className="flex flex-col gap-3">
                            <Switch
                                checked={form.estabilizado}
                                onChange={v => set('estabilizado', v)}
                                label="Turno estabilizado"
                            />
                            {form.estabilizado && (
                                <div className="ml-1 space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> Hora de estabilización
                                    </label>
                                    <input
                                        type="time"
                                        value={form.horaEstabilizacion}
                                        onChange={e => set('horaEstabilizacion', e.target.value)}
                                        className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                                    />
                                </div>
                            )}
                        </div>
                        <Switch
                            checked={form.apoyoMedicoExtra}
                            onChange={v => set('apoyoMedicoExtra', v)}
                            label="Apoyo médico extra"
                        />
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">Observaciones</label>
                        <textarea
                            rows={3}
                            value={form.observaciones}
                            onChange={e => set('observaciones', e.target.value)}
                            placeholder="Notas del turno..."
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none resize-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 placeholder:text-brand-text/20"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                            <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar Turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Modal nueva incidencia ───────────────────────────────────────────────────
const NuevaIncidenciaModal: React.FC<{
    onClose:         () => void;
    onSuccess:       () => void;
    turnos:          Turno[];
    tiposIncidencia: Catalogo[];
    causas:          Catalogo[];
    severidades:     Catalogo[];
    addIncidencia:   (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, turnos, tiposIncidencia, causas, severidades, addIncidencia }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const [form, setForm] = useState({
        idTurno:        '',
        fecha:          new Date().toISOString().split('T')[0],
        medico:         '',
        bloqueHorario:  '',
        tipoIncidencia: '',
        minutosAtraso:  '',
        causa:          '',
        severidad:      '',
        detalle:        '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.idTurno) { setError('Selecciona el turno al que pertenece la incidencia.'); return; }
        setSaving(true);
        setError(null);

        const { success, error: err } = await addIncidencia({
            idTurno:        form.idTurno         || undefined,
            fecha:          form.fecha           || undefined,
            medico:         form.medico          || undefined,
            bloqueHorario:  form.bloqueHorario   || undefined,
            tipoIncidencia: form.tipoIncidencia  || undefined,
            minutosAtraso:  form.tipoIncidencia === 'Ingreso tardío' && form.minutosAtraso
                                ? parseInt(form.minutosAtraso, 10) : undefined,
            causa:          form.causa           || undefined,
            severidad:      form.severidad       || undefined,
            detalle:        form.detalle         || undefined,
        });

        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar la incidencia.');
    };

    const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
    const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nueva Incidencia</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">Personal — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Turno + Fecha */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                            <label className={labelCls}>Turno *</label>
                            <select
                                required
                                value={form.idTurno}
                                onChange={e => set('idTurno', e.target.value)}
                                className={inputCls + ' appearance-none'}
                            >
                                <option value="">Seleccionar turno...</option>
                                {turnos.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.fecha} — {t.tipoTurno}{t.horaInicio ? ` (${t.horaInicio.slice(0,5)})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><CalendarDays className="w-3 h-3" /> Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Bloque horario</label>
                            <input type="text" value={form.bloqueHorario} onChange={e => set('bloqueHorario', e.target.value)}
                                placeholder="ej. 23:00-02:00" className={inputCls} />
                        </div>
                    </div>

                    {/* Médico */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Médico</label>
                        <input type="text" value={form.medico} onChange={e => set('medico', e.target.value)}
                            placeholder="Nombre del médico" className={inputCls} />
                    </div>

                    {/* Tipo incidencia + minutos atraso */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Tipo de incidencia</label>
                        <select value={form.tipoIncidencia} onChange={e => set('tipoIncidencia', e.target.value)}
                            disabled={tiposIncidencia.length === 0}
                            className={inputCls + ' appearance-none disabled:opacity-50'}>
                            <option value="">{tiposIncidencia.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                            {tiposIncidencia.map(c => (
                                <option key={c.id} value={c.valor}>{c.valor}</option>
                            ))}
                        </select>
                    </div>
                    {form.tipoIncidencia === 'Ingreso tardío' && (
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><Clock className="w-3 h-3" /> Minutos de atraso</label>
                            <input type="number" min={1} value={form.minutosAtraso}
                                onChange={e => set('minutosAtraso', e.target.value)}
                                placeholder="0" className={inputCls} />
                        </div>
                    )}

                    {/* Causa + Severidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Causa</label>
                            <select value={form.causa} onChange={e => set('causa', e.target.value)}
                                disabled={causas.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{causas.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {causas.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Severidad</label>
                            <select value={form.severidad} onChange={e => set('severidad', e.target.value)}
                                disabled={severidades.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{severidades.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {severidades.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Detalle</label>
                        <textarea rows={3} value={form.detalle} onChange={e => set('detalle', e.target.value)}
                            placeholder="Descripción de la incidencia..."
                            className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                            <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Fila de incidencia ───────────────────────────────────────────────────────
const SEVERIDAD_STYLE: Record<string, string> = {
    'Baja':    'text-brand-text/60  bg-brand-border/20     border-brand-border/40',
    'Media':   'text-info           bg-info/10             border-info/20',
    'Alta':    'text-warning        bg-warning/10          border-warning/20',
    'Crítica': 'text-danger         bg-danger/10           border-danger/20',
};

const IncidenciaRow: React.FC<{
    incidencia: Incidencia;
    labelMaps:  { tipo: Record<string,string>; causa: Record<string,string>; sev: Record<string,string> };
}> = ({ incidencia, labelMaps }) => {
    const fecha = incidencia.fecha
        ? new Date(incidencia.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
        : '—';
    const sevStyle = SEVERIDAD_STYLE[incidencia.severidad ?? ''] ?? SEVERIDAD_STYLE.leve;

    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors group">
            <td className="px-4 py-3">
                <p className="text-xs font-bold text-brand-text capitalize">{fecha}</p>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-brand-text">{incidencia.medico || '—'}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-[10px] font-mono text-brand-text/50">{incidencia.bloqueHorario || '—'}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-bold text-brand-secondary bg-brand-secondary/10 border border-brand-secondary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {labelMaps.tipo[incidencia.tipoIncidencia ?? ''] ?? incidencia.tipoIncidencia ?? '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                {incidencia.severidad ? (
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', sevStyle)}>
                        {labelMaps.sev[incidencia.severidad] ?? incidencia.severidad}
                    </span>
                ) : <span className="text-brand-text/20 text-[10px]">—</span>}
            </td>
        </tr>
    );
};

// ─── Modal nueva desviación SLA ──────────────────────────────────────────────
const NuevaDesviacionModal: React.FC<{
    onClose:         () => void;
    onSuccess:       () => void;
    turnos:          Turno[];
    tiposDesviacion: Catalogo[];
    modalidades:     Catalogo[];
    severidades:     Catalogo[];
    addSlaDesviacion: (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, turnos, tiposDesviacion, modalidades, severidades, addSlaDesviacion }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const [form, setForm] = useState({
        idTurno:        '',
        fecha:          new Date().toISOString().split('T')[0],
        medico:         '',
        tipoDesviacion: '',
        modalidad:      '',
        minutosExceso:  '0',
        severidad:      '',
        detalle:        '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.idTurno) { setError('Selecciona el turno al que pertenece la desviación.'); return; }
        setSaving(true);
        setError(null);

        const { success, error: err } = await addSlaDesviacion({
            idTurno:        form.idTurno        || undefined,
            fecha:          form.fecha          || undefined,
            medico:         form.medico         || undefined,
            tipoDesviacion: form.tipoDesviacion || undefined,
            modalidad:      form.modalidad      || undefined,
            minutosExceso:  form.minutosExceso !== '' ? parseInt(form.minutosExceso, 10) : 0,
            severidad:      form.severidad      || undefined,
            detalle:        form.detalle        || undefined,
        });

        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar la desviación.');
    };

    const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
    const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nueva Desviación SLA</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">4° Turno — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Turno */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Turno *</label>
                        <select
                            required
                            value={form.idTurno}
                            onChange={e => set('idTurno', e.target.value)}
                            className={inputCls + ' appearance-none'}
                        >
                            <option value="">Seleccionar turno...</option>
                            {turnos.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.fecha} — {t.tipoTurno}{t.horaInicio ? ` (${t.horaInicio.slice(0,5)})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha + Médico */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><CalendarDays className="w-3 h-3" /> Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Médico</label>
                            <input type="text" value={form.medico} onChange={e => set('medico', e.target.value)}
                                placeholder="Nombre del médico" className={inputCls} />
                        </div>
                    </div>

                    {/* Tipo desviación + Modalidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Tipo de desviación</label>
                            <select value={form.tipoDesviacion} onChange={e => set('tipoDesviacion', e.target.value)}
                                disabled={tiposDesviacion.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{tiposDesviacion.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {tiposDesviacion.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Modalidad</label>
                            <select value={form.modalidad} onChange={e => set('modalidad', e.target.value)}
                                className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {modalidades.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Minutos exceso + Severidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><Timer className="w-3 h-3" /> Minutos de exceso</label>
                            <input type="number" min={0} value={form.minutosExceso}
                                onChange={e => set('minutosExceso', e.target.value)}
                                className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Severidad</label>
                            <select value={form.severidad} onChange={e => set('severidad', e.target.value)}
                                disabled={severidades.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{severidades.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {severidades.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Detalle</label>
                        <textarea rows={3} value={form.detalle} onChange={e => set('detalle', e.target.value)}
                            placeholder="Descripción de la desviación..."
                            className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                            <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Fila de desviación SLA ───────────────────────────────────────────────────
const DesviacionRow: React.FC<{
    desviacion: SlaDesviacion;
    labelSev:   Record<string, string>;
}> = ({ desviacion, labelSev }) => {
    const fecha = desviacion.fecha
        ? new Date(desviacion.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
        : '—';
    const sevStyle = SEVERIDAD_STYLE[desviacion.severidad ?? ''] ?? '';

    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors group">
            <td className="px-4 py-3">
                <p className="text-xs font-bold text-brand-text capitalize">{fecha}</p>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-brand-text">{desviacion.medico || '—'}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {desviacion.tipoDesviacion || '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className="text-[10px] font-mono text-brand-text/50">{desviacion.modalidad || '—'}</span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className="text-xs font-mono font-bold text-warning">
                    {desviacion.minutosExceso != null ? `+${desviacion.minutosExceso} min` : '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                {desviacion.severidad ? (
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', sevStyle)}>
                        {labelSev[desviacion.severidad] ?? desviacion.severidad}
                    </span>
                ) : <span className="text-brand-text/20 text-[10px]">—</span>}
            </td>
        </tr>
    );
};

// ─── Modal nuevo caso crítico ─────────────────────────────────────────────────
const NuevoCasoCriticoModal: React.FC<{
    onClose:         () => void;
    onSuccess:       () => void;
    turnos:          Turno[];
    modalidades:     Catalogo[];
    addCasoCritico:  (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, turnos, modalidades, addCasoCritico }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const [form, setForm] = useState({
        idTurno:           '',
        fecha:             new Date().toISOString().split('T')[0],
        institucion:       '',
        modalidad:         '',
        idEstudio:         '',
        paciente:          '',
        rut:               '',
        fueraPlazo:        false,
        minutosRetraso:    '0',
        medicoResponsable: '',
        detalle:           '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.idTurno) { setError('Selecciona el turno al que pertenece el caso.'); return; }
        setSaving(true);
        setError(null);

        const { success, error: err } = await addCasoCritico({
            idTurno:           form.idTurno           || undefined,
            fecha:             form.fecha             || undefined,
            institucion:       form.institucion       || undefined,
            modalidad:         form.modalidad         || undefined,
            idEstudio:         form.idEstudio         || undefined,
            paciente:          form.paciente          || undefined,
            rut:               form.rut               || undefined,
            fueraPlazo:        form.fueraPlazo,
            minutosRetraso:    form.minutosRetraso !== '' ? parseInt(form.minutosRetraso, 10) : 0,
            medicoResponsable: form.medicoResponsable || undefined,
            detalle:           form.detalle           || undefined,
        });

        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar el caso crítico.');
    };

    const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
    const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';
    const sensitiveLabelCls = cn(labelCls, 'flex items-center gap-1.5 text-warning/70');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nuevo Caso Crítico</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">4° Turno — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Turno */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Turno *</label>
                        <select required value={form.idTurno} onChange={e => set('idTurno', e.target.value)}
                            className={inputCls + ' appearance-none'}>
                            <option value="">Seleccionar turno...</option>
                            {turnos.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.fecha} — {t.tipoTurno}{t.horaInicio ? ` (${t.horaInicio.slice(0,5)})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha + Institución */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><CalendarDays className="w-3 h-3" /> Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Institución</label>
                            <input type="text" value={form.institucion} onChange={e => set('institucion', e.target.value)}
                                placeholder="Nombre del centro" className={inputCls} />
                        </div>
                    </div>

                    {/* Modalidad + ID Estudio */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Modalidad</label>
                            <select value={form.modalidad} onChange={e => set('modalidad', e.target.value)}
                                className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {modalidades.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>N° de estudio / Accession</label>
                            <input type="text" value={form.idEstudio} onChange={e => set('idEstudio', e.target.value)}
                                placeholder="ej. ACC-00123" className={inputCls} />
                        </div>
                    </div>

                    {/* Datos sensibles — banner aviso */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
                        <Lock className="w-3.5 h-3.5 text-warning/70 shrink-0" />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-warning/60">
                            Los campos Paciente y RUT son datos sensibles — manejo confidencial
                        </p>
                    </div>

                    {/* Paciente + RUT */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={sensitiveLabelCls}><Lock className="w-3 h-3" /> Paciente</label>
                            <input type="text" value={form.paciente} onChange={e => set('paciente', e.target.value)}
                                placeholder="Nombre completo" className={inputCls} autoComplete="off" />
                        </div>
                        <div className="space-y-1.5">
                            <label className={sensitiveLabelCls}><Lock className="w-3 h-3" /> RUT</label>
                            <input type="text" value={form.rut} onChange={e => set('rut', e.target.value)}
                                placeholder="12.345.678-9" className={inputCls} autoComplete="off" />
                        </div>
                    </div>

                    {/* Médico responsable */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Médico responsable</label>
                        <input type="text" value={form.medicoResponsable} onChange={e => set('medicoResponsable', e.target.value)}
                            placeholder="Nombre del médico" className={inputCls} />
                    </div>

                    {/* Fuera de plazo + Minutos retraso */}
                    <div className="flex flex-col gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                        <Switch
                            checked={form.fueraPlazo}
                            onChange={v => set('fueraPlazo', v)}
                            label="Fuera de plazo"
                        />
                        {form.fueraPlazo && (
                            <div className="ml-1 space-y-1">
                                <label className={cn(labelCls, 'flex items-center gap-1.5')}><Timer className="w-3 h-3" /> Minutos de retraso</label>
                                <input type="number" min={0} value={form.minutosRetraso}
                                    onChange={e => set('minutosRetraso', e.target.value)}
                                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 w-32" />
                            </div>
                        )}
                    </div>

                    {/* Detalle */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Detalle</label>
                        <textarea rows={3} value={form.detalle} onChange={e => set('detalle', e.target.value)}
                            placeholder="Descripción del caso crítico..."
                            className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                            <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-danger text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-danger/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Registrar Caso'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Fila de caso crítico ─────────────────────────────────────────────────────
const CasoCriticoRow: React.FC<{ caso: CasoCritico }> = ({ caso }) => {
    const fecha = caso.fecha
        ? new Date(caso.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
        : '—';

    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors group">
            <td className="px-4 py-3">
                <p className="text-xs font-bold text-brand-text capitalize">{fecha}</p>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-brand-text">{caso.institucion || '—'}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full">
                    {caso.modalidad || '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className="text-[10px] font-mono text-brand-text/60">{caso.idEstudio || '—'}</span>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-brand-text">{caso.medicoResponsable || '—'}</p>
            </td>
            <td className="px-4 py-3 text-center">
                <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black',
                    caso.fueraPlazo
                        ? 'bg-danger/10 text-danger border border-danger/20'
                        : 'bg-brand-border/30 text-brand-text/20'
                )}>
                    {caso.fueraPlazo ? '✓' : '—'}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                {caso.fueraPlazo && caso.minutosRetraso != null ? (
                    <span className="text-xs font-mono font-bold text-danger">+{caso.minutosRetraso} min</span>
                ) : (
                    <span className="text-brand-text/20 text-[10px]">—</span>
                )}
            </td>
        </tr>
    );
};

// ─── Modal nueva incidencia técnica ──────────────────────────────────────────
const NuevaIncidTecnicaModal: React.FC<{
    onClose:            () => void;
    onSuccess:          () => void;
    categoriasTecnicas: Catalogo[];
    estadosIncidencia:  Catalogo[];
    severidades:        Catalogo[];
    addIncidTecnica:    (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, categoriasTecnicas, estadosIncidencia, severidades, addIncidTecnica }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const defaultEstado = estadosIncidencia.find(e =>
        e.valor.toLowerCase().includes('abierta') || e.valor.toLowerCase().includes('abierto')
    )?.valor ?? '';

    const [form, setForm] = useState({
        fecha:            new Date().toISOString().split('T')[0],
        categoriaTecnica: '',
        centroAfectado:   '',
        sistema:          '',
        estado:           defaultEstado,
        severidad:        '',
        detalle:          '',
        accionTomada:     '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const { success, error: err } = await addIncidTecnica({
            fecha:            form.fecha            || undefined,
            categoriaTecnica: form.categoriaTecnica || undefined,
            centroAfectado:   form.centroAfectado   || undefined,
            sistema:          form.sistema          || undefined,
            estado:           form.estado           || undefined,
            severidad:        form.severidad        || undefined,
            detalle:          form.detalle          || undefined,
            accionTomada:     form.accionTomada     || undefined,
        });

        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar la incidencia técnica.');
    };

    const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
    const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nueva Incidencia Técnica</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">4° Turno — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Fecha + Categoría */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={cn(labelCls, 'flex items-center gap-1.5')}><CalendarDays className="w-3 h-3" /> Fecha</label>
                            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Categoría técnica</label>
                            <select value={form.categoriaTecnica} onChange={e => set('categoriaTecnica', e.target.value)}
                                disabled={categoriasTecnicas.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{categoriasTecnicas.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {categoriasTecnicas.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Centro afectado + Sistema */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Centro afectado</label>
                            <input type="text" value={form.centroAfectado} onChange={e => set('centroAfectado', e.target.value)}
                                placeholder="Nombre del centro" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Sistema</label>
                            <input type="text" value={form.sistema} onChange={e => set('sistema', e.target.value)}
                                placeholder="ej. Multiris, PACS" className={inputCls} />
                        </div>
                    </div>

                    {/* Estado + Severidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Estado</label>
                            <select value={form.estado} onChange={e => set('estado', e.target.value)}
                                disabled={estadosIncidencia.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{estadosIncidencia.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {estadosIncidencia.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Severidad</label>
                            <select value={form.severidad} onChange={e => set('severidad', e.target.value)}
                                disabled={severidades.length === 0}
                                className={inputCls + ' appearance-none disabled:opacity-50'}>
                                <option value="">{severidades.length === 0 ? 'Sin opciones' : 'Seleccione…'}</option>
                                {severidades.map(c => (
                                    <option key={c.id} value={c.valor}>{c.valor}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Detalle</label>
                        <textarea rows={3} value={form.detalle} onChange={e => set('detalle', e.target.value)}
                            placeholder="Descripción de la incidencia..."
                            className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {/* Acción tomada */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Acción tomada</label>
                        <textarea rows={2} value={form.accionTomada} onChange={e => set('accionTomada', e.target.value)}
                            placeholder="Medidas adoptadas..."
                            className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                            <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Fila de incidencia técnica ───────────────────────────────────────────────
const ESTADO_STYLE: Record<string, string> = {
    'Abierta':    'text-danger    bg-danger/10    border-danger/20',
    'Abierto':    'text-danger    bg-danger/10    border-danger/20',
    'En proceso': 'text-warning   bg-warning/10   border-warning/20',
    'Resuelta':   'text-success   bg-success/10   border-success/20',
    'Resuelto':   'text-success   bg-success/10   border-success/20',
    'Cerrada':    'text-brand-text/40 bg-brand-border/20 border-brand-border/40',
    'Cerrado':    'text-brand-text/40 bg-brand-border/20 border-brand-border/40',
};

const IncidTecnicaRow: React.FC<{ incid: IncidenciaTecnica; labelSev: Record<string,string> }> = ({ incid, labelSev }) => {
    const fecha = incid.fecha
        ? new Date(incid.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
        : '—';
    const estadoStyle = ESTADO_STYLE[incid.estado ?? ''] ?? 'text-brand-text/40 bg-brand-border/20 border-brand-border/40';
    const sevStyle    = SEVERIDAD_STYLE[incid.severidad ?? ''] ?? '';

    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors group">
            <td className="px-4 py-3">
                <p className="text-xs font-bold text-brand-text capitalize">{fecha}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {incid.categoriaTecnica || '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                <p className="text-xs text-brand-text">{incid.centroAfectado || '—'}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-[10px] font-mono text-brand-text/60">{incid.sistema || '—'}</span>
            </td>
            <td className="px-4 py-3">
                {incid.estado ? (
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', estadoStyle)}>
                        {incid.estado}
                    </span>
                ) : <span className="text-brand-text/20 text-[10px]">—</span>}
            </td>
            <td className="px-4 py-3">
                {incid.severidad ? (
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', sevStyle)}>
                        {labelSev[incid.severidad] ?? incid.severidad}
                    </span>
                ) : <span className="text-brand-text/20 text-[10px]">—</span>}
            </td>
        </tr>
    );
};

// ─── Fila de turno ────────────────────────────────────────────────────────────
const TurnoRow: React.FC<{ turno: Turno; etiquetaTipo: string }> = ({ turno, etiquetaTipo }) => {
    const fecha = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors group">
            <td className="px-4 py-3">
                <p className="text-xs font-bold text-brand-text capitalize">{fecha}</p>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full">
                    {etiquetaTipo || turno.tipoTurno}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs font-mono text-brand-text/60">
                    {turno.horaInicio ? turno.horaInicio.slice(0, 5) : '—'}
                    {turno.horaFin ? ` → ${turno.horaFin.slice(0, 5)}` : ''}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black',
                    turno.estabilizado
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-brand-border/30 text-brand-text/20'
                )}>
                    {turno.estabilizado ? '✓' : '—'}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className="text-xs font-mono text-brand-text/60">
                    {turno.recibidos ?? '—'}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className="text-xs font-mono text-brand-text/60">
                    {turno.entregados ?? '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black',
                    turno.apoyoMedicoExtra
                        ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                        : 'bg-brand-border/30 text-brand-text/20'
                )}>
                    {turno.apoyoMedicoExtra ? '✓' : '—'}
                </span>
            </td>
            <td className="px-4 py-3">
                {turno.observaciones ? (
                    <p className="text-[10px] text-brand-text/40 truncate max-w-40">{turno.observaciones}</p>
                ) : (
                    <span className="text-brand-text/20 text-[10px]">—</span>
                )}
            </td>
            <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-4 h-4 text-brand-text/30" />
            </td>
        </tr>
    );
};

// ─── Dashboard principal ──────────────────────────────────────────────────────
export const CuartoTurnoDashboard: React.FC = () => {
    const {
        turnos, incidencias, slaDesviaciones, casosCriticos, incidTecnicas,
        tiposTurno, tiposIncidencia, causas, severidades,
        tiposDesviacion, modalidades,
        categoriasTecnicas, estadosIncidencia,
        loading, loadingIncid, loadingSla, loadingCasos, loadingTecnicas,
        addTurno, addIncidencia, addSlaDesviacion, addCasoCritico, addIncidTecnica,
        refresh, refreshIncidencias, refreshSla, refreshCasos, refreshTecnicas,
    } = useCuartoTurno();

    const [activeTab,        setActiveTab]        = useState<'turnos' | 'incidencias' | 'sla' | 'casos' | 'tecnicas'>('turnos');
    const [showTurnoModal,   setShowTurnoModal]   = useState(false);
    const [showIncidModal,   setShowIncidModal]   = useState(false);
    const [showSlaModal,     setShowSlaModal]     = useState(false);
    const [showCasosModal,   setShowCasosModal]   = useState(false);
    const [showTecnicaModal, setShowTecnicaModal] = useState(false);

    const etiquetaMap  = Object.fromEntries(tiposTurno.map(t => [t.valor, t.valor]));
    const labelTipo    = Object.fromEntries(tiposIncidencia.map(c => [c.valor, c.valor]));
    const labelCausa   = Object.fromEntries(causas.map(c => [c.valor, c.valor]));
    const labelSev     = Object.fromEntries(severidades.map(c => [c.valor, c.valor]));

    // KPIs rápidos (últimos 7 días)
    const hoy = new Date();
    const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 6);
    const recientes       = turnos.filter(t => new Date(t.fecha) >= hace7);
    const totalRecibidos  = recientes.reduce((s, t) => s + (t.recibidos  ?? 0), 0);
    const totalEntregados = recientes.reduce((s, t) => s + (t.entregados ?? 0), 0);
    const estabilizados   = recientes.filter(t => t.estabilizado).length;

    const TABS = [
        { id: 'turnos'      as const, label: 'Turnos',                  icon: Activity      },
        { id: 'incidencias' as const, label: 'Incidencias de Personal', icon: AlertTriangle },
        { id: 'sla'         as const, label: 'Desviaciones SLA',        icon: Timer         },
        { id: 'casos'    as const, label: 'Casos Críticos',      icon: ShieldAlert },
        { id: 'tecnicas' as const, label: 'Incidencias Técnicas', icon: AlertTriangle },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-brand-text">4° Turno</h2>
                    <p className="text-brand-text/40 text-sm">Control y registro de turnos — CT</p>
                </div>
                {activeTab === 'turnos' && (
                    <button onClick={() => setShowTurnoModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nuevo Turno
                    </button>
                )}
                {activeTab === 'incidencias' && (
                    <button onClick={() => setShowIncidModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-secondary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-secondary/20">
                        <Plus className="w-4 h-4" /> Nueva Incidencia
                    </button>
                )}
                {activeTab === 'sla' && (
                    <button onClick={() => setShowSlaModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nueva Desviación
                    </button>
                )}
                {activeTab === 'casos' && (
                    <button onClick={() => setShowCasosModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-danger text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-danger/20">
                        <Plus className="w-4 h-4" /> Nuevo Caso Crítico
                    </button>
                )}
                {activeTab === 'tecnicas' && (
                    <button onClick={() => setShowTecnicaModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nueva Incidencia Técnica
                    </button>
                )}
            </div>

            {/* KPIs 7 días */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Turnos (7 días)', val: recientes.length,   color: 'text-brand-text    bg-brand-surface    border-brand-border'     },
                    { label: 'Recibidos',       val: totalRecibidos,     color: 'text-info          bg-info/10          border-info/20'           },
                    { label: 'Entregados',      val: totalEntregados,    color: 'text-success       bg-success/10       border-success/20'        },
                    { label: 'Estabilizados',   val: estabilizados,      color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' },
                ].map(k => (
                    <div key={k.label} className={cn('flex items-center gap-4 px-4 py-3 rounded-2xl border', k.color)}>
                        <span className={cn('text-2xl font-black', k.color.split(' ')[0])}>{k.val}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 leading-tight">{k.label}</span>
                    </div>
                ))}
            </div>

            {/* Pestañas */}
            <div className="flex gap-1 border-b border-brand-border pb-px">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-all',
                                active
                                    ? 'border-brand-primary text-brand-text bg-brand-surface'
                                    : 'border-transparent text-brand-text/40 hover:text-brand-text hover:bg-brand-surface/50'
                            )}
                        >
                            <Icon className={cn('w-3.5 h-3.5', active ? 'text-brand-primary' : 'text-brand-text/30')} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Contenido pestaña Turnos ── */}
            {activeTab === 'turnos' && (
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : turnos.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                        <Activity className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm text-brand-text/30">Sin turnos registrados. Crea el primero.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-surface/50 border-b border-brand-border">
                                    {['Fecha', 'Tipo', 'Horario', 'Estabilizado', 'Recibidos', 'Entregados', 'Apoyo Méd.', 'Observaciones', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {turnos.map(t => (
                                    <TurnoRow
                                        key={t.id}
                                        turno={t}
                                        etiquetaTipo={etiquetaMap[t.tipoTurno] || t.tipoTurno}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ── Contenido pestaña Incidencias ── */}
            {activeTab === 'incidencias' && (
                loadingIncid ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : incidencias.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                        <AlertTriangle className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm text-brand-text/30">Sin incidencias registradas.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-surface/50 border-b border-brand-border">
                                    {['Fecha', 'Médico', 'Bloque', 'Tipo', 'Severidad'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {incidencias.map(i => (
                                    <IncidenciaRow
                                        key={i.id}
                                        incidencia={i}
                                        labelMaps={{ tipo: labelTipo, causa: labelCausa, sev: labelSev }}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ── Contenido pestaña SLA ── */}
            {activeTab === 'sla' && (
                loadingSla ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : slaDesviaciones.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                        <Timer className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm text-brand-text/30">Sin desviaciones SLA registradas.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-surface/50 border-b border-brand-border">
                                    {['Fecha', 'Médico', 'Tipo desviación', 'Modalidad', 'Min. exceso', 'Severidad'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {slaDesviaciones.map(d => (
                                    <DesviacionRow
                                        key={d.id}
                                        desviacion={d}
                                        labelSev={labelSev}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ── Contenido pestaña Casos Críticos ── */}
            {activeTab === 'casos' && (
                loadingCasos ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : casosCriticos.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                        <ShieldAlert className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm text-brand-text/30">Sin casos críticos registrados.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-surface/50 border-b border-brand-border">
                                    {['Fecha', 'Institución', 'Modalidad', 'N° Estudio', 'Médico', 'Fuera plazo', 'Min. retraso'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {casosCriticos.map(c => (
                                    <CasoCriticoRow key={c.id} caso={c} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ── Contenido pestaña Incidencias Técnicas ── */}
            {activeTab === 'tecnicas' && (
                loadingTecnicas ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : incidTecnicas.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                        <AlertTriangle className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm text-brand-text/30">Sin incidencias técnicas registradas.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-surface/50 border-b border-brand-border">
                                    {['Fecha', 'Categoría', 'Centro', 'Sistema', 'Estado', 'Severidad'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {incidTecnicas.map(i => (
                                    <IncidTecnicaRow key={i.id} incid={i} labelSev={labelSev} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Modales */}
            {showTurnoModal && (
                <NuevoTurnoModal
                    onClose={() => setShowTurnoModal(false)}
                    onSuccess={refresh}
                    tiposTurno={tiposTurno}
                    addTurno={addTurno}
                />
            )}
            {showIncidModal && (
                <NuevaIncidenciaModal
                    onClose={() => setShowIncidModal(false)}
                    onSuccess={refreshIncidencias}
                    turnos={turnos}
                    tiposIncidencia={tiposIncidencia}
                    causas={causas}
                    severidades={severidades}
                    addIncidencia={addIncidencia}
                />
            )}
            {showSlaModal && (
                <NuevaDesviacionModal
                    onClose={() => setShowSlaModal(false)}
                    onSuccess={refreshSla}
                    turnos={turnos}
                    tiposDesviacion={tiposDesviacion}
                    modalidades={modalidades}
                    severidades={severidades}
                    addSlaDesviacion={addSlaDesviacion}
                />
            )}
            {showCasosModal && (
                <NuevoCasoCriticoModal
                    onClose={() => setShowCasosModal(false)}
                    onSuccess={refreshCasos}
                    turnos={turnos}
                    modalidades={modalidades}
                    addCasoCritico={addCasoCritico}
                />
            )}
            {showTecnicaModal && (
                <NuevaIncidTecnicaModal
                    onClose={() => setShowTecnicaModal(false)}
                    onSuccess={refreshTecnicas}
                    categoriasTecnicas={categoriasTecnicas}
                    estadosIncidencia={estadosIncidencia}
                    severidades={severidades}
                    addIncidTecnica={addIncidTecnica}
                />
            )}
        </div>
    );
};
