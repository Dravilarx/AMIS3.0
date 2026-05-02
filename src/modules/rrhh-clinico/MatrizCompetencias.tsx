import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
    Brain, Eye, Wind, Scan, Bone, Heart, Baby,
    CheckCircle2, Send, RotateCcw, Info, Award,
    ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Nivel = 0 | 1 | 2 | 3;

interface MatrizState {
    [area: string]: {
        [modalidad: string]: Nivel;
    };
}

// ─── Configuración de datos ───────────────────────────────────────────────────

const AREAS = [
    { id: 'neuro',      label: 'Neurorradiología',     short: 'Neuro',        icon: Brain,    color: 'from-violet-500 to-purple-700' },
    { id: 'cabeza',     label: 'Cabeza y Cuello',      short: 'C. y Cuello',  icon: Eye,      color: 'from-sky-500 to-blue-700' },
    { id: 'torax',      label: 'Tórax',                short: 'Tórax',        icon: Wind,     color: 'from-teal-500 to-cyan-700' },
    { id: 'abdomen',    label: 'Abdomen / Pelvis',     short: 'Abd./Pelvis',  icon: Scan,     color: 'from-green-500 to-emerald-700' },
    { id: 'msk',        label: 'Músculo-Esquelético',  short: 'MSK',          icon: Bone,     color: 'from-amber-500 to-orange-700' },
    { id: 'mama',       label: 'Mama',                 short: 'Mama',         icon: Heart,    color: 'from-rose-500 to-pink-700' },
    { id: 'pediatrica', label: 'Radiología Pediátrica',short: 'Pediátrica',   icon: Baby,     color: 'from-fuchsia-500 to-indigo-700' },
] as const;

const MODALIDADES = [
    { id: 'rx', label: 'Rx', full: 'Radiología Simple' },
    { id: 'us', label: 'US', full: 'Ultrasonido' },
    { id: 'tc', label: 'TC', full: 'Tomografía' },
    { id: 'rm', label: 'RM', full: 'Resonancia' },
] as const;

const NIVELES: { value: Nivel; label: string; short: string; color: string; bg: string; ring: string }[] = [
    {
        value: 0,
        label: 'No informa',
        short: '0',
        color: 'text-brand-text/30',
        bg: 'bg-brand-bg border-brand-border hover:border-brand-text/20',
        ring: 'ring-brand-text/20',
    },
    {
        value: 1,
        label: 'Básico / Urgencia',
        short: '1',
        color: 'text-sky-300',
        bg: 'bg-sky-900/30 border-sky-700/50 hover:border-sky-500',
        ring: 'ring-sky-500',
    },
    {
        value: 2,
        label: 'Avanzado / Estándar',
        short: '2',
        color: 'text-brand-primary',
        bg: 'bg-orange-900/30 border-orange-700/50 hover:border-brand-primary',
        ring: 'ring-brand-primary',
    },
    {
        value: 3,
        label: 'Subespecialista / Referente',
        short: '3',
        color: 'text-amber-300',
        bg: 'bg-amber-900/30 border-amber-600/50 hover:border-amber-400',
        ring: 'ring-amber-400',
    },
];

// ─── Estado inicial vacío ────────────────────────────────────────────────────

const buildEstadoInicial = (): MatrizState =>
    Object.fromEntries(
        AREAS.map(area => [
            area.id,
            Object.fromEntries(MODALIDADES.map(mod => [mod.id, 0 as Nivel])),
        ])
    );

// ─── Componente Celda ─────────────────────────────────────────────────────────

interface CeldaProps {
    valor: Nivel;
    onChange: (nivel: Nivel) => void;
}

const CeldaNivel: React.FC<CeldaProps> = ({ valor, onChange }) => (
    <div className="flex items-center justify-center gap-1 flex-wrap p-1">
        {NIVELES.map(n => (
            <button
                key={n.value}
                onClick={() => onChange(n.value)}
                title={n.label}
                className={cn(
                    'w-8 h-8 rounded-full border text-xs font-black transition-all duration-150',
                    'flex items-center justify-center flex-shrink-0',
                    valor === n.value
                        ? `${n.color} border-current ring-2 ${n.ring} ring-offset-1 ring-offset-brand-surface scale-110 shadow-lg`
                        : `text-brand-text/30 ${n.bg} border`
                )}
            >
                {n.short}
            </button>
        ))}
    </div>
);

// ─── Componente Principal ────────────────────────────────────────────────────

export const MatrizCompetencias: React.FC = () => {
    const { user } = useAuth();
    const [matriz, setMatriz] = useState<MatrizState>(buildEstadoInicial);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Estadísticas reactivas ────────────────────────────────────────────────
    const stats = useMemo(() => {
        const valores = Object.values(matriz).flatMap(mod => Object.values(mod));
        const total = valores.length;
        const completadas = valores.filter(v => v > 0).length;
        const porNivel = [0, 1, 2, 3].map(n => valores.filter(v => v === n).length);
        const promedio = valores.reduce((a, b) => a + b, 0) / total;
        return { total, completadas, porNivel, promedio, porcentaje: Math.round((completadas / total) * 100) };
    }, [matriz]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleChange = (areaId: string, modId: string, nivel: Nivel) => {
        setMatriz(prev => ({
            ...prev,
            [areaId]: { ...prev[areaId], [modId]: nivel },
        }));
    };

    const handleReset = () => {
        setMatriz(buildEstadoInicial());
        setSent(false);
        setError(null);
    };

    const handleSubmit = async () => {
        setSending(true);
        setError(null);
        try {
            // TODO: Conectar con Supabase
            // await supabase.from('competencias_radiologos').upsert({
            //   user_id: user?.id,
            //   user_name: user?.name,
            //   matriz,
            //   submitted_at: new Date().toISOString(),
            // });
            await new Promise(res => setTimeout(res, 1200)); // Simula latencia
            setSent(true);
        } catch {
            setError('No se pudo enviar. Intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-10">

            {/* ── Encabezado ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-brand-primary shadow-xl shadow-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Award className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-brand-text tracking-tight">
                            Matriz de Competencias
                        </h1>
                        <p className="text-xs text-brand-text/40 font-semibold uppercase tracking-widest mt-0.5">
                            Auto-evaluación · RRHH Clínico · {user?.name || 'Radiólogo'}
                        </p>
                    </div>
                </div>

                {/* Progreso circular simplificado */}
                <div className="flex items-center gap-3 px-5 py-3 bg-brand-surface border border-brand-border rounded-2xl self-start sm:self-auto">
                    <div className="text-right">
                        <p className="text-3xl font-black text-brand-primary leading-none">{stats.porcentaje}%</p>
                        <p className="text-[10px] text-brand-text/40 uppercase font-bold tracking-widest mt-0.5">completado</p>
                    </div>
                    <div className="h-10 w-px bg-brand-border" />
                    <div className="text-right">
                        <p className="text-lg font-black text-brand-text leading-none">{stats.completadas}<span className="text-brand-text/40 text-sm">/{stats.total}</span></p>
                        <p className="text-[10px] text-brand-text/40 uppercase font-bold tracking-widest mt-0.5">celdas</p>
                    </div>
                </div>
            </div>

            {/* ── Leyenda ── */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                    <Info className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-brand-text/60 leading-relaxed">
                        Selecciona tu nivel de competencia para cada combinación de <span className="text-brand-text font-bold">Área Clínica</span> y <span className="text-brand-text font-bold">Modalidad</span>.
                        Esta información es confidencial y será utilizada por Dirección Médica para planificación de turnos y formación.
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {NIVELES.map(n => (
                        <div key={n.value} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 border', n.bg)}>
                            <span className={cn('w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black flex-shrink-0', n.color, 'border-current')}>
                                {n.short}
                            </span>
                            <span className={cn('text-xs font-semibold leading-tight', n.color)}>
                                {n.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Barra de mini-stats por nivel ── */}
            <div className="grid grid-cols-4 gap-3">
                {NIVELES.map((n, i) => (
                    <div key={n.value} className="bg-brand-surface border border-brand-border rounded-xl p-3 text-center">
                        <p className={cn('text-2xl font-black', n.color)}>{stats.porNivel[i]}</p>
                        <p className="text-[10px] text-brand-text/40 uppercase font-bold tracking-wider mt-0.5 truncate">{n.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Matriz principal ── */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl shadow-black/20">

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-brand-border bg-brand-bg/50">
                                <th className="text-left px-6 py-4 w-52">
                                    <span className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Área Clínica</span>
                                </th>
                                {MODALIDADES.map(mod => (
                                    <th key={mod.id} className="px-4 py-4 text-center min-w-[160px]">
                                        <p className="text-base font-black text-brand-text">{mod.label}</p>
                                        <p className="text-[10px] text-brand-text/40 font-semibold mt-0.5">{mod.full}</p>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {AREAS.map((area, idx) => {
                                const Icon = area.icon;
                                const rowVals = Object.values(matriz[area.id]);
                                const rowMax = Math.max(...rowVals);
                                const rowNivel = NIVELES[rowMax];
                                return (
                                    <tr
                                        key={area.id}
                                        className={cn(
                                            'border-b border-brand-border/50 transition-colors hover:bg-brand-primary/3',
                                            idx % 2 === 0 ? 'bg-brand-surface' : 'bg-brand-bg/20'
                                        )}
                                    >
                                        {/* Área */}
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0', area.color)}>
                                                    <Icon className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-text leading-tight">{area.label}</p>
                                                    <p className={cn('text-[10px] font-bold uppercase tracking-wide', rowNivel.color)}>
                                                        Máx: {rowNivel.label}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Celdas */}
                                        {MODALIDADES.map(mod => (
                                            <td key={mod.id} className="px-2 py-1 text-center">
                                                <CeldaNivel
                                                    valor={matriz[area.id][mod.id]}
                                                    onChange={nivel => handleChange(area.id, mod.id, nivel)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile / Tablet cards */}
                <div className="lg:hidden divide-y divide-brand-border/50">
                    {AREAS.map(area => {
                        const Icon = area.icon;
                        return (
                            <div key={area.id} className="p-4 space-y-3">
                                {/* Header del área */}
                                <div className="flex items-center gap-3">
                                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0', area.color)}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="text-sm font-black text-brand-text">{area.label}</p>
                                </div>
                                {/* Grid de modalidades */}
                                <div className="grid grid-cols-2 gap-3">
                                    {MODALIDADES.map(mod => (
                                        <div key={mod.id} className="bg-brand-bg border border-brand-border rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <ChevronRight className="w-3 h-3 text-brand-primary" />
                                                <p className="text-xs font-black text-brand-text">{mod.label}</p>
                                                <span className="text-[10px] text-brand-text/30">{mod.full}</span>
                                            </div>
                                            <CeldaNivel
                                                valor={matriz[area.id][mod.id]}
                                                onChange={nivel => handleChange(area.id, mod.id, nivel)}
                                            />
                                            <p className={cn(
                                                'text-[10px] font-bold text-center',
                                                NIVELES[matriz[area.id][mod.id]].color
                                            )}>
                                                {NIVELES[matriz[area.id][mod.id]].label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Estado enviado ── */}
            {sent && (
                <div className="flex items-center gap-4 p-5 bg-success/10 border border-success/30 rounded-2xl">
                    <CheckCircle2 className="w-8 h-8 text-success flex-shrink-0" />
                    <div>
                        <p className="font-bold text-success">¡Auto-evaluación enviada correctamente!</p>
                        <p className="text-sm text-brand-text/60 mt-0.5">Dirección Médica recibirá tu matriz. Puedes modificarla y re-enviarla cuando quieras.</p>
                    </div>
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-4 p-5 bg-danger/10 border border-danger/30 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-danger flex-shrink-0" />
                    <p className="text-sm text-danger font-semibold">{error}</p>
                </div>
            )}

            {/* ── Acciones ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                    onClick={handleReset}
                    disabled={sending}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-brand-border text-brand-text/50 hover:text-brand-text hover:border-brand-text/30 font-bold text-sm transition-all disabled:opacity-40"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reiniciar Matriz
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={sending || stats.completadas === 0}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all shadow-xl',
                        sent
                            ? 'bg-success text-white shadow-success/20 cursor-default'
                            : 'bg-gradient-to-r from-brand-primary to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'
                    )}
                >
                    {sending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando a Dirección Médica...
                        </>
                    ) : sent ? (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            Enviado con Éxito
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Guardar y Enviar a Dirección Médica
                        </>
                    )}
                </button>
            </div>

            {/* ── Pie informativo ── */}
            <p className="text-center text-[11px] text-brand-text/25 font-mono">
                Estructura lista para Supabase · tabla: <code>competencias_radiologos</code> · {stats.total} combinaciones área × modalidad
            </p>
        </div>
    );
};
