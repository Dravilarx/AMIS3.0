import React, { useState, useMemo } from 'react';
import { Loader2, Search, FileText, BookOpen, ChevronRight, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { useProtocolos, type Protocolo } from '../../hooks/useProtocolos';

export const ProtocolosDashboard: React.FC = () => {
    const { protocolos, loading } = useProtocolos();
    const [query, setQuery]       = useState('');
    const [selected, setSelected] = useState<Protocolo | null>(null);

    // Filtro en vivo por nombre y por área
    const filtrados = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return protocolos;
        return protocolos.filter(p =>
            p.nombre.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)
        );
    }, [protocolos, query]);

    // Agrupado por área (preserva el orden ya ordenado por area + orden)
    const grupos = useMemo(() => {
        const map = new Map<string, Protocolo[]>();
        for (const p of filtrados) {
            const key = p.area || 'Sin área';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        return Array.from(map.entries());
    }, [filtrados]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-brand-text">Protocolos</h2>
                    <p className="text-brand-text/40 text-sm">Biblioteca de protocolos de adquisición — solo lectura</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> {protocolos.length} protocolos
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-[340px_1fr] gap-6 h-[calc(100vh-220px)]">
                    {/* ─── Panel izquierdo: lista agrupada ─── */}
                    <div className="flex flex-col rounded-2xl border border-brand-border bg-brand-surface/40 overflow-hidden">
                        {/* Buscador */}
                        <div className="p-3 border-b border-brand-border shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Buscar por nombre o área..."
                                    className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 placeholder:text-brand-text/20"
                                />
                            </div>
                        </div>

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                            {grupos.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-xs text-brand-text/30">Sin resultados.</p>
                                </div>
                            ) : grupos.map(([area, items]) => (
                                <div key={area} className="space-y-1">
                                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-primary/70">{area}</p>
                                    {items.map(p => {
                                        const active = selected?.id === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelected(p)}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all group',
                                                    active
                                                        ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-text'
                                                        : 'bg-brand-surface border-brand-border hover:border-brand-primary/20 text-brand-text/80'
                                                )}
                                            >
                                                <FileText className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-brand-primary' : 'text-brand-text/30')} />
                                                <span className="text-xs font-semibold flex-1 truncate">{p.nombre}</span>
                                                {active && <ChevronRight className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Panel derecho: contenido markdown ─── */}
                    <div className="rounded-2xl border border-brand-border bg-brand-surface/40 overflow-hidden flex flex-col">
                        {selected ? (
                            <>
                                <div className="px-6 py-4 border-b border-brand-border shrink-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/70 mb-0.5">{selected.area}</p>
                                    <h3 className="text-xl font-black text-brand-text">{selected.nombre}</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                                    <article className="prose-protocolo">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selected.contenido}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                                <BookOpen className="w-14 h-14 text-brand-text/10 mb-4" />
                                <p className="text-sm font-bold text-brand-text/40">Selecciona un protocolo</p>
                                <p className="text-xs text-brand-text/25 mt-1">Elige un examen del panel izquierdo para ver su protocolo de adquisición.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
