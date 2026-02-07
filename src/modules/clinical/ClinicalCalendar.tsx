import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Clock, Activity } from 'lucide-react';
import { cn, formatName } from '../../lib/utils';
import type { ClinicalAppointment } from '../../types/clinical';

interface ClinicalCalendarProps {
    appointments: ClinicalAppointment[];
    onSelectAppointment: (app: ClinicalAppointment) => void;
}

export const ClinicalCalendar: React.FC<ClinicalCalendarProps> = ({ appointments, onSelectAppointment }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const timeSlots = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => i + 8); // 8:00 to 22:00
    }, []);

    const getAppointmentsForDay = (day: Date) => {
        return appointments.filter(app => isSameDay(new Date(app.appointmentDate), day));
    };

    const getPositionStyle = (time: string) => {
        try {
            const [hours, minutes] = time.split(':').map(Number);
            const totalMinutes = (hours - 8) * 60 + minutes;
            const top = (totalMinutes / 60) * 80; // 80px per hour
            return { top: `${top}px` };
        } catch (e) {
            return { top: '0px' };
        }
    };

    const getDurationHeight = () => {
        // Mock duration logic, usually 30-60 mins
        return '60px';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Calendar Header */}
            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                <div className="flex items-center gap-6">
                    <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
                        <button
                            onClick={() => setCurrentDate(d => addWeeks(d, -1))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 text-white/40 hover:text-white" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 py-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-all"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setCurrentDate(d => addWeeks(d, 1))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5 text-white/40 hover:text-white" />
                        </button>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white/90 uppercase tracking-tighter">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h3>
                        <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">Agenda Semanal Interactiva</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-2 group">
                        <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
                        <span className="text-[9px] font-black uppercase text-white/40 group-hover:text-white/60 transition-colors">Programado</span>
                    </div>
                    <div className="flex items-center gap-2 group">
                        <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                        <span className="text-[9px] font-black uppercase text-white/40 group-hover:text-white/60 transition-colors">Completado</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="card-premium p-0 overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                        {/* Days Header */}
                        <div className="flex border-b border-white/5 bg-white/[0.02]">
                            <div className="w-20 border-r border-white/5" />
                            {weekDays.map(day => (
                                <div key={day.toString()} className={cn(
                                    "flex-1 p-4 text-center border-r border-white/5 last:border-r-0",
                                    isSameDay(day, new Date()) && "bg-blue-500/5"
                                )}>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">
                                        {format(day, 'EEE', { locale: es })}
                                    </p>
                                    <p className={cn(
                                        "text-xl font-black transition-colors",
                                        isSameDay(day, new Date()) ? "text-blue-400" : "text-white/80"
                                    )}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Slots */}
                        <div className="flex relative bg-black/20">
                            {/* Time Column */}
                            <div className="w-20 border-r border-white/5">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="h-[80px] p-3 text-right">
                                        <span className="text-[10px] font-mono font-bold text-white/20">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Days Columns */}
                            <div className="flex flex-1 relative h-[1120px]">
                                {weekDays.map(day => (
                                    <div key={day.toString()} className={cn(
                                        "flex-1 border-r border-white/5 last:border-r-0 relative group/day",
                                        isSameDay(day, new Date()) && "bg-blue-500/[0.02]"
                                    )}>
                                        {/* Hour lines */}
                                        {timeSlots.map(hour => (
                                            <div key={hour} className="h-[80px] border-b border-white/[0.03]" />
                                        ))}

                                        {/* Appointments */}
                                        {getAppointmentsForDay(day).map(app => (
                                            <div
                                                key={app.id}
                                                onClick={() => onSelectAppointment(app)}
                                                className={cn(
                                                    "absolute left-1 right-1 rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.02] hover:z-10 shadow-2xl group/app overflow-hidden",
                                                    app.status === 'scheduled' ? "bg-blue-600/20 border-blue-500/40 text-blue-400" :
                                                        app.status === 'completed' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                                            "bg-white/5 border-white/10 text-white/60"
                                                )}
                                                style={{
                                                    ...getPositionStyle(app.appointmentTime),
                                                    height: getDurationHeight()
                                                }}
                                            >
                                                <div className="flex flex-col h-full justify-between">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-3 h-3" />
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase truncate tracking-tight">{formatName(app.patientName)}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[8px] font-mono font-bold opacity-60">
                                                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {app.appointmentTime}</span>
                                                        <span className="truncate flex items-center gap-1 max-w-[50%]">
                                                            <Activity className="w-2.5 h-2.5" /> {app.procedure?.name}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover details */}
                                                <div className="absolute inset-0 bg-blue-600 flex flex-col items-center justify-center opacity-0 group-hover/app:opacity-100 transition-opacity">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Ver Ficha</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
