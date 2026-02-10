import React, { useState, useMemo } from 'react';
import { format, addHours, parse, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Search, Plus, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Shift } from '../../types/shifts';

interface ShiftTimelineProps {
    shifts: Shift[];
    onAddShift: (date: string, startTime: string) => void;
}

export const ShiftTimeline: React.FC<ShiftTimelineProps> = ({ shifts, onAddShift }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');

    const timeBlocks = useMemo(() => {
        return Array.from({ length: 24 }).map((_, i) => i);
    }, []);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Agrupar turnos por ubicación (o "Línea de Tiempo")
    const locations = useMemo(() => {
        const uniqueLocations = Array.from(new Set(shifts.map(s => s.location)));
        if (uniqueLocations.length === 0) return ['Sede General'];
        return uniqueLocations;
    }, [shifts]);

    const filteredShifts = useMemo(() => {
        return shifts.filter(s => s.date === dateStr);
    }, [shifts, dateStr]);

    const getShiftWidth = (shift: Shift) => {
        try {
            const start = parse(shift.startTime || '00:00', 'HH:mm', new Date());
            const end = parse(shift.endTime || '00:00', 'HH:mm', new Date());
            const duration = differenceInMinutes(end, start);
            if (isNaN(duration) || duration <= 0) return 100; // Mínimo 1 hora visual
            return (duration / 60) * 100;
        } catch (e) {
            return 100;
        }
    };

    const getShiftLeft = (shift: Shift) => {
        try {
            const [hours, minutes] = (shift.startTime || '00:00').split(':').map(Number);
            const h = isNaN(hours) ? 0 : hours;
            const m = isNaN(minutes) ? 0 : minutes;
            return (h * 100) + (m / 60) * 100;
        } catch (e) {
            return 0;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Date Selector */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-prevenort-surface border border-prevenort-border rounded-2xl p-2">
                    <button
                        onClick={() => setSelectedDate(d => addHours(d, -24))}
                        className="p-2 hover:bg-prevenort-primary/10 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-info">
                            {format(selectedDate, 'EEEE', { locale: es })}
                        </p>
                        <p className="text-lg font-black text-prevenort-text">
                            {format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedDate(d => addHours(d, 24))}
                        className="p-2 hover:bg-prevenort-primary/10 rounded-xl transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20" />
                        <input
                            type="text"
                            placeholder="Buscar profesional..."
                            className="bg-prevenort-surface border border-prevenort-border rounded-xl pl-10 pr-4 py-2 text-sm text-prevenort-text focus:outline-none focus:border-info/50 transition-all w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Timeline View */}
            <div className="card-premium overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <div className="min-w-[2500px] relative">
                        {/* Time Header */}
                        <div className="flex border-b border-prevenort-border bg-prevenort-surface/50">
                            <div className="w-48 sticky left-0 bg-prevenort-surface z-20 p-4 border-r border-prevenort-border">
                                <span className="text-[10px] font-black uppercase tracking-widest text-prevenort-text/20">Línea de Tiempo</span>
                            </div>
                            <div className="flex flex-1">
                                {timeBlocks.map(hour => (
                                    <div key={hour} className="w-[100px] p-4 text-center border-r border-prevenort-border/50 last:border-r-0">
                                        <span className="text-[10px] font-mono font-bold text-prevenort-text/40">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline Rows */}
                        <div className="divide-y divide-prevenort-border/50">
                            {locations.map((location, lIdx) => (
                                <div key={lIdx} className="flex group min-h-[80px]">
                                    <div className="w-48 sticky left-0 bg-prevenort-surface z-20 p-4 border-r border-prevenort-border flex flex-col justify-center">
                                        <p className="text-[11px] font-black text-prevenort-text/80 uppercase tracking-tight">{location}</p>
                                        <p className="text-[9px] text-prevenort-text/20 font-mono uppercase">Grupo {lIdx + 1}</p>
                                    </div>
                                    <div className="flex-1 relative h-20 bg-prevenort-surface flex items-center">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 flex">
                                            {timeBlocks.map(hour => (
                                                <div
                                                    key={hour}
                                                    className="w-[100px] border-r border-prevenort-border/30 last:border-r-0 hover:bg-prevenort-primary/5 transition-colors cursor-crosshair group/cell relative"
                                                    onClick={() => onAddShift(dateStr, `${hour.toString().padStart(2, '0')}:00`)}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                        <Plus className="w-4 h-4 text-info/40" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Shifts */}
                                        {filteredShifts
                                            .filter(s => s.location === location || (location === 'Sede General' && !s.location))
                                            .map(shift => (
                                                <div
                                                    key={shift.id}
                                                    className={cn(
                                                        "absolute h-14 rounded-xl border p-3 flex flex-col justify-center gap-1 transition-all hover:scale-[1.02] hover:z-10 shadow-xl cursor-pointer group/shift overflow-hidden",
                                                        shift.status === 'presente' ? 'bg-success/20 border-success/40 text-success' :
                                                            shift.status === 'programado' ? 'bg-info/20 border-info/30 text-info' :
                                                                'bg-prevenort-surface border-prevenort-border text-prevenort-text/60'
                                                    )}
                                                    style={{
                                                        left: `${getShiftLeft(shift)}px`,
                                                        width: `${getShiftWidth(shift)}px`
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-6 h-6 rounded-lg bg-prevenort-surface/30 flex items-center justify-center flex-shrink-0">
                                                                <User className="w-3.5 h-3.5" />
                                                            </div>
                                                            <p className="text-[11px] font-black uppercase truncate tracking-tight">{shift.professionalName}</p>
                                                        </div>
                                                        <MoreVertical className="w-3.5 h-3.5 opacity-0 group-hover/shift:opacity-100 transition-opacity flex-shrink-0" />
                                                    </div>
                                                    <p className="text-[9px] font-mono font-bold opacity-60">
                                                        {shift.startTime} - {shift.endTime}
                                                    </p>

                                                    {/* Animated indicator for 'presente' */}
                                                    {shift.status === 'presente' && (
                                                        <div className="absolute top-0 right-0 p-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shift Indicators */}
            <div className="flex flex-wrap gap-6 pt-4 border-t border-prevenort-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-info/20 border border-info/40" />
                    <span className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest">Programado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-success/20 border border-success/40" />
                    <span className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest">En Turno</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-prevenort-surface border border-prevenort-border" />
                    <span className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest">Finalizado</span>
                </div>
            </div>
        </div>
    );
};
