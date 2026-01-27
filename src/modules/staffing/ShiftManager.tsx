import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, AlertCircle, ShieldCheck, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Shift, ShiftStatus } from '../../types/shifts';

const MOCK_SHIFTS: Shift[] = [
    {
        id: 'SFT-001',
        professionalId: 'P-001',
        professionalName: 'Dr. Roberto Agrawall',
        date: '2026-01-26',
        startTime: '08:00',
        endTime: '14:00',
        location: 'Sede Providencia',
        sedeCity: 'Santiago',
        status: 'presente',
        checkIn: '07:55',
        geofenceValid: true
    },
    {
        id: 'SFT-002',
        professionalId: 'P-002',
        professionalName: 'Dra. María Paz',
        date: '2026-01-26',
        startTime: '08:00',
        endTime: '20:00',
        location: 'Sede Antofagasta',
        sedeCity: 'Antofagasta',
        status: 'finalizado',
        checkIn: '08:02',
        checkOut: '20:05',
        geofenceValid: true
    },
    {
        id: 'SFT-003',
        professionalId: 'P-003',
        professionalName: 'Lic. Jean Phillipe',
        date: '2026-01-26',
        startTime: '14:00',
        endTime: '22:00',
        location: 'Sede Providencia',
        sedeCity: 'Santiago',
        status: 'programado'
    }
];

export const ShiftManager: React.FC = () => {
    const [shifts] = useState<Shift[]>(MOCK_SHIFTS);

    const getStatusStyle = (status: ShiftStatus) => {
        switch (status) {
            case 'presente': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
            case 'tarde': return 'bg-orange-500/20 text-orange-400 border-orange-500/20';
            case 'ausente': return 'bg-red-500/20 text-red-400 border-red-500/20';
            case 'finalizado': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
            default: return 'bg-white/5 text-white/40 border-white/10';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Gestión de Turnos & Asistencia</h2>
                    <p className="text-white/40 text-sm">Validación biométrica y geocerca integrada (M3)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center">
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Cobertura Hoy</p>
                        <p className="text-lg font-bold text-emerald-400">94.2%</p>
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <Filter className="w-4 h-4 text-white/60" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Schedule Grid */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid gap-3">
                        {shifts.map((shift) => (
                            <div key={shift.id} className="card-premium group hover:border-blue-500/30 transition-all p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                            <User className="w-6 h-6 text-white/20" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg mb-1">{shift.professionalName}</h4>
                                            <div className="flex flex-wrap gap-3 text-xs text-white/40">
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {shift.location}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {shift.startTime} - {shift.endTime}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {shift.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <span className={cn(
                                            "text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest border",
                                            getStatusStyle(shift.status)
                                        )}>
                                            {shift.status}
                                        </span>
                                        {shift.geofenceValid && (
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-400/60 font-medium">
                                                <ShieldCheck className="w-3 h-3" /> GEOCERCA OK
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {shift.checkIn && (
                                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-6">
                                        <div>
                                            <p className="text-[10px] text-white/20 uppercase font-black mb-1">Entrada</p>
                                            <p className="text-sm font-mono text-emerald-400">{shift.checkIn}</p>
                                        </div>
                                        {shift.checkOut && (
                                            <div>
                                                <p className="text-[10px] text-white/20 uppercase font-black mb-1">Salida</p>
                                                <p className="text-sm font-mono text-blue-400">{shift.checkOut}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alerts & Escalations */}
                <div className="space-y-6">
                    <div className="card-premium border-red-500/20 bg-red-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <h3 className="font-bold text-red-400">Escalamientos Activos</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200/80">
                                <p className="font-bold mb-1">Retraso detectado (+15m)</p>
                                <p className="text-xs opacity-60">Lic. Jean Phillipe no ha marcado entrada en Sede Providencia.</p>
                                <button className="mt-3 w-full py-1.5 bg-red-500/20 border border-red-500/30 rounded text-xs font-bold hover:bg-red-500/40 transition-all uppercase tracking-widest">
                                    Notificar Holding
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium">
                        <h3 className="font-bold mb-4 text-white/80">Disponibilidad de Reemplazos</h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Dr. Klaus Muller', dist: '5km', status: 'available' },
                                { name: 'Dra. Sarah Connor', dist: '12km', status: 'away' },
                            ].map((p, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                                    <div>
                                        <p className="text-sm font-medium">{p.name}</p>
                                        <p className="text-[10px] text-white/40">{p.dist} de distancia</p>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        p.status === 'available' ? 'bg-emerald-500' : 'bg-orange-500'
                                    )} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
