import React, { useState } from 'react';
import {
    Plus, X, Loader2, Clock, CalendarDays, CheckCircle2,
    Users, ArrowUpDown, Activity, ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCuartoTurno, type Turno } from '../../hooks/useCuartoTurno';

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
    onClose:   () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const { tiposTurno, addTurno } = useCuartoTurno();
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    const [form, setForm] = useState({
        fecha:             new Date().toISOString().split('T')[0],
        tipoTurno:         '',
        horaInicio:        '',
        horaFin:           '',
        estabilizado:      false,
        apoyoMedicoExtra:  false,
        recibidos:         '',
        entregados:        '',
        observaciones:     '',
    });

    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.tipoTurno) { setError('Selecciona un tipo de turno.'); return; }
        setSaving(true);
        setError(null);

        const { success, error: err } = await addTurno({
            fecha:            form.fecha,
            tipoTurno:        form.tipoTurno,
            horaInicio:       form.horaInicio  || undefined,
            horaFin:          form.horaFin     || undefined,
            estabilizado:     form.estabilizado,
            apoyoMedicoExtra: form.apoyoMedicoExtra,
            recibidos:        form.recibidos  ? parseInt(form.recibidos)  : undefined,
            entregados:       form.entregados ? parseInt(form.entregados) : undefined,
            observaciones:    form.observaciones || undefined,
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
                                    <option key={t.id} value={t.valor}>{t.etiqueta}</option>
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

                    {/* Recibidos + Entregados */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                                <Users className="w-3 h-3" /> Recibidos
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.recibidos}
                                onChange={e => set('recibidos', e.target.value)}
                                placeholder="0"
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 flex items-center gap-1.5">
                                <ArrowUpDown className="w-3 h-3" /> Entregados
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.entregados}
                                onChange={e => set('entregados', e.target.value)}
                                placeholder="0"
                                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                            />
                        </div>
                    </div>

                    {/* Switches */}
                    <div className="flex flex-col gap-4 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                        <Switch
                            checked={form.estabilizado}
                            onChange={v => set('estabilizado', v)}
                            label="Turno estabilizado"
                        />
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
                    <p className="text-[10px] text-brand-text/40 truncate max-w-[160px]">{turno.observaciones}</p>
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
    const { turnos, tiposTurno, loading } = useCuartoTurno();
    const [showModal, setShowModal] = useState(false);

    // Mapa valor → etiqueta para mostrar en tabla
    const etiquetaMap = Object.fromEntries(tiposTurno.map(t => [t.valor, t.etiqueta]));

    // KPIs rápidos (últimos 7 días)
    const hoy = new Date();
    const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 6);
    const recientes = turnos.filter(t => new Date(t.fecha) >= hace7);
    const totalRecibidos  = recientes.reduce((s, t) => s + (t.recibidos  ?? 0), 0);
    const totalEntregados = recientes.reduce((s, t) => s + (t.entregados ?? 0), 0);
    const estabilizados   = recientes.filter(t => t.estabilizado).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-brand-text">4° Turno</h2>
                    <p className="text-brand-text/40 text-sm">Control y registro de turnos — CT</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20"
                >
                    <Plus className="w-4 h-4" /> Nuevo Turno
                </button>
            </div>

            {/* KPIs 7 días */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Turnos (7 días)',    val: recientes.length,   color: 'text-brand-text   bg-brand-surface    border-brand-border'      },
                    { label: 'Recibidos',          val: totalRecibidos,     color: 'text-info         bg-info/10          border-info/20'            },
                    { label: 'Entregados',         val: totalEntregados,    color: 'text-success      bg-success/10       border-success/20'         },
                    { label: 'Estabilizados',      val: estabilizados,      color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20'  },
                ].map(k => (
                    <div key={k.label} className={cn('flex items-center gap-4 px-4 py-3 rounded-2xl border', k.color)}>
                        <span className={cn('text-2xl font-black', k.color.split(' ')[0])}>{k.val}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 leading-tight">{k.label}</span>
                    </div>
                ))}
            </div>

            {/* Pestañas */}
            <div className="flex gap-1 border-b border-brand-border pb-px">
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider border-b-2 -mb-px border-brand-primary text-brand-text bg-brand-surface">
                    <Activity className="w-3.5 h-3.5 text-brand-primary" /> Turnos
                </button>
            </div>

            {/* Tabla de turnos */}
            {loading ? (
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
            )}

            {/* Modal nuevo turno */}
            {showModal && (
                <NuevoTurnoModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {}}
                />
            )}
        </div>
    );
};
