import React, { useState } from 'react';
import { ShieldAlert, Timer, Clock, Activity, TrendingUp, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDashboardCuartoTurno } from '../../hooks/useDashboardCuartoTurno';
import { DashboardCuartoTurno } from '../dashboard-cuarto-turno/DashboardCuartoTurno';

// Fecha ISO (YYYY-MM-DD)
const isoDaysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};
const isoToday = (): string => new Date().toISOString().slice(0, 10);

// ─── Tarjeta de urgente (estilo alerta) ───────────────────────────────────────
const UrgentCard: React.FC<{ label: string; value: number | string; icon: React.ElementType; hint?: string }> =
    ({ label, value, icon: Icon, hint }) => (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-danger/5 border-danger/20 min-w-56">
            <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 shrink-0">
                <Icon className="w-5 h-5 text-danger" />
            </div>
            <div>
                <p className="text-3xl font-black text-danger leading-none">{value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-danger/70 mt-1 leading-tight">{label}</p>
                {hint && <p className="text-[9px] text-brand-text/30 mt-0.5">{hint}</p>}
            </div>
        </div>
    );

// ─── Pestañas por área ────────────────────────────────────────────────────────
type AreaTab = '4turno' | 'clinico_red' | 'comercial' | 'calidad';

// permiso: reservado para filtrar por rol más adelante (null = visible para todos
// los que tengan acceso al Dashboard). Por ahora se muestran todas.
const AREA_TABS: { id: AreaTab; label: string; icon: React.ElementType; permiso: string | null }[] = [
    { id: '4turno',      label: '4° Turno',      icon: Clock,          permiso: null },
    { id: 'clinico_red', label: 'Clínico / Red', icon: Activity,       permiso: null },
    { id: 'comercial',   label: 'Comercial',     icon: TrendingUp,     permiso: null },
    { id: 'calidad',     label: 'Calidad',       icon: ClipboardCheck, permiso: null },
];

const Placeholder: React.FC<{ titulo: string }> = ({ titulo }) => (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4 border border-dashed border-brand-border rounded-2xl">
        <div className="w-16 h-16 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-brand-text/20" />
        </div>
        <div>
            <p className="text-sm font-black text-brand-text/50">{titulo}</p>
            <p className="text-xs text-brand-text/30 mt-1 max-w-md">Próximamente — se conectará con datos reales.</p>
        </div>
    </div>
);

export const DashboardModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AreaTab>('4turno');

    // Franja de urgentes: por ahora SOLO datos reales del 4° Turno (últimos 7 días).
    // El contenedor queda preparado para sumar riesgos de otras áreas en las siguientes partes.
    const { kpis, loading } = useDashboardCuartoTurno({ desde: isoDaysAgo(7), hasta: isoToday() });

    // Filtrado de pestañas por permiso (placeholder: hoy se muestran todas).
    const visibleTabs = AREA_TABS;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-brand-text tracking-tight">Panel Principal</h1>
                    <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.3em] mt-1">Red AMIS ● Centro de Gestión</p>
                </div>
            </div>

            {/* ── FRANJA DE URGENTES (siempre visible) ── */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-danger" />
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-danger/80">Requiere acción</h2>
                    <span className="text-[9px] text-brand-text/30 font-bold">· 4° Turno, últimos 7 días</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    <UrgentCard
                        label="Casos críticos fuera de plazo"
                        value={loading ? '…' : kpis.criticos.fueraPlazo}
                        icon={ShieldAlert}
                    />
                    <UrgentCard
                        label="Desviaciones SLA"
                        value={loading ? '…' : kpis.sla.total}
                        icon={Timer}
                    />
                    {/* Aquí se sumarán los urgentes de otras áreas (Clínico/Red, Comercial, Calidad) */}
                </div>
            </div>

            {/* ── PESTAÑAS POR ÁREA ── */}
            <div>
                <div className="flex gap-1 border-b border-brand-border pb-px flex-wrap">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-all',
                                    active ? 'border-brand-primary text-brand-text bg-brand-surface' : 'border-transparent text-brand-text/40'
                                )}
                            >
                                <Icon className={cn('w-3.5 h-3.5', active ? 'text-brand-primary' : 'text-brand-text/30')} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="pt-6">
                    {activeTab === '4turno' ? (
                        // Reutiliza el componente real (hook + 5 secciones + selector de fechas)
                        <DashboardCuartoTurno />
                    ) : activeTab === 'clinico_red' ? (
                        <Placeholder titulo="Clínico / Red" />
                    ) : activeTab === 'comercial' ? (
                        <Placeholder titulo="Comercial" />
                    ) : (
                        <Placeholder titulo="Calidad" />
                    )}
                </div>
            </div>
        </div>
    );
};
