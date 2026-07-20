import React, { useMemo, useState } from 'react';
import {
    BadgeCheck, Search, Loader2, Check, RefreshCw, AlertTriangle,
    UserCheck, UserX, X, ChevronLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useValidadores, type ProfesionalValidador } from '../../hooks/useValidadores';

type Filtro = 'todos' | 'validadores' | 'no_validadores';

const nombreCompleto = (p: ProfesionalValidador) => `${p.name} ${p.last_name ?? ''}`.trim() || 'Sin nombre';

interface ValidadoresPanelProps {
    // Navegación de vuelta a Gestión RR.HH. (mismo mecanismo que el resto del proyecto).
    onNavigate?: (view: 'staffing') => void;
}

export const ValidadoresPanel: React.FC<ValidadoresPanelProps> = ({ onNavigate }) => {
    const { profesionales, loading, error, recargar, marcarValidador, marcarMasivo } = useValidadores();

    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('todos');
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [guardandoFila, setGuardandoFila] = useState<Set<string>>(new Set());
    const [guardandoMasivo, setGuardandoMasivo] = useState(false);

    const totalValidadores = useMemo(() => profesionales.filter(p => p.es_validador).length, [profesionales]);

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return profesionales.filter(p => {
            if (filtro === 'validadores' && !p.es_validador) return false;
            if (filtro === 'no_validadores' && p.es_validador) return false;
            if (q && !nombreCompleto(p).toLowerCase().includes(q)) return false;
            return true;
        });
    }, [profesionales, filtro, busqueda]);

    // ── Toggle por fila (guarda al instante) ──
    const alternarFila = async (p: ProfesionalValidador) => {
        setGuardandoFila(prev => new Set(prev).add(p.id));
        await marcarValidador(p.id, !p.es_validador);
        setGuardandoFila(prev => { const n = new Set(prev); n.delete(p.id); return n; });
    };

    // ── Selección múltiple ──
    const toggleSel = (id: string) => setSeleccion(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const todosFiltradosSel = filtrados.length > 0 && filtrados.every(p => seleccion.has(p.id));
    const toggleTodosFiltrados = () => setSeleccion(prev => {
        const n = new Set(prev);
        if (todosFiltradosSel) filtrados.forEach(p => n.delete(p.id));
        else filtrados.forEach(p => n.add(p.id));
        return n;
    });
    const limpiarSel = () => setSeleccion(new Set());

    const aplicarMasivo = async (valor: boolean) => {
        const ids = Array.from(seleccion);
        if (ids.length === 0) return;
        setGuardandoMasivo(true);
        await marcarMasivo(ids, valor);
        setGuardandoMasivo(false);
        setSeleccion(new Set());
    };

    const nSel = seleccion.size;

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5">
            {/* Volver a Gestión RR.HH. */}
            {onNavigate && (
                <button
                    onClick={() => onNavigate('staffing')}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" /> Volver a RR.HH.
                </button>
            )}

            {/* Encabezado */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <BadgeCheck className="w-5.5 h-5.5 text-brand-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-brand-text tracking-tight">Radiólogos validadores</h1>
                        <p className="text-[13px] text-brand-text/50">
                            Marca quién es validador. Solo los validadores reciben consultas del médico externo y muestran su nombre.
                        </p>
                    </div>
                </div>
                <button
                    onClick={recargar}
                    disabled={loading}
                    title="Recargar"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Recargar
                </button>
            </div>

            {/* Contador */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/5 border border-brand-primary/15">
                <BadgeCheck className="w-4 h-4 text-brand-primary" />
                <span className="text-sm font-bold text-brand-text">
                    {totalValidadores} de {profesionales.length} marcados como validadores
                </span>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                    <input
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre…"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                    />
                </div>
                <div className="flex bg-brand-surface/60 border border-brand-border p-1 rounded-xl">
                    {([['todos', 'Todos'], ['validadores', 'Validadores'], ['no_validadores', 'No validadores']] as [Filtro, string][]).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setFiltro(val)}
                            className={cn(
                                'px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                filtro === val ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text/40 hover:text-brand-text/80'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <p className="flex items-start gap-1.5 text-[12px] font-bold text-danger">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
                </p>
            )}

            {/* Barra de acciones masivas */}
            {nSel > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-primary/25 bg-brand-primary/5 px-4 py-3 sticky top-2 z-10">
                    <span className="text-sm font-black text-brand-text">{nSel} seleccionados</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => aplicarMasivo(true)}
                            disabled={guardandoMasivo}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {guardandoMasivo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Marcar como validador
                        </button>
                        <button
                            onClick={() => aplicarMasivo(false)}
                            disabled={guardandoMasivo}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/60 hover:text-brand-text border border-brand-border transition-colors disabled:opacity-50"
                        >
                            <UserX className="w-3.5 h-3.5" /> Quitar validador
                        </button>
                        <button
                            onClick={limpiarSel}
                            title="Limpiar selección"
                            className="flex items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="border border-brand-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-brand-text/40">
                        <Loader2 className="w-5 h-5 animate-spin" /> Cargando profesionales…
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <UserX className="w-8 h-8 text-brand-text/20" />
                        <p className="text-sm font-bold text-brand-text/50">
                            {profesionales.length === 0 ? 'No hay profesionales activos.' : 'Ninguno coincide con el filtro.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-brand-surface/60 border-b border-brand-border">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={todosFiltradosSel}
                                            onChange={toggleTodosFiltrados}
                                            title="Seleccionar todos (los filtrados)"
                                            className="w-4 h-4 rounded accent-brand-primary"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Profesional</th>
                                    <th className="px-4 py-3">Especialidad / Rol</th>
                                    <th className="px-4 py-3 text-right">Validador</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/60">
                                {filtrados.map(p => {
                                    const sel = seleccion.has(p.id);
                                    const guardando = guardandoFila.has(p.id);
                                    return (
                                        <tr key={p.id} className={cn('text-sm transition-colors', sel ? 'bg-brand-primary/5' : 'hover:bg-brand-surface/40')}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={sel}
                                                    onChange={() => toggleSel(p.id)}
                                                    className="w-4 h-4 rounded accent-brand-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-brand-text">{nombreCompleto(p)}</p>
                                                {p.email && <p className="text-[12px] text-brand-text/40">{p.email}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-brand-text/60">
                                                {p.specialty || p.clinical_role || <span className="text-brand-text/25">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-text/30" />}
                                                    <button
                                                        onClick={() => alternarFila(p)}
                                                        disabled={guardando}
                                                        role="switch"
                                                        aria-checked={p.es_validador}
                                                        title={p.es_validador ? 'Quitar validador' : 'Marcar como validador'}
                                                        className={cn(
                                                            'relative inline-flex items-center h-6 w-11 rounded-full transition-colors disabled:opacity-50',
                                                            p.es_validador ? 'bg-brand-primary' : 'bg-brand-border'
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            'inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                                                            p.es_validador ? 'translate-x-5' : 'translate-x-0.5'
                                                        )}>
                                                            {p.es_validador && <Check className="w-3 h-3 text-brand-primary" />}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
