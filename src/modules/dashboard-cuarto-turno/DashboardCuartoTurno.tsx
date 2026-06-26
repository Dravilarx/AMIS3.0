import React, { useState } from 'react';
import {
    BarChart2, Loader2, RefreshCw, CalendarDays, Activity,
    AlertTriangle, Timer, ShieldAlert, Wrench, Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDashboardCuartoTurno, type Breakdown } from '../../hooks/useDashboardCuartoTurno';

// Fecha ISO (YYYY-MM-DD) hace N días
const isoDaysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};
const isoToday = (): string => new Date().toISOString().slice(0, 10);

type Acento = 'teal' | 'copper' | 'danger' | 'warning' | 'info' | 'success' | 'muted';

const ACENTO: Record<Acento, { text: string; bg: string; border: string; bar: string }> = {
    teal:    { text: 'text-brand-primary',   bg: 'bg-brand-primary/5',   border: 'border-brand-primary/20',   bar: 'bg-brand-primary'   },
    copper:  { text: 'text-brand-secondary', bg: 'bg-brand-secondary/5', border: 'border-brand-secondary/20', bar: 'bg-brand-secondary' },
    danger:  { text: 'text-danger',          bg: 'bg-danger/5',          border: 'border-danger/20',          bar: 'bg-danger'          },
    warning: { text: 'text-warning',         bg: 'bg-warning/5',         border: 'border-warning/20',         bar: 'bg-warning'         },
    info:    { text: 'text-info',            bg: 'bg-info/5',            border: 'border-info/20',            bar: 'bg-info'            },
    success: { text: 'text-success',         bg: 'bg-success/5',         border: 'border-success/20',         bar: 'bg-success'         },
    muted:   { text: 'text-brand-text/60',   bg: 'bg-brand-surface/40',  border: 'border-brand-border',       bar: 'bg-brand-text/40'   },
};

// ─── Tarjeta KPI numérico ─────────────────────────────────────────────────────
const Kpi: React.FC<{ label: string; value: number | string; suffix?: string; acento?: Acento }> =
    ({ label, value, suffix, acento = 'muted' }) => {
        const a = ACENTO[acento];
        return (
            <div className={cn('rounded-2xl border px-4 py-4 flex flex-col gap-1', a.bg, a.border)}>
                <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 leading-tight">{label}</p>
                <p className={cn('text-2xl font-black leading-none', a.text)}>
                    {value}{suffix && <span className="text-sm font-bold ml-0.5">{suffix}</span>}
                </p>
            </div>
        );
    };

// ─── Mini-tabla de desglose (valor + conteo) ──────────────────────────────────
const BreakdownTable: React.FC<{ title: string; rows: Breakdown[]; acento?: Acento }> =
    ({ title, rows, acento = 'teal' }) => {
        const a = ACENTO[acento];
        const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
        return (
            <div className="rounded-2xl border border-brand-border bg-brand-surface/40 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-brand-border bg-brand-surface/50">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">{title}</p>
                </div>
                {rows.length === 0 ? (
                    <p className="px-4 py-4 text-[11px] text-brand-text/30">Sin datos</p>
                ) : (
                    <div className="divide-y divide-brand-border/40">
                        {rows.map((r, i) => (
                            <div key={i} className="px-4 py-2 flex items-center gap-3">
                                <span className="flex-1 min-w-0 text-xs text-brand-text/80 truncate" title={r.valor}>{r.valor}</span>
                                {/* barra proporcional sutil */}
                                <span className="hidden sm:block h-1.5 rounded-full bg-brand-border/40 overflow-hidden" style={{ width: 64 }}>
                                    <span className={cn('block h-full rounded-full', a.bar)} style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%` }} />
                                </span>
                                <span className={cn('text-sm font-black tabular-nums shrink-0', a.text)}>{r.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

// ─── Sección ──────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> =
    ({ title, icon: Icon, children }) => (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-primary/10">
                    <Icon className="w-4 h-4 text-brand-primary" />
                </div>
                <h3 className="text-sm font-black text-brand-text uppercase tracking-wide">{title}</h3>
            </div>
            {children}
        </div>
    );

export const DashboardCuartoTurno: React.FC = () => {
    const [desde, setDesde] = useState(isoDaysAgo(7));
    const [hasta, setHasta] = useState(isoToday());
    const { kpis, loading, recalcular } = useDashboardCuartoTurno({ desde, hasta });

    const { operativa, personal, sla, criticos, tecnicas } = kpis;

    const inputCls = 'bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
    const gridCards = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3';
    const gridTables = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';

    return (
        <div className="space-y-7 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-brand-text flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-brand-primary" /> Dashboard 4° Turno
                    </h2>
                    <p className="text-brand-text/40 text-sm">Indicadores operativos — solo lectura</p>
                </div>

                {/* Selector de período + Recalcular */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Desde</label>
                        <input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Hasta</label>
                        <input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)} className={inputCls} />
                    </div>
                    <button
                        onClick={() => recalcular()}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Recalcular
                    </button>
                </div>
            </div>

            {/* Aviso privacidad */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
                <Lock className="w-3.5 h-3.5 text-warning/70 shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-warning/60">
                    Indicadores agregados — no se muestran datos de pacientes (Ley 21.719)
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : (
                <div className="space-y-8">
                    {/* 1) Carga Operativa */}
                    <Section title="Carga Operativa" icon={Activity}>
                        <div className={gridCards}>
                            <Kpi label="Turnos"                     value={operativa.turnos} acento="teal" />
                            <Kpi label="Recibidos (total)"          value={operativa.recibidos} acento="info" />
                            <Kpi label="Recibidos fuera de plazo"   value={operativa.recibidosFueraPlazo} acento="warning" />
                            <Kpi label="% recibido fuera de plazo"  value={operativa.pctRecibidoFueraPlazo} suffix="%" acento="warning" />
                            <Kpi label="Entregados (total)"         value={operativa.entregados} acento="info" />
                            <Kpi label="Entregados fuera de plazo"  value={operativa.entregadosFueraPlazo} acento="warning" />
                            <Kpi label="% entregado fuera de plazo" value={operativa.pctEntregadoFueraPlazo} suffix="%" acento="warning" />
                            <Kpi label="% turnos estabilizados"     value={operativa.pctEstabilizados} suffix="%" acento="success" />
                        </div>
                        <div className={cn(gridTables, 'mt-3')}>
                            <BreakdownTable title="Turnos por tecnólogo" rows={operativa.porTecnologo} acento="teal" />
                        </div>
                    </Section>

                    {/* 2) Personal y Cumplimiento */}
                    <Section title="Personal y Cumplimiento" icon={AlertTriangle}>
                        <div className={cn(gridCards, 'mb-3')}>
                            <Kpi label="Total incidencias" value={personal.total} acento="teal" />
                            <Kpi label="Atraso total"      value={personal.atrasoTotalMin} suffix="min" acento="copper" />
                        </div>
                        <div className={gridTables}>
                            <BreakdownTable title="Por tipo de incidencia" rows={personal.porTipoIncidencia} acento="warning" />
                            <BreakdownTable title="Por causa"              rows={personal.porCausa}          acento="info" />
                            <BreakdownTable title="Por severidad"          rows={personal.porSeveridad}      acento="danger" />
                        </div>
                    </Section>

                    {/* 3) SLA / Calidad */}
                    <Section title="SLA / Calidad" icon={Timer}>
                        <div className={cn(gridCards, 'mb-3')}>
                            <Kpi label="Total desviaciones"        value={sla.total} acento="teal" />
                            <Kpi label="Minutos de exceso (total)" value={sla.minutosExcesoTotal} suffix="min" acento="copper" />
                        </div>
                        <div className={gridTables}>
                            <BreakdownTable title="Por tipo de desviación" rows={sla.porTipoDesviacion} acento="warning" />
                            <BreakdownTable title="Por severidad"          rows={sla.porSeveridad}      acento="danger" />
                        </div>
                    </Section>

                    {/* 4) Casos Críticos */}
                    <Section title="Casos Críticos" icon={ShieldAlert}>
                        <div className={gridCards}>
                            <Kpi label="Registrados"       value={criticos.registrados} acento="teal" />
                            <Kpi label="Fuera de plazo"    value={criticos.fueraPlazo} acento="danger" />
                            <Kpi label="Retraso total"     value={criticos.retrasoTotalMin} suffix="min" acento="copper" />
                        </div>
                    </Section>

                    {/* 5) Técnicas */}
                    <Section title="Técnicas" icon={Wrench}>
                        <div className={cn(gridCards, 'mb-3')}>
                            <Kpi label="Total técnicas" value={tecnicas.total} acento="teal" />
                        </div>
                        <div className={gridTables}>
                            <BreakdownTable title="Por estado"            rows={tecnicas.porEstado}    acento="info" />
                            <BreakdownTable title="Por categoría técnica" rows={tecnicas.porCategoria} acento="warning" />
                            <BreakdownTable title="Por severidad"         rows={tecnicas.porSeveridad} acento="danger" />
                        </div>
                    </Section>
                </div>
            )}
        </div>
    );
};
