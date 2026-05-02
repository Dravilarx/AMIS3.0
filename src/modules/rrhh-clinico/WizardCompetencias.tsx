import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
    ChevronLeft, ChevronRight, Send, CheckCircle2,
    Loader2, Award, RotateCcw, HelpCircle, Play,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    CATEGORIAS, PROCEDIMIENTOS_FLAT,
    NIVELES_CONFIG, type Nivel, type RespuestasMap,
} from './competenciasDictionary';

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = useState(false);
    return (
        <span className="relative inline-flex" onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                onMouseEnter={() => setOpen(true)}
                onClick={() => setOpen(v => !v)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-brand-text/30 hover:text-brand-primary transition-colors flex-shrink-0"
                aria-label="Ayuda"
            >
                <HelpCircle className="w-4 h-4" />
            </button>
            {open && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 leading-relaxed shadow-2xl pointer-events-none">
                    {text}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
                </span>
            )}
        </span>
    );
};

// ─── Tipos locales ────────────────────────────────────────────────────────────
type Paso = 'seleccion' | 'wizard' | 'done';

// ─── Componente Principal ─────────────────────────────────────────────────────
export const WizardCompetencias: React.FC = () => {
    const { user } = useAuth();

    // ── Estado global del wizard ──────────────────────────────────────────────
    const [paso, setPaso] = useState<Paso>('seleccion');
    const [catsSel, setCatsSel] = useState<Set<string>>(new Set());
    const [respuestas, setRespuestas] = useState<RespuestasMap>({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [seleccion, setSeleccion] = useState<Nivel | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Lista filtrada (solo categorías seleccionadas) ────────────────────────
    const procsActivos = useMemo(
        () => PROCEDIMIENTOS_FLAT.filter(p => catsSel.has(p.categoriaId)),
        [catsSel]
    );
    const total = procsActivos.length;
    const proc = procsActivos[currentIdx];
    const isLast = currentIdx === total - 1;
    const progresoPct = total === 0 ? 0 : Math.round((currentIdx / total) * 100);

    // ── Toggle categoría ──────────────────────────────────────────────────────
    const toggleCat = (id: string) => setCatsSel(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const seleccionarTodas = () => setCatsSel(new Set(CATEGORIAS.map(c => c.id)));
    const deseleccionarTodas = () => setCatsSel(new Set());
    const todasSeleccionadas = catsSel.size === CATEGORIAS.length;

    // ── Iniciar wizard ────────────────────────────────────────────────────────
    const handleComenzar = () => {
        setCurrentIdx(0);
        setSeleccion(null);
        setRespuestas({});
        setPaso('wizard');
    };

    // ── Navegar Siguiente / Finalizar ─────────────────────────────────────────
    const handleNext = async () => {
        const nuevas: RespuestasMap = { ...respuestas, [proc.id]: seleccion! };
        setRespuestas(nuevas);

        if (isLast) {
            // Autocompletar con 0 todos los procedimientos de categorías NO seleccionadas
            const matrizCompleta: RespuestasMap = {};
            for (const p of PROCEDIMIENTOS_FLAT) {
                matrizCompleta[p.id] = catsSel.has(p.categoriaId)
                    ? (nuevas[p.id] ?? 0)
                    : 0;
            }

            setSending(true);
            setError(null);
            console.log('📊 AMIS — Matriz completa enviada:', JSON.stringify(matrizCompleta, null, 2));
            try {
                // TODO: await supabase.from('competencias_radiologos').upsert({ user_id: user?.id, respuestas: matrizCompleta, submitted_at: new Date().toISOString() });
                await new Promise(r => setTimeout(r, 1200));
                setPaso('done');
            } catch {
                setError('Error al enviar. Intenta nuevamente.');
            } finally {
                setSending(false);
            }
        } else {
            const next = currentIdx + 1;
            setCurrentIdx(next);
            setSeleccion(nuevas[procsActivos[next].id] ?? null);
        }
    };

    // ── Navegar Anterior ──────────────────────────────────────────────────────
    const handlePrev = () => {
        const guardadas = seleccion !== null ? { ...respuestas, [proc.id]: seleccion } : respuestas;
        setRespuestas(guardadas);
        const prev = currentIdx - 1;
        setCurrentIdx(prev);
        setSeleccion(guardadas[procsActivos[prev].id] ?? null);
    };

    // ── Saltar ────────────────────────────────────────────────────────────────
    const handleJump = (idx: number) => {
        const guardadas = seleccion !== null ? { ...respuestas, [proc.id]: seleccion } : respuestas;
        setRespuestas(guardadas);
        setCurrentIdx(idx);
        setSeleccion(guardadas[procsActivos[idx].id] ?? null);
    };

    // ── Reiniciar ─────────────────────────────────────────────────────────────
    const handleReset = () => {
        setPaso('seleccion');
        setCatsSel(new Set());
        setRespuestas({});
        setCurrentIdx(0);
        setSeleccion(null);
        setError(null);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PASO "done"
    // ─────────────────────────────────────────────────────────────────────────
    if (paso === 'done') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-success to-emerald-700 flex items-center justify-center shadow-2xl shadow-success/30">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-brand-text">¡Evaluación Completada!</h2>
                    <p className="text-brand-text/50 mt-2 max-w-md text-sm leading-relaxed">
                        Tu matriz de competencias fue enviada a Dirección Médica. Evaluaste <strong className="text-brand-primary">{total} procedimientos</strong> activos
                        y el sistema completó automáticamente los <strong className="text-brand-text/60">{PROCEDIMIENTOS_FLAT.length - total}</strong> restantes con nivel 0.
                    </p>
                </div>
                <button onClick={handleReset} className="px-8 py-3 rounded-2xl border border-brand-border text-brand-text/50 hover:text-brand-text font-bold text-sm transition-all">
                    Reiniciar evaluación
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASO "seleccion" — Pantalla Cero
    // ─────────────────────────────────────────────────────────────────────────
    if (paso === 'seleccion') {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pb-10">

                {/* Encabezado */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-brand-primary flex items-center justify-center shadow-lg flex-shrink-0">
                        <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-brand-text">Auto-evaluación Clínica</h1>
                        <p className="text-xs text-brand-text/40 uppercase tracking-widest font-bold mt-0.5">
                            Módulo RRHH Clínico · {user?.name || 'Radiólogo'}
                        </p>
                    </div>
                </div>

                {/* Card principal */}
                <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-brand-text">¿En qué áreas clínicas informas exámenes?</h2>
                            <p className="text-xs text-brand-text/40 mt-1">Selecciona las áreas para personalizar tu evaluación.</p>
                        </div>
                        <button
                            onClick={todasSeleccionadas ? deseleccionarTodas : seleccionarTodas}
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-black hover:bg-brand-primary/20 transition-all whitespace-nowrap"
                        >
                            {todasSeleccionadas ? 'Deseleccionar Todas' : '⚡ Soy Radiólogo General (Todas)'}
                        </button>
                    </div>

                    {/* Grilla de categorías */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CATEGORIAS.map(cat => {
                            const sel = catsSel.has(cat.id);
                            const count = PROCEDIMIENTOS_FLAT.filter(p => p.categoriaId === cat.id).length;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCat(cat.id)}
                                    className={cn(
                                        'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-150',
                                        sel
                                            ? 'border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/10 scale-[1.01]'
                                            : 'border-brand-border bg-brand-bg hover:border-brand-text/20 hover:bg-brand-border/20'
                                    )}
                                >
                                    {/* Dot de color */}
                                    <div className={cn('w-3 h-3 rounded-full bg-gradient-to-br flex-shrink-0', cat.gradient)} />
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('font-black text-sm leading-tight', sel ? 'text-brand-primary' : 'text-brand-text/70')}>
                                            {cat.nombre}
                                        </p>
                                        <p className="text-[10px] text-brand-text/30 mt-0.5">{count} procedimientos</p>
                                    </div>
                                    <div className={cn(
                                        'w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center',
                                        sel ? 'bg-brand-primary border-brand-primary' : 'border-brand-border'
                                    )}>
                                        {sel && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Resumen de selección */}
                    {catsSel.size > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-brand-bg border border-brand-border rounded-xl">
                            <span className="text-xs text-brand-text/50 font-semibold">
                                {catsSel.size} áreas · <strong className="text-brand-primary">{procsActivos.length}</strong> procedimientos a evaluar
                            </span>
                            <span className="text-xs text-brand-text/30 font-mono">
                                + {PROCEDIMIENTOS_FLAT.length - procsActivos.length} auto-completados con 0
                            </span>
                        </div>
                    )}
                </div>

                {/* Botón Comenzar */}
                <button
                    onClick={handleComenzar}
                    disabled={catsSel.size === 0}
                    className={cn(
                        'w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all shadow-xl',
                        catsSel.size > 0
                            ? 'bg-gradient-to-r from-brand-primary to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01]'
                            : 'bg-brand-border text-brand-text/30 cursor-not-allowed shadow-none'
                    )}
                >
                    <Play className="w-5 h-5" />
                    Comenzar Evaluación
                    {catsSel.size > 0 && <span className="text-white/60 text-sm font-bold">({procsActivos.length} preguntas)</span>}
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASO "wizard" — Cuestionario Paso a Paso
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto space-y-5 pb-10">

            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-brand-primary flex items-center justify-center shadow-lg flex-shrink-0">
                        <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-brand-text">Auto-evaluación Clínica</h1>
                        <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold">
                            {user?.name || 'Radiólogo'} · {Object.keys(respuestas).length}/{total} respondidas
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="p-2 rounded-xl border border-brand-border text-brand-text/30 hover:text-danger hover:border-danger/30 transition-all"
                    title="Reiniciar"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                    <span className="text-brand-text/40 uppercase tracking-widest">Pregunta {currentIdx + 1} de {total}</span>
                    <span className="text-brand-primary">{progresoPct}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progresoPct}%` }}
                    />
                </div>
            </div>

            {/* Tarjeta de pregunta */}
            <div key={proc.id} className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl">

                {/* Cabecera categoría */}
                <div className={cn('bg-gradient-to-r p-4', proc.categoriaGradient)}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-white/50 text-[9px] font-black uppercase tracking-widest">Categoría</p>
                            <p className="text-white font-black text-base leading-tight">{proc.categoriaNombre}</p>
                        </div>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-black flex-shrink-0">
                            {proc.modalidad}
                        </span>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Procedimiento */}
                    <div>
                        <p className="text-[9px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Procedimiento</p>
                        <h2 className="text-xl font-black text-brand-text leading-snug">{proc.nombre}</h2>
                        <p className="text-xs text-brand-text/40 mt-1">Selecciona tu nivel de competencia para este procedimiento:</p>
                    </div>

                    {/* Opciones con Tooltips */}
                    <div className="space-y-2.5">
                        {NIVELES_CONFIG.map(n => {
                            const sel = seleccion === n.value;
                            return (
                                <button
                                    key={n.value}
                                    onClick={() => setSeleccion(n.value)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-150 group/btn',
                                        sel
                                            ? `${n.bg} ${n.border} ring-2 ${n.ring} ring-offset-1 ring-offset-brand-surface shadow-lg scale-[1.01]`
                                            : 'bg-brand-bg border-brand-border hover:border-brand-text/20 hover:bg-brand-border/20'
                                    )}
                                >
                                    {/* Badge nivel */}
                                    <span className={cn(
                                        'w-9 h-9 rounded-full border-2 flex items-center justify-center text-base font-black flex-shrink-0 transition-all',
                                        sel ? `${n.color} border-current` : 'text-brand-text/30 border-brand-border'
                                    )}>
                                        {n.value}
                                    </span>

                                    {/* Texto */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('font-black text-sm', sel ? n.color : 'text-brand-text/70')}>{n.label}</p>
                                        <p className="text-xs text-brand-text/40 mt-0.5 leading-relaxed">{n.desc}</p>
                                    </div>

                                    {/* Check + Tooltip */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {sel && <CheckCircle2 className={cn('w-5 h-5', n.color)} />}
                                        <Tooltip text={n.desc} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/30 rounded-2xl text-danger text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* Navegación */}
            <div className="flex gap-3">
                <button
                    onClick={handlePrev}
                    disabled={currentIdx === 0 || sending}
                    className="flex items-center gap-2 px-5 py-4 rounded-2xl border border-brand-border text-brand-text/50 hover:text-brand-text hover:border-brand-text/30 font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                </button>

                <button
                    onClick={handleNext}
                    disabled={seleccion === null || sending}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all shadow-xl',
                        seleccion !== null && !sending
                            ? 'bg-gradient-to-r from-brand-primary to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.01]'
                            : 'bg-brand-border text-brand-text/30 cursor-not-allowed shadow-none'
                    )}
                >
                    {sending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                        : isLast
                        ? <><Send className="w-4 h-4" /> Finalizar y Enviar</>
                        : <>Siguiente <ChevronRight className="w-4 h-4" /></>}
                </button>
            </div>

            {/* Mapa de puntos */}
            <div className="flex flex-wrap gap-1 justify-center px-2 pt-1">
                {procsActivos.map((p, i) => (
                    <button
                        key={p.id}
                        onClick={() => handleJump(i)}
                        title={p.nombre}
                        className={cn(
                            'w-2.5 h-2.5 rounded-full transition-all',
                            i === currentIdx
                                ? 'bg-brand-primary scale-150 ring-1 ring-brand-primary ring-offset-1 ring-offset-brand-bg'
                                : respuestas[p.id] !== undefined
                                ? 'bg-green-500/70'
                                : 'bg-brand-border hover:bg-brand-text/30'
                        )}
                    />
                ))}
            </div>

            <p className="text-center text-[10px] text-brand-text/20 font-mono">
                {procsActivos.length} activos · {PROCEDIMIENTOS_FLAT.length - procsActivos.length} auto→0 · JSON listo para Supabase
            </p>
        </div>
    );
};
