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



    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Calendar Header */}
            <div className="flex items-center justify-between bg-prevenort-surface border border-prevenort-border p-5 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="flex bg-prevenort-bg rounded-2xl p-1 shadow-sm border border-prevenort-border">
                        <button
                            onClick={() => setCurrentDate(d => addWeeks(d, -1))}
                            className="p-2.5 hover:bg-prevenort-surface rounded-xl transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 text-prevenort-text/40 hover:text-prevenort-primary" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-6 py-2 text-[10px] font-black uppercase text-prevenort-text/40 hover:text-prevenort-primary transition-all tracking-widest"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setCurrentDate(d => addWeeks(d, 1))}
                            className="p-2.5 hover:bg-prevenort-surface rounded-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5 text-prevenort-text/40 hover:text-prevenort-primary" />
                        </button>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-prevenort-text uppercase tracking-tight">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h3>
                        <p className="text-[10px] text-prevenort-primary font-black uppercase tracking-[0.2em] mt-1">Agenda Semanal de Red</p>
                    </div>
                </div>

                <div className="flex gap-6">
                    <div className="flex items-center gap-2.5 group">
                        <div className="w-3.5 h-3.5 rounded-lg bg-orange-500/10 border border-orange-500/30 shadow-sm" />
                        <span className="text-[10px] font-black uppercase text-prevenort-text/40 group-hover:text-prevenort-text transition-colors tracking-wider">Programado</span>
                    </div>
                    <div className="flex items-center gap-2.5 group">
                        <div className="w-3.5 h-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 shadow-sm" />
                        <span className="text-[10px] font-black uppercase text-prevenort-text/40 group-hover:text-prevenort-text transition-colors tracking-wider">Completado</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="card-premium p-0 overflow-hidden border-prevenort-border shadow-2xl">
                <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                        {/* Days Header */}
                        <div className="flex border-b border-prevenort-border bg-prevenort-surface/50">
                            <div className="w-24 border-r border-prevenort-border" />
                            {weekDays.map(day => (
                                <div key={day.toString()} className={cn(
                                    "flex-1 py-6 px-4 text-center border-r border-prevenort-border last:border-r-0",
                                    isSameDay(day, new Date()) && "bg-prevenort-primary/5"
                                )}>
                                    <p className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em] mb-1.5">
                                        {format(day, 'EEE', { locale: es })}
                                    </p>
                                    <p className={cn(
                                        "text-2xl font-black transition-colors tracking-tight",
                                        isSameDay(day, new Date()) ? "text-prevenort-primary" : "text-prevenort-text"
                                    )}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Slots */}
                        <div className="flex relative bg-prevenort-surface">
                            {/* Time Column */}
                            <div className="w-24 border-r border-prevenort-border bg-prevenort-bg/30">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="h-[90px] p-4 text-right border-b border-prevenort-border/30">
                                        <span className="text-[11px] font-black text-prevenort-text/30 tracking-tighter">
                                            {hour.toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Days Columns */}
                            <div className="flex flex-1 relative h-[1260px]">
                                {weekDays.map(day => (
                                    <div key={day.toString()} className={cn(
                                        "flex-1 border-r border-prevenort-border/50 last:border-r-0 relative group/day",
                                        isSameDay(day, new Date()) && "bg-prevenort-primary/5"
                                    )}>
                                        {/* Hour lines */}
                                        {timeSlots.map(hour => (
                                            <div key={hour} className="h-[90px] border-b border-prevenort-border/50" />
                                        ))}

                                        {/* Appointments */}
                                        {getAppointmentsForDay(day).map(app => (
                                            <div
                                                key={app.id}
                                                onClick={() => onSelectAppointment(app)}
                                                className={cn(
                                                    "absolute left-2 right-2 rounded-2xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.03] hover:z-20 shadow-xl group/app overflow-hidden",
                                                    app.status === 'scheduled' ? "bg-prevenort-surface border-orange-500/30 text-prevenort-text shadow-orange-500/5" :
                                                        app.status === 'completed' ? "bg-prevenort-surface border-emerald-500/30 text-prevenort-text shadow-emerald-500/5" :
                                                            "bg-prevenort-surface border-prevenort-border text-prevenort-text/40"
                                                )}
                                                style={{
                                                    ...getPositionStyle(app.appointmentTime),
                                                    height: '75px', // Adjusted for light theme spacing
                                                    top: `calc(${getPositionStyle(app.appointmentTime).top} * 1.125)` // Scale top to match 90px hour height (90/80 = 1.125)
                                                }}
                                            >
                                                <div className="flex flex-col h-full justify-between relative z-10">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner",
                                                            app.status === 'scheduled' ? "bg-orange-500/10 text-prevenort-primary" :
                                                                app.status === 'completed' ? "bg-emerald-500/10 text-emerald-600" :
                                                                    "bg-prevenort-bg text-prevenort-text/30"
                                                        )}>
                                                            <User className="w-3.5 h-3.5" />
                                                        </div>
                                                        <p className="text-[11px] font-black uppercase truncate tracking-tight text-prevenort-text">{formatName(app.patientName)}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-60 text-prevenort-text/40">
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-prevenort-primary" /> {app.appointmentTime}</span>
                                                        <span className="truncate flex items-center gap-1.5 max-w-[50%]">
                                                            <Activity className="w-3 h-3" /> {app.procedure?.name}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Left accent line */}
                                                <div className={cn(
                                                    "absolute left-0 top-0 bottom-0 w-1",
                                                    app.status === 'scheduled' ? "bg-prevenort-primary" :
                                                        app.status === 'completed' ? "bg-emerald-500" :
                                                            "bg-prevenort-text/20"
                                                )} />

                                                {/* Hover details */}
                                                <div className="absolute inset-0 bg-prevenort-primary flex flex-col items-center justify-center opacity-0 group-hover/app:opacity-100 transition-all duration-300">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Ver Expediente</span>
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
