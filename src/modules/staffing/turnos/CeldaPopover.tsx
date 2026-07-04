import React, { useState, useMemo } from 'react';
import { X, Search, UserPlus, Trash2, CalendarRange, Clock, Ban } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Professional } from '../../../types/core';
import type { TurnoPuesto, TurnoAsignacion } from '../../../types/turnos';
import { conflictoDuroAlAsignar, type RefCelda } from './conflictos';

interface CeldaPopoverProps {
    puesto: TurnoPuesto;
    fecha: string;
    fechaLabel: string;
    asignacionesCelda: TurnoAsignacion[];
    asignacionesMes: TurnoAsignacion[];
    puestos: TurnoPuesto[];
    professionals: Professional[];
    onAsignar: (professionalId: string) => void;
    onQuitar: (asignacionId: string) => void;
    onRellenarSemana: (professionalId: string) => void;
    onClose: () => void;
}

export const CeldaPopover: React.FC<CeldaPopoverProps> = ({
    puesto, fecha, fechaLabel, asignacionesCelda, asignacionesMes, puestos, professionals,
    onAsignar, onQuitar, onRellenarSemana, onClose,
}) => {
    const [q, setQ] = useState('');

    const yaAsignados = useMemo(
        () => new Set(asignacionesCelda.map(a => a.professionalId)),
        [asignacionesCelda]
    );

    const puestoById = useMemo(() => new Map(puestos.map(p => [p.id, p])), [puestos]);

    // Asignaciones existentes por profesional (para calcular solapamiento duro).
    const refsPorProf = useMemo(() => {
        const m = new Map<string, RefCelda[]>();
        for (const a of asignacionesMes) {
            const arr = m.get(a.professionalId) || [];
            arr.push({ fecha: a.fecha, puestoId: a.puestoId });
            m.set(a.professionalId, arr);
        }
        return m;
    }, [asignacionesMes]);

    const resultados = useMemo(() => {
        const term = q.trim().toLowerCase();
        return professionals
            .filter(p => p.isActive)
            .filter(p => !yaAsignados.has(p.id))
            .filter(p => {
                if (term === '') return true;
                const full = `${p.name} ${p.lastName}`.toLowerCase();
                return full.includes(term) || (p.specialty || '').toLowerCase().includes(term);
            })
            .slice(0, 40)
            .map(p => ({
                p,
                choca: conflictoDuroAlAsignar({ fecha, puestoId: puesto.id }, refsPorProf.get(p.id) || [], puestoById),
            }));
    }, [professionals, q, yaAsignados, fecha, puesto.id, refsPorProf, puestoById]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div
                className="bg-brand-surface border border-brand-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-brand-border flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">{puesto.nombre}</h3>
                        <p className="text-[10px] text-brand-text/50 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                            <span>{fechaLabel}</span>
                            <span className="flex items-center gap-1 text-brand-primary"><Clock className="w-3 h-3" /> {puesto.horaInicio}–{puesto.horaFin}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-brand-bg rounded-lg text-brand-text/30 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Asignados actuales */}
                {asignacionesCelda.length > 0 && (
                    <div className="p-4 border-b border-brand-border space-y-2 bg-brand-bg/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 px-1">Asignados</p>
                        {asignacionesCelda.map(a => (
                            <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl">
                                <span className="text-sm font-bold text-brand-text truncate">{a.professionalApellido} {a.professionalNombre}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => onRellenarSemana(a.professionalId)}
                                        title="Rellenar toda la semana con este profesional"
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-info hover:bg-info/10 transition-colors"
                                    >
                                        <CalendarRange className="w-3.5 h-3.5" /> Semana
                                    </button>
                                    <button
                                        onClick={() => onQuitar(a.id)}
                                        title="Quitar"
                                        className="p-1.5 rounded-lg text-brand-text/30 hover:text-danger hover:bg-danger/10 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Buscador de profesionales */}
                <div className="p-4 border-b border-brand-border">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar profesional a asignar..."
                            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 placeholder:text-brand-text/30"
                        />
                    </div>
                </div>

                {/* Resultados */}
                <div className="overflow-y-auto p-2 flex-1">
                    {resultados.length === 0 ? (
                        <p className="text-center text-brand-text/30 text-xs py-8 uppercase font-black tracking-widest">Sin profesionales disponibles</p>
                    ) : (
                        resultados.map(({ p, choca }) => (
                            <button
                                key={p.id}
                                disabled={!!choca}
                                onClick={() => { if (!choca) onAsignar(p.id); }}
                                title={choca ? `Ya asignado: ${choca.puesto.nombre} (${choca.puesto.horaInicio}–${choca.puesto.horaFin}) el ${choca.fecha}` : undefined}
                                className={cn(
                                    'w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between group',
                                    choca ? 'opacity-60 cursor-not-allowed' : 'hover:bg-brand-primary/10'
                                )}
                            >
                                <div className="min-w-0">
                                    <p className={cn('text-sm font-bold truncate', choca ? 'text-brand-text/50' : 'text-brand-text group-hover:text-brand-primary')}>
                                        {p.lastName} {p.name}
                                    </p>
                                    {choca ? (
                                        <p className="text-[10px] text-danger/80 truncate font-bold">
                                            Ya asignado: {choca.puesto.nombre} ({choca.puesto.horaInicio}–{choca.puesto.horaFin})
                                        </p>
                                    ) : (
                                        p.specialty && <p className="text-[10px] text-brand-text/40 truncate">{p.specialty}</p>
                                    )}
                                </div>
                                {choca
                                    ? <Ban className="w-4 h-4 text-danger/50 flex-shrink-0" />
                                    : <UserPlus className="w-4 h-4 text-brand-text/20 group-hover:text-brand-primary flex-shrink-0" />}
                            </button>
                        ))
                    )}
                </div>

                <p className="px-4 py-2.5 text-[9px] text-brand-text/30 border-t border-brand-border">
                    Fecha {fecha} · Los profesionales con solapamiento aparecen deshabilitados.
                </p>
            </div>
        </div>
    );
};
