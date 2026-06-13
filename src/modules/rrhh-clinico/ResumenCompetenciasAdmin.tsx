import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart2, Edit3, Save,
    ChevronDown, ChevronRight, AlertTriangle, ShieldCheck,
    Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import {
    CATEGORIAS, PROCEDIMIENTOS_FLAT,
    NIVELES_CONFIG, type Nivel, type RespuestasMap,
} from './competenciasDictionary';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoPerfil = 'pending' | 'draft' | 'active';

interface MedicoCompetencia {
    id:             string;
    professionalId: string;
    name:           string;
    role:           string;
    status:         EstadoPerfil;
    respuestas:     RespuestasMap;
    submittedAt:    string | null;
    reviewedAt:     string | null;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

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

const NivelSelector: React.FC<{ valor: Nivel; original: Nivel; onChange: (n: Nivel) => void }> = ({ valor, original, onChange }) => (
    <div className="flex items-center gap-1">
        {NIVELES_CONFIG.map(n => {
            const isSelected  = valor === n.value;
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
    const [medicos, setMedicos]           = useState<MedicoCompetencia[]>([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState<string | null>(null);
    const [selectedId, setSelectedId]     = useState<string | null>(null);
    const [editMode, setEditMode]         = useState(false);
    const [overrides, setOverrides]       = useState<RespuestasMap>({});
    const [saving, setSaving]             = useState(false);
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set([CATEGORIAS[0]?.id]));

    // ── Fetch desde Supabase ──────────────────────────────────────────────────
    const fetchCompetencias = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: dbError } = await supabase
                .from('competencias_radiologos')
                .select(`
                    id,
                    professional_id,
                    respuestas,
                    status,
                    submitted_at,
                    reviewed_at,
                    professionals (
                        name,
                        last_name,
                        role
                    )
                `)
                .order('submitted_at', { ascending: false });

            if (dbError) throw dbError;

            const mapped: MedicoCompetencia[] = (data || []).map((row: any) => ({
                id:             row.id,
                professionalId: row.professional_id,
                name:           `${row.professionals?.name || ''} ${row.professionals?.last_name || ''}`.trim() || 'Sin nombre',
                role:           row.professionals?.role || '—',
                status:         row.status as EstadoPerfil,
                respuestas:     row.respuestas || {},
                submittedAt:    row.submitted_at,
                reviewedAt:     row.reviewed_at,
            }));

            setMedicos(mapped);
            if (mapped.length > 0 && !selectedId) {
                setSelectedId(mapped[0].id);
            }
        } catch (err: any) {
            console.error('Error fetching competencias:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCompetencias(); }, []);

    // ── Médico seleccionado ───────────────────────────────────────────────────
    const medico = useMemo(
        () => medicos.find(m => m.id === selectedId) ?? null,
        [medicos, selectedId]
    );

    const respuestasVigentes: RespuestasMap = useMemo(() => {
        if (!medico) return {};
        return editMode
            ? { ...medico.respuestas, ...overrides }
            : medico.respuestas;
    }, [medico, editMode, overrides]);

    // ── Toggle categoría expandida ────────────────────────────────────────────
    const toggleCat = (id: string) => setExpandedCats(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    // ── Guardar overrides del admin ───────────────────────────────────────────
    const handleSave = async (nuevoStatus: EstadoPerfil) => {
        if (!medico) return;
        setSaving(true);
        try {
            const respuestasFinales = { ...medico.respuestas, ...overrides };
            const { error: updateError } = await supabase
                .from('competencias_radiologos')
                .update({
                    respuestas:  respuestasFinales,
                    status:      nuevoStatus,
                    reviewed_at: new Date().toISOString(),
                    updated_at:  new Date().toISOString(),
                })
                .eq('id', medico.id);

            if (updateError) throw updateError;

            await fetchCompetencias();
            setEditMode(false);
            setOverrides({});
        } catch (err: any) {
            console.error('Error saving competencias:', err);
        } finally {
            setSaving(false);
        }
    };

    // ── Stats del médico seleccionado ─────────────────────────────────────────
    const stats = useMemo(() => {
        if (!medico) return null;
        const vals = Object.values(respuestasVigentes) as Nivel[];
        const total = PROCEDIMIENTOS_FLAT.length;
        return {
            total,
            respondidos: vals.filter(v => v > 0).length,
            nivel3: vals.filter(v => v === 3).length,
            nivel2: vals.filter(v => v === 2).length,
            nivel1: vals.filter(v => v === 1).length,
            nivel0: vals.filter(v => v === 0).length,
        };
    }, [medico, respuestasVigentes]);

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-8 h-8 text-info animate-spin" />
            <p className="text-brand-text/40 text-sm animate-pulse">Cargando matrices de competencias...</p>
        </div>
    );

    if (error) return (
        <div className="card-premium border-danger/20 bg-danger/5 text-center py-12">
            <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
            <p className="text-danger font-bold mb-2">Error al cargar</p>
            <p className="text-brand-text/40 text-sm mb-6">{error}</p>
            <button onClick={fetchCompetencias} className="px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text hover:bg-brand-primary/10 transition-colors flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
        </div>
    );

    if (medicos.length === 0) return (
        <div className="card-premium text-center py-16">
            <BarChart2 className="w-12 h-12 text-brand-text/20 mx-auto mb-4" />
            <p className="text-brand-text/50 font-bold">Sin evaluaciones enviadas</p>
            <p className="text-brand-text/30 text-sm mt-1">Los profesionales deben completar su auto-evaluación en el módulo RRHH Clínico.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

            {/* ── Panel izquierdo: lista de médicos ── */}
            <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-black text-brand-text/40 uppercase tracking-widest">
                        Evaluaciones ({medicos.length})
                    </h2>
                    <button onClick={fetchCompetencias} className="p-1.5 rounded-lg hover:bg-brand-surface text-brand-text/30 hover:text-brand-text transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
                {medicos.map(m => (
                    <button
                        key={m.id}
                        onClick={() => { setSelectedId(m.id); setEditMode(false); setOverrides({}); }}
                        className={cn(
                            'w-full text-left p-3 rounded-xl border transition-all',
                            selectedId === m.id
                                ? 'bg-info/10 border-info/30 text-brand-text'
                                : 'bg-brand-surface border-brand-border text-brand-text/60 hover:border-brand-text/20'
                        )}
                    >
                        <p className="font-bold text-sm truncate">{m.name}</p>
                        <p className="text-[10px] text-brand-text/40 truncate">{m.role}</p>
                        <div className="mt-1.5">
                            <EstadoBadge estado={m.status} />
                        </div>
                        {m.submittedAt && (
                            <p className="text-[9px] text-brand-text/25 mt-1 font-mono">
                                {new Date(m.submittedAt).toLocaleDateString('es-CL')}
                            </p>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Panel derecho: detalle ── */}
            {medico && stats && (
                <div className="space-y-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-xl font-black text-brand-text">{medico.name}</h2>
                            <p className="text-brand-text/40 text-sm">{medico.role}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <EstadoBadge estado={medico.status} />
                            {!editMode ? (
                                <button
                                    onClick={() => { setEditMode(true); setOverrides({}); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-black hover:bg-violet-500/20 transition-all"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Editar
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setEditMode(false); setOverrides({}); }}
                                        className="px-3 py-1.5 bg-brand-surface border border-brand-border text-brand-text/50 rounded-lg text-xs font-black hover:bg-brand-primary/10 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleSave('draft')}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-lg text-xs font-black hover:bg-sky-500/20 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Borrador
                                    </button>
                                    <button
                                        onClick={() => handleSave('active')}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/30 text-success rounded-lg text-xs font-black hover:bg-success/20 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                        Aprobar Oficial
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats rápidas */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Subespecialista', val: stats.nivel3, color: 'text-amber-400 bg-amber-950/40 border-amber-800' },
                            { label: 'Avanzado',        val: stats.nivel2, color: 'text-teal-400 bg-orange-950/40 border-orange-800' },
                            { label: 'Básico',          val: stats.nivel1, color: 'text-sky-400 bg-sky-950/40 border-sky-800' },
                            { label: 'No informa',      val: stats.nivel0, color: 'text-brand-text/30 bg-brand-surface border-brand-border' },
                        ].map(s => (
                            <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.color)}>
                                <p className="text-2xl font-black">{s.val}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabla por categoría */}
                    <div className="space-y-2">
                        {CATEGORIAS.map(cat => {
                            const procs = PROCEDIMIENTOS_FLAT.filter(p => p.categoriaId === cat.id);
                            const isExpanded = expandedCats.has(cat.id);
                            const catVals = procs.map(p => respuestasVigentes[p.id] ?? 0 as Nivel);
                            const catMax  = Math.max(...catVals) as Nivel;

                            return (
                                <div key={cat.id} className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleCat(cat.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-primary/5 transition-colors"
                                    >
                                        <div className={cn('w-2.5 h-2.5 rounded-full bg-gradient-to-br flex-shrink-0', cat.gradient)} />
                                        <span className="font-black text-sm text-brand-text flex-1 text-left">{cat.nombre}</span>
                                        <NivelBadge valor={catMax} />
                                        <span className="text-[10px] text-brand-text/30 font-mono">{procs.length} procs</span>
                                        {isExpanded
                                            ? <ChevronDown className="w-4 h-4 text-brand-text/30" />
                                            : <ChevronRight className="w-4 h-4 text-brand-text/30" />
                                        }
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-brand-border divide-y divide-brand-border/50">
                                            {procs.map(proc => {
                                                const valorOriginal = medico.respuestas[proc.id] ?? 0 as Nivel;
                                                const valorActual   = respuestasVigentes[proc.id] ?? 0 as Nivel;
                                                const isOverridden  = editMode && overrides[proc.id] !== undefined && overrides[proc.id] !== valorOriginal;

                                                return (
                                                    <div key={proc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-bg/50 transition-colors">
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn('text-xs font-semibold truncate', isOverridden ? 'text-violet-300' : 'text-brand-text/80')}>
                                                                {proc.nombre}
                                                            </p>
                                                            <p className="text-[9px] text-brand-text/30 uppercase tracking-wider">{proc.modalidad}</p>
                                                        </div>
                                                        {editMode ? (
                                                            <NivelSelector
                                                                valor={valorActual}
                                                                original={valorOriginal}
                                                                onChange={n => setOverrides(prev => ({ ...prev, [proc.id]: n }))}
                                                            />
                                                        ) : (
                                                            <NivelBadge valor={valorActual} />
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
                </div>
            )}
        </div>
    );
};
