import React, { useState, useMemo } from 'react';
import {
    BarChart2, Edit3, Lock, Save, CheckSquare, Eye,
    ChevronDown, ChevronRight, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    CATEGORIAS, PROCEDIMIENTOS_FLAT,
    NIVELES_CONFIG, type Nivel, type RespuestasMap,
} from './competenciasDictionary';

// ─── Mock de médicos ──────────────────────────────────────────────────────────
// TODO: Reemplazar con query real a Supabase (tabla competencias_radiologos)
const MOCK_MEDICOS = [
    { id: '1', name: 'Dr. Juan Pérez',      role: 'Radiólogo General',           status: 'pending' as const },
    { id: '2', name: 'Dra. Ana Torres',     role: 'Neuro-Radióloga',             status: 'active'  as const },
    { id: '3', name: 'Dr. Marcos Díaz',     role: 'Radiólogo Intervencionista',  status: 'draft'   as const },
];

type EstadoPerfil = 'pending' | 'draft' | 'active';

const buildMock = (seed: number): RespuestasMap =>
    Object.fromEntries(PROCEDIMIENTOS_FLAT.map((p, i) => [p.id, ((seed + i) % 4) as Nivel]));

const MOCK_DATA: Record<string, RespuestasMap> = {
    '1': buildMock(1), '2': buildMock(2), '3': buildMock(3),
};

// ─── Badge de nivel ───────────────────────────────────────────────────────────
const NivelBadge: React.FC<{ valor: Nivel; overridden?: boolean }> = ({ valor, overridden }) => {
    const cfg = NIVELES_CONFIG[valor];
    return (
        <span className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black border-2 flex-shrink-0 transition-all',
            cfg.color, overridden ? 'border-violet-400 ring-2 ring-violet-400/40' : cfg.border
        )}>
            {valor}
        </span>
    );
};

// ─── Selector de nivel (modo edición) ─────────────────────────────────────────
const NivelSelector: React.FC<{ valor: Nivel; original: Nivel; onChange: (n: Nivel) => void }> = ({ valor, original, onChange }) => (
    <div className="flex items-center gap-1">
        {NIVELES_CONFIG.map(n => {
            const isSelected = valor === n.value;
            const isOverridden = valor !== original && n.value === valor;
            return (
                <button
                    key={n.value}
                    onClick={() => onChange(n.value)}
                    title={n.label}
                    className={cn(
                        'w-7 h-7 rounded-full border-2 text-xs font-black transition-all flex items-center justify-center',
                        isSelected
                            ? isOverridden
                                ? `${n.color} border-violet-400 ring-2 ring-violet-400/40 scale-110 shadow-md`
                                : `${n.color} border-current ring-2 ${n.ring} scale-110 shadow-md`
                            : 'text-brand-text/30 border-brand-border hover:border-brand-text/30 hover:scale-105'
                    )}
                >
                    {n.value}
                </button>
            );
        })}
    </div>
);

// ─── Estado Badge ──────────────────────────────────────────────────────────────
const EstadoBadge: React.FC<{ estado: EstadoPerfil }> = ({ estado }) => {
    const cfg = {
        pending: { label: 'Pendiente de Revisión', color: 'text-amber-400 border-amber-500 bg-amber-950/40' },
        draft:   { label: 'Borrador Guardado',      color: 'text-sky-400   border-sky-500   bg-sky-950/40'   },
        active:  { label: 'Perfil Activo / Oficial',color: 'text-success   border-success   bg-success/10'   },
    }[estado];
    return (
        <span className={cn('px-3 py-1 rounded-full border text-xs font-black', cfg.color)}>
            {cfg.label}
        </span>
    );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export const ResumenCompetenciasAdmin: React.FC = () => {
    const [medicoId, setMedicoId]           = useState(MOCK_MEDICOS[0].id);
    const [editMode, setEditMode]           = useState(false);
    const [expanded, setExpanded]           = useState<Set<string>>(new Set(['neuro']));
    const [estado, setEstado]               = useState<EstadoPerfil>('pending');
    const [saving, setSaving]               = useState(false);
    const [savedMsg, setSavedMsg]           = useState('');

    // Datos originales del médico + overrides del director
    const originales: RespuestasMap         = MOCK_DATA[medicoId] ?? {};
    const [overrides, setOverrides]         = useState<RespuestasMap>({});
    const overrideKeys                      = useMemo(() => new Set(
        Object.keys(overrides).filter(k => overrides[k] !== originales[k])
    ), [overrides, originales]);

    // Cambiar médico: resetear overrides
    const handleMedico = (id: string) => {
        setMedicoId(id);
        setOverrides({});
        setEstado(MOCK_MEDICOS.find(m => m.id === id)?.status ?? 'pending');
        setEditMode(false);
    };

    // Override de una celda
    const handleOverride = (procId: string, nivel: Nivel) => {
        setOverrides(prev => ({ ...prev, [procId]: nivel }));
    };

    // Valor efectivo: override si existe, original si no
    const getValor = (procId: string): Nivel => overrides[procId] ?? originales[procId] ?? 0;

    const toggleArea = (id: string) => setExpanded(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    // Guardar borrador
    const handleGuardar = async () => {
        setSaving(true);
        // TODO: await supabase.from('competencias_radiologos').upsert({ ... overrides ... status: 'draft' })
        await new Promise(r => setTimeout(r, 900));
        setEstado('draft');
        setSavedMsg('Borrador guardado correctamente.');
        setSaving(false);
        setTimeout(() => setSavedMsg(''), 3000);
    };

    // Aprobar perfil
    const handleAprobar = async () => {
        setSaving(true);
        // TODO: await supabase.from('competencias_radiologos').upsert({ ... overrides ... status: 'active' })
        await new Promise(r => setTimeout(r, 1100));
        setEstado('active');
        setEditMode(false);
        setSavedMsg('✅ Perfil Clínico aprobado y activado.');
        setSaving(false);
        setTimeout(() => setSavedMsg(''), 4000);
    };

    // KPIs globales
    const kpis = useMemo(() => {
        const vals = PROCEDIMIENTOS_FLAT.map(p => getValor(p.id));
        const porNivel = [0,1,2,3].map(n => vals.filter(v => v === n).length);
        const promedio = ((vals as number[]).reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
        return { porNivel, promedio };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [medicoId, overrides]);




    return (
        <div className="space-y-5 pb-10">

            {/* ── Barra de control ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg flex-shrink-0">
                        <BarChart2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-brand-text">Auditoría RR.HH. Clínico</h1>
                        <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold">Panel Director Médico</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <EstadoBadge estado={estado} />

                    {/* Toggle Edición */}
                    <button
                        onClick={() => setEditMode(v => !v)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs transition-all',
                            editMode
                                ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                                : 'bg-brand-surface border-brand-border text-brand-text/50 hover:border-brand-text/30'
                        )}
                    >
                        {editMode ? <><Edit3 className="w-3.5 h-3.5" /> Edición Activa</> : <><Lock className="w-3.5 h-3.5" /> Habilitar Edición de Director</>}
                    </button>
                </div>
            </div>

            {/* ── Selector de médico ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Eye className="w-4 h-4 text-brand-text/30" />
                    <span className="text-xs font-black text-brand-text/40 uppercase tracking-widest">Médico</span>
                </div>
                <select
                    value={medicoId}
                    onChange={e => handleMedico(e.target.value)}
                    className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-sm font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                    {MOCK_MEDICOS.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                </select>
                {overrideKeys.size > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-900/30 border border-violet-500/40 rounded-xl text-xs font-bold text-violet-300 flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {overrideKeys.size} celda{overrideKeys.size > 1 ? 's' : ''} modificada{overrideKeys.size > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NIVELES_CONFIG.map((n, i) => (
                    <div key={n.value} className="bg-brand-surface border border-brand-border rounded-2xl p-3 text-center">
                        <p className={cn('text-3xl font-black', n.color)}>{kpis.porNivel[i]}</p>
                        <p className="text-[10px] text-brand-text/40 uppercase font-bold tracking-wide mt-1 leading-tight">{n.label}</p>
                    </div>
                ))}
            </div>

            {/* Promedio */}
            <div className="flex items-center gap-3 px-5 py-3 bg-brand-surface border border-brand-border rounded-2xl self-start w-fit">
                <span className="text-xs text-brand-text/40 font-bold uppercase tracking-widest">Promedio global</span>
                <span className="text-2xl font-black text-brand-primary">{kpis.promedio}</span>
                <span className="text-xs text-brand-text/30">/ 3.0</span>
                {editMode && <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest ml-2">· Modo Edición ON</span>}
            </div>

            {/* ── Mensaje de acción ── */}
            {savedMsg && (
                <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-2xl text-success text-sm font-bold">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" /> {savedMsg}
                </div>
            )}

            {/* ── Matriz completa por categoría ── */}
            <div className="space-y-3">
                {CATEGORIAS.map(cat => {
                    const procs = PROCEDIMIENTOS_FLAT.filter(p => p.categoriaId === cat.id);
                    const isOpen = expanded.has(cat.id);
                    const catVals = procs.map(p => getValor(p.id));
                    const catMax = Math.max(...catVals) as Nivel;
                    const catOverrides = procs.filter(p => overrideKeys.has(p.id)).length;

                    return (
                        <div key={cat.id} className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">

                            {/* Cabecera colapsable */}
                            <button
                                onClick={() => toggleArea(cat.id)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-brand-primary/3 transition-colors text-left"
                            >
                                <div className={cn('w-3 h-3 rounded-full bg-gradient-to-br flex-shrink-0', cat.gradient)} />
                                <span className="flex-1 font-black text-brand-text text-sm">{cat.nombre}</span>
                                {catOverrides > 0 && (
                                    <span className="px-2 py-0.5 bg-violet-900/30 border border-violet-500/40 rounded-full text-[10px] font-bold text-violet-300">
                                        {catOverrides} override{catOverrides > 1 ? 's' : ''}
                                    </span>
                                )}
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                    NIVELES_CONFIG[catMax].color, NIVELES_CONFIG[catMax].border, NIVELES_CONFIG[catMax].bg)}>
                                    Máx: {NIVELES_CONFIG[catMax].label}
                                </span>
                                {isOpen
                                    ? <ChevronDown className="w-4 h-4 text-brand-text/40 flex-shrink-0" />
                                    : <ChevronRight className="w-4 h-4 text-brand-text/40 flex-shrink-0" />}
                            </button>

                            {/* Tabla de procedimientos */}
                            {isOpen && (
                                <div className="border-t border-brand-border/50">
                                    {/* Cabecera de columnas */}
                                    <div className={cn(
                                        'grid px-4 py-2 text-[9px] font-black text-brand-text/30 uppercase tracking-widest border-b border-brand-border/30',
                                        editMode ? 'grid-cols-[1fr_80px_120px_120px]' : 'grid-cols-[1fr_80px_80px]'
                                    )}>
                                        <span>Procedimiento</span>
                                        <span className="text-center">Modalidad</span>
                                        <span className="text-center">{editMode ? 'Auto-reporte' : 'Nivel'}</span>
                                        {editMode && <span className="text-center text-violet-400">Override Director</span>}
                                    </div>

                                    {procs.map((p, i) => {
                                        const valorActual = getValor(p.id);
                                        const valorOriginal = originales[p.id] ?? 0;
                                        const isOverridden = overrideKeys.has(p.id);

                                        return (
                                            <div
                                                key={p.id}
                                                className={cn(
                                                    'grid items-center px-4 py-2.5 transition-colors border-b border-brand-border/20 last:border-0',
                                                    editMode ? 'grid-cols-[1fr_80px_120px_120px]' : 'grid-cols-[1fr_80px_80px]',
                                                    i % 2 === 0 ? 'bg-brand-bg/30' : '',
                                                    isOverridden ? 'bg-violet-950/20' : ''
                                                )}
                                            >
                                                {/* Nombre */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isOverridden && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
                                                    <span className={cn('text-sm truncate', isOverridden ? 'text-brand-text' : 'text-brand-text/70')}>
                                                        {p.nombre}
                                                    </span>
                                                </div>

                                                {/* Modalidad */}
                                                <div className="flex justify-center">
                                                    <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded-full text-[10px] font-bold text-brand-text/40">
                                                        {p.modalidad}
                                                    </span>
                                                </div>

                                                {/* Valor auto-reporte (siempre read-only) */}
                                                <div className="flex justify-center">
                                                    <NivelBadge valor={valorOriginal} />
                                                </div>

                                                {/* Override del director (solo en edit mode) */}
                                                {editMode && (
                                                    <div className="flex justify-center">
                                                        <NivelSelector
                                                            valor={valorActual}
                                                            original={valorOriginal}
                                                            onChange={n => handleOverride(p.id, n)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Acciones de validación ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    onClick={handleGuardar}
                    disabled={saving || estado === 'active'}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-brand-border text-brand-text/60 hover:text-brand-text hover:border-brand-text/30 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Borrador'}
                </button>

                <button
                    onClick={handleAprobar}
                    disabled={saving || estado === 'active'}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all shadow-xl',
                        estado === 'active'
                            ? 'bg-success text-white shadow-success/20 cursor-default'
                            : 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                >
                    <CheckSquare className="w-5 h-5" />
                    {estado === 'active' ? 'Perfil ya Aprobado' : saving ? 'Procesando...' : 'Aprobar Perfil Clínico'}
                </button>
            </div>

            <p className="text-center text-[11px] text-brand-text/20 font-mono">
                Datos mock · Conectar con <code>competencias_radiologos</code> · Estado activo = fuente de verdad para motor de enrutamiento
            </p>
        </div>
    );
};
