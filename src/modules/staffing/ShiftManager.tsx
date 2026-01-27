import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, AlertCircle, ShieldCheck, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ShiftStatus } from '../../types/shifts';

// MOCK_SHIFTS eliminado

import { useShifts } from '../../hooks/useShifts';
import { CheckCircle2, LogOut, Loader2 } from 'lucide-react';

export const ShiftManager: React.FC = () => {
    const { shifts, loading, updateShiftStatus } = useShifts();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const getStatusStyle = (status: ShiftStatus) => {
        switch (status) {
            case 'presente': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
            case 'tarde': return 'bg-orange-500/20 text-orange-400 border-orange-500/20';
            case 'ausente': return 'bg-red-500/20 text-red-400 border-red-500/20';
            case 'finalizado': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
            default: return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    const handleCheckIn = async (shiftId: string) => {
        setActionLoading(shiftId);
        await updateShiftStatus(shiftId, 'presente');
        setActionLoading(null);
    };

    const handleCheckOut = async (shiftId: string) => {
        setActionLoading(shiftId);
        await updateShiftStatus(shiftId, 'finalizado');
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-white/40 text-xs font-mono uppercase tracking-[0.3em]">Sincronizando Matriz de Turnos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">Gestión de Turnos & Staffing</h2>
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> Validación biométrica & geocerca activa (UVC v3)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-right">
                        <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Cobertura Red</p>
                        <p className="text-xl font-black text-blue-400">94.2%</p>
                    </div>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-95 shadow-xl">
                        <Filter className="w-4 h-4 text-white/60" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-blue-500 transition-all shadow-lg active:scale-95">
                        <Calendar className="w-4 h-4" />
                        <span>Planificar</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Schedule Grid */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="grid gap-4">
                        {shifts.map((shift) => (
                            <div key={shift.id} className="card-premium group hover:border-blue-500/30 transition-all overflow-hidden relative">
                                {shift.status === 'presente' && (
                                    <div className="absolute top-0 right-0 p-1 bg-emerald-500/10 border-b border-l border-emerald-500/20 rounded-bl-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex gap-5">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                                                    <User className="w-7 h-7 text-white/20 group-hover:text-blue-400" />
                                                </div>
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-black",
                                                    shift.status === 'presente' ? 'bg-emerald-500' : 'bg-white/10'
                                                )} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg text-white/90 tracking-tight leading-none mb-2">{shift.professionalName}</h4>
                                                <div className="flex flex-wrap gap-4 text-[10px] text-white/40 uppercase font-bold tracking-widest">
                                                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500/60" /> {shift.location}</span>
                                                    <span className="flex items-center gap-1.5 font-mono"><Clock className="w-3.5 h-3.5 text-blue-500/60" /> {shift.startTime} - {shift.endTime}</span>
                                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500/60" /> {shift.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 self-center md:self-auto">
                                            <span className={cn(
                                                "text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] border shadow-sm",
                                                getStatusStyle(shift.status)
                                            )}>
                                                {shift.status}
                                            </span>

                                            <div className="flex gap-2">
                                                {shift.status === 'programado' && (
                                                    <button
                                                        onClick={() => handleCheckIn(shift.id)}
                                                        disabled={actionLoading === shift.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-emerald-500/30 transition-all"
                                                    >
                                                        {actionLoading === shift.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        <span>Marcar Entrada</span>
                                                    </button>
                                                )}
                                                {shift.status === 'presente' && (
                                                    <button
                                                        onClick={() => handleCheckOut(shift.id)}
                                                        disabled={actionLoading === shift.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-blue-500/30 transition-all"
                                                    >
                                                        {actionLoading === shift.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                                                        <span>Finalizar Turno</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {(shift.checkIn || shift.checkOut) && (
                                        <div className="mt-5 pt-5 border-t border-white/5 flex gap-10">
                                            {shift.checkIn && (
                                                <div className="animate-in slide-in-from-left-4 duration-500">
                                                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1.5">Registro Entrada</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xl font-mono text-emerald-400 font-bold">{shift.checkIn}</p>
                                                        {shift.geofenceValid && (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 uppercase">
                                                                <ShieldCheck className="w-2.5 h-2.5" /> GEOCERCA OK
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {shift.checkOut && (
                                                <div className="animate-in slide-in-from-left-4 duration-500">
                                                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1.5">Registro Salida</p>
                                                    <p className="text-xl font-mono text-blue-400 font-bold">{shift.checkOut}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {shifts.length === 0 && (
                            <div className="card-premium py-20 bg-white/[0.02] border-dashed flex flex-col items-center justify-center opacity-40">
                                <Calendar className="w-10 h-10 mb-4 font-thin" />
                                <p className="text-sm font-mono uppercase tracking-[0.2em]">No hay turnos planificados para este ciclo</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Dashboard Side Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card-premium border-red-500/20 bg-red-500/5 backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-500 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-red-400 uppercase tracking-widest leading-none mb-1">Alertas en Tiempo Real</h3>
                                <p className="text-[9px] text-red-400/50 uppercase font-bold tracking-tighter">Monitoreo M3 Activo</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs font-black text-red-200/90 uppercase">Retraso Crítico (+15m)</p>
                                    <span className="text-[9px] font-mono text-red-400 animate-pulse">LIVE</span>
                                </div>
                                <p className="text-[11px] text-red-200/60 leading-relaxed italic mb-4">
                                    Lic. Jean Phillipe no ha reportado ingreso en la Sede Providencia tras 18 minutos del inicio programado.
                                </p>
                                <button className="w-full py-2 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg active:scale-95">
                                    Activar Protocolo Reemplazo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Profesionales Disponibles</h3>
                            <div className="px-2 py-0.5 bg-emerald-500/10 rounded text-[8px] font-black text-emerald-400">EN STANDBY</div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Dr. Klaus Muller', dist: '5km', status: 'available' },
                                { name: 'Dra. Sarah Connor', dist: '12km', status: 'away' },
                            ].map((p, i) => (
                                <div key={i} className="group flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-blue-500/20">
                                            {p.name.split(' ')[1][0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white/80 uppercase tracking-tight">{p.name}</p>
                                            <p className="text-[9px] text-white/40 font-mono tracking-tighter">{p.dist} del centro de salud</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]",
                                        p.status === 'available' ? 'text-emerald-500 bg-emerald-500' : 'text-orange-500 bg-orange-500'
                                    )} />
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-2 border border-white/10 rounded-xl text-[9px] font-black text-white/30 uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
                            Ver Mapa de Proximidad
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
