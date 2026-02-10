import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ShiftStatus } from '../../types/shifts';

// MOCK_SHIFTS eliminado

import { useShifts } from '../../hooks/useShifts';
import { useProfessionals } from '../../hooks/useProfessionals';
import { ShiftModal } from './ShiftModal';
import { ShiftTimeline } from './ShiftTimeline';
import { CheckCircle2, LogOut, Loader2, List, Layout, Plus } from 'lucide-react';
import type { Shift } from '../../types/shifts';

export const ShiftManager: React.FC = () => {
    const { shifts, loading, error, updateShiftStatus, addShift } = useShifts();
    const { professionals } = useProfessionals();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
    const [initialModalData, setInitialModalData] = useState<Partial<Shift> | null>(null);

    const getStatusStyle = (status: ShiftStatus) => {
        switch (status) {
            case 'presente': return 'bg-success/20 text-success border-success/20';
            case 'tarde': return 'bg-warning/20 text-warning border-warning/20';
            case 'ausente': return 'bg-danger/20 text-danger border-danger/20';
            case 'finalizado': return 'bg-info/20 text-info border-info/20';
            default: return 'bg-prevenort-surface text-prevenort-text/40 border-prevenort-border';
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

    const handleSaveShift = async (newShift: Omit<Shift, 'id' | 'status'>) => {
        const result = await addShift(newShift);
        return result;
    };

    const handleTimelineAdd = (date: string, startTime: string) => {
        setInitialModalData({ date, startTime });
        setIsModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-info animate-spin mb-4" />
                <p className="text-prevenort-text/40 text-xs font-mono uppercase tracking-[0.3em]">Sincronizando Matriz de Turnos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] card-premium bg-danger/5 border-danger/20">
                <AlertCircle className="w-12 h-12 text-danger mb-6" />
                <h3 className="text-xl font-black text-danger uppercase tracking-tight mb-2">Error de Sincronización</h3>
                <p className="text-prevenort-text/40 text-[10px] font-mono uppercase tracking-widest max-w-md text-center mb-8">
                    {error}
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-danger text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-lg"
                    >
                        Reintentar Conexión
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className="px-6 py-2 bg-prevenort-surface border border-prevenort-border text-prevenort-text/60 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-prevenort-primary/5 transition-all"
                    >
                        Vista de Emergencia
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-prevenort-text tracking-tighter uppercase">Gestión de Turnos & Staffing</h2>
                    <p className="text-prevenort-text/40 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> Validación biométrica & geocerca activa (UVC v3)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-info/10 border border-prevenort-border rounded-xl p-1 flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'list' ? "bg-info text-white shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'timeline' ? "bg-info text-white shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60"
                            )}
                        >
                            <Layout className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setInitialModalData(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-info text-white rounded-xl text-xs font-black uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Planificar</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Schedule Grid */}
                {viewMode === 'list' ? (
                    <div className="lg:col-span-8 space-y-4">
                        <div className="grid gap-4">
                            {shifts.map((shift) => (
                                <div key={shift.id} className="card-premium group hover:border-info/30 transition-all overflow-hidden relative">
                                    {shift.status === 'presente' && (
                                        <div className="absolute top-0 right-0 p-1 bg-success/10 border-b border-l border-success/20 rounded-bl-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex gap-5">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-prevenort-surface border border-prevenort-border flex items-center justify-center group-hover:bg-info/10 group-hover:border-info/20 transition-all">
                                                        <User className="w-7 h-7 text-prevenort-text/20 group-hover:text-info" />
                                                    </div>
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-prevenort-bg",
                                                        shift.status === 'presente' ? 'bg-success' : 'bg-prevenort-border'
                                                    )} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg text-prevenort-text tracking-tight leading-none mb-2">{shift.professionalName}</h4>
                                                    <div className="flex flex-wrap gap-4 text-[10px] text-prevenort-text/40 uppercase font-bold tracking-widest">
                                                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-info/60" /> {shift.location}</span>
                                                        <span className="flex items-center gap-1.5 font-mono"><Clock className="w-3.5 h-3.5 text-info/60" /> {shift.startTime} - {shift.endTime}</span>
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-info/60" /> {shift.date}</span>
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
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 border border-success/30 text-success rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-success/30 transition-all"
                                                        >
                                                            {actionLoading === shift.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                            <span>Marcar Entrada</span>
                                                        </button>
                                                    )}
                                                    {shift.status === 'presente' && (
                                                        <button
                                                            onClick={() => handleCheckOut(shift.id)}
                                                            disabled={actionLoading === shift.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-info/20 border border-info/30 text-info rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-info/30 transition-all"
                                                        >
                                                            {actionLoading === shift.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                                                            <span>Finalizar Turno</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {(shift.checkIn || shift.checkOut) && (
                                            <div className="mt-5 pt-5 border-t border-prevenort-border flex gap-10">
                                                {shift.checkIn && (
                                                    <div className="animate-in slide-in-from-left-4 duration-500">
                                                        <p className="text-[10px] text-prevenort-text/20 uppercase font-black tracking-widest mb-1.5">Registro Entrada</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xl font-mono text-success font-bold">{shift.checkIn}</p>
                                                            {shift.geofenceValid && (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-success/10 border border-success/20 rounded text-[8px] font-black text-success uppercase">
                                                                    <ShieldCheck className="w-2.5 h-2.5" /> GEOCERCA OK
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {shift.checkOut && (
                                                    <div className="animate-in slide-in-from-left-4 duration-500">
                                                        <p className="text-[10px] text-prevenort-text/20 uppercase font-black tracking-widest mb-1.5">Registro Salida</p>
                                                        <p className="text-xl font-mono text-info font-bold">{shift.checkOut}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {shifts.length === 0 && (
                                <div className="card-premium py-20 bg-prevenort-surface/30 border-dashed flex flex-col items-center justify-center opacity-40">
                                    <Calendar className="w-10 h-10 mb-4 font-thin" />
                                    <p className="text-sm font-mono uppercase tracking-[0.2em]">No hay turnos planificados para este ciclo</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-12">
                        <ShiftTimeline
                            shifts={shifts}
                            onAddShift={handleTimelineAdd}
                        />
                    </div>
                )}

                {/* Status Dashboard Side Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="card-premium border-danger/20 bg-danger/5 backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-danger rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-danger uppercase tracking-widest leading-none mb-1">Alertas en Tiempo Real</h3>
                                <p className="text-[9px] text-danger/50 uppercase font-bold tracking-tighter">Monitoreo M3 Activo</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-danger" />
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-xs font-black text-danger/90 uppercase">Retraso Crítico (+15m)</p>
                                    <span className="text-[9px] font-mono text-danger animate-pulse">LIVE</span>
                                </div>
                                <p className="text-[11px] text-danger/60 leading-relaxed italic mb-4">
                                    Lic. Jean Phillipe no ha reportado ingreso en la Sede Providencia tras 18 minutos del inicio programado.
                                </p>
                                <button className="w-full py-2 bg-danger text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg active:scale-95">
                                    Activar Protocolo Reemplazo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-black text-prevenort-text/40 uppercase tracking-widest">Profesionales Disponibles</h3>
                            <div className="px-2 py-0.5 bg-success/10 rounded text-[8px] font-black text-success">EN STANDBY</div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Dr. Klaus Muller', dist: '5km', status: 'available' },
                                { name: 'Dra. Sarah Connor', dist: '12km', status: 'away' },
                            ].map((p, i) => (
                                <div key={i} className="group flex items-center justify-between p-4 bg-prevenort-surface rounded-xl border border-prevenort-border hover:border-info/20 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-[10px] font-bold text-info border border-info/20">
                                            {p.name.split(' ')[1][0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-prevenort-text/80 uppercase tracking-tight">{p.name}</p>
                                            <p className="text-[9px] text-prevenort-text/40 font-mono tracking-tighter">{p.dist} del centro de salud</p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]",
                                        p.status === 'available' ? 'text-success bg-success' : 'text-warning bg-warning'
                                    )} />
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-2 border border-prevenort-border rounded-xl text-[9px] font-black text-prevenort-text/30 uppercase tracking-[0.2em] hover:bg-prevenort-primary/5 transition-all">
                            Ver Mapa de Proximidad
                        </button>
                    </div>
                </div>
            </div>

            <ShiftModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setInitialModalData(null);
                }}
                onSave={handleSaveShift}
                professionals={professionals}
                initialData={initialModalData}
            />
        </div>
    );
};
