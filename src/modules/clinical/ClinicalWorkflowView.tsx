import React, { useState } from 'react';
import {
    Stethoscope,
    Search,
    Plus,
    TrendingUp,
    Calendar,
    Truck,
    FileCheck,
    User,
    MapPin,
    Clock,
    Share2,
    ArrowRight,
    Landmark,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Activity as ActivityIcon,
    Settings2,
    Book
} from 'lucide-react';
import { cn, formatRUT, formatName } from '../../lib/utils';
import { useClinicalProcedures } from './useClinicalProcedures';
import { ClinicalProcedureModal } from './ClinicalProcedureModal';
import { ProcedureDetailsPanel } from './ProcedureDetailsPanel';
import { ClinicalConfigPanel } from './ClinicalConfigPanel';
import { ClinicalCalendar } from './ClinicalCalendar';
import type { ClinicalAppointment } from '../../types/clinical';

const TABS = [
    { id: 'agenda', name: 'Agenda Activa', icon: Calendar },
    { id: 'catalog', name: 'Catálogo', icon: Book },
    { id: 'logistics', name: 'Logística', icon: Truck },
    { id: 'results', name: 'Resultados', icon: ActivityIcon },
    { id: 'config', name: 'Configuración', icon: Settings2 },
];

export const ClinicalWorkflowView: React.FC = () => {
    const {
        appointments,
        catalog,
        centers,
        loading,
        error: fetchError,
        addAppointment,
        updateAppointment,
        updateAppointmentStatus,
        verifyDocument,
        getIndications,
        requirements,
        batteries,
        upsertProcedure,
        upsertRequirement,
        upsertBattery,
        upsertIndications,
        deleteProcedure,
        deleteRequirement,
        deleteBattery,
        deleteIndications,
        indications,
        doctors
    } = useClinicalProcedures();

    const [activeTab, setActiveTab] = useState<string>('agenda');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<ClinicalAppointment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    const filteredAppointments = appointments.filter(app => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            app.patientName.toLowerCase().includes(search) ||
            app.patientRut.toLowerCase().includes(search) ||
            app.procedure?.name.toLowerCase().includes(search) ||
            app.center?.name.toLowerCase().includes(search)
        );
        const matchesDoctor = !doctorFilter || app.doctorId === doctorFilter;
        return matchesSearch && matchesDoctor;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
            <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                <ActivityIcon className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="mt-8 text-[10px] text-white/40 font-mono uppercase tracking-[0.4em] animate-pulse">Sincronizando AMIS Engine v3...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Master Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Módulo M9: Operaciones Clínicas</span>
                    </div>
                    <h1 className="text-5xl font-black text-white/90 tracking-tighter uppercase leading-none">
                        Procedimientos <span className="text-blue-500 text-stroke-thin">AMIS</span>
                    </h1>
                    <p className="text-sm text-white/30 font-medium max-w-xl">
                        Gestión centralizada de agendamientos intervencionales, baterías de requisitos y logística de traslados.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por Nombre, RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs focus:outline-none focus:border-blue-500/50 w-72 transition-all text-white hover:bg-white/[0.06]"
                        />
                    </div>

                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs focus:outline-none focus:border-blue-500/50 w-64 transition-all text-white hover:bg-white/[0.06] appearance-none"
                        >
                            <option value="" className="bg-neutral-900 italic">Filtrar por Médico...</option>
                            {doctors.map(doc => (
                                <option key={doc.id} value={doc.id} className="bg-neutral-900">{doc.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedApp(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        Nuevo Agendamiento
                    </button>
                </div>
            </div>

            {/* Tactical Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                isActive
                                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-blue-500/40")} />
                            {tab.name}
                        </button>
                    );
                })}
            </div>

            {/* Dashboard Content */}
            <div className="grid gap-8">
                {fetchError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        Error: {fetchError}
                    </div>
                )}

                {activeTab === 'agenda' && (
                    <div className="space-y-6 anim-fade-up">
                        <div className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Agenda Activa</span>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Gestión de Agenda</h2>
                            </div>
                            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'list'
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                            : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                    )}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'calendar'
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                            : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                    )}
                                >
                                    Calendario
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {viewMode === 'list' ? (
                                filteredAppointments.length === 0 ? (
                                    <div className="xl:col-span-2 p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                                        <ActivityIcon className="w-12 h-12 text-white/5 mx-auto mb-6" />
                                        <p className="text-white/20 uppercase font-black tracking-widest">No hay citas programadas con estos criterios</p>
                                    </div>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => {
                                                setSelectedApp(app);
                                                setIsDetailsOpen(true);
                                            }}
                                            className="card-premium group relative overflow-hidden cursor-pointer"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />

                                            <div className="flex flex-col gap-8">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                            <User className="w-6 h-6 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white/90 tracking-tight">{formatName(app.patientName)}</h3>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{formatRUT(app.patientRut)}</span>
                                                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{app.healthcareProvider}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
                                                        app.status === 'scheduled' ? "border-blue-500/30 text-blue-400 bg-blue-500/10" :
                                                            app.status === 'requirements_pending' ? "border-amber-500/30 text-amber-500 bg-amber-500/10" :
                                                                "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                                    )}>
                                                        {app.status.replace('_', ' ')}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6 p-6 bg-white/[0.01] rounded-3xl border border-white/5">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest">
                                                            <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                                                            Procedimiento
                                                        </div>
                                                        <p className="text-xs font-bold text-white/80 leading-relaxed uppercase">
                                                            [{app.procedure?.code}] {app.procedure?.name}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest">
                                                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                                            Sede / Centro
                                                        </div>
                                                        <p className="text-xs font-bold text-white/80 leading-relaxed uppercase">
                                                            {app.center?.name} <span className="text-white/30 font-mono text-[9px]">({app.center?.city})</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest">
                                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                            Agenda
                                                        </div>
                                                        <p className="text-xs font-bold text-white/80">
                                                            {new Date(app.appointmentDate).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })} • {app.appointmentTime}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-3 relative">
                                                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest">
                                                            <ActivityIcon className="w-3.5 h-3.5 text-red-500" />
                                                            Antecedentes
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {app.medicalBackground?.usesAspirin && (
                                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">Aspirina</span>
                                                            )}
                                                            {app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">Anticoag</span>
                                                            )}
                                                            {!app.medicalBackground?.usesAspirin && !app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="text-[10px] font-bold text-white/10 uppercase">Ninguno</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            app.checkoutStatus ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                        )} />
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                            {app.checkoutStatus ? 'Requisitos Verificados' : 'Faltan Documentos'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                            className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group/btn"
                                                        >
                                                            <Share2 className="w-4 h-4 text-white/20 group-hover/btn:text-white" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedApp(app);
                                                                setIsDetailsOpen(true);
                                                            }}
                                                            className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                                                        >
                                                            Abrir Ficus
                                                            <ArrowRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className="xl:col-span-2">
                                    <ClinicalCalendar
                                        appointments={filteredAppointments}
                                        onSelectAppointment={(app) => {
                                            setSelectedApp(app);
                                            setIsDetailsOpen(true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'catalog' && (
                    <div className="card-premium p-0 overflow-hidden border-white/5 animate-in zoom-in-95">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Código</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Denominación</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Precio Base</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {catalog.map(proc => (
                                    <tr key={proc.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/5 px-3 py-1 rounded-lg">{proc.code}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-bold text-white/90 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{proc.name}</p>
                                            <p className="text-[10px] text-white/20 mt-1 line-clamp-1">{proc.description}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-white/90">$ {proc.basePrice.toLocaleString('es-CL')}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-white/40 uppercase">Activo</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="p-2 text-white/10 hover:text-white transition-colors">
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'logistics' && (
                    <div className="grid gap-6 animate-in slide-in-from-bottom-4 transition-all duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card-premium p-8 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Truck className="w-8 h-8 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">
                                        {appointments.filter(a => a.logisticsStatus?.transport === 'required').length}
                                    </h4>
                                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Traslados Pendientes</p>
                                </div>
                            </div>
                            <div className="card-premium p-8 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <Landmark className="w-8 h-8 text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">
                                        {appointments.filter(a => a.logisticsStatus?.perDiem === 'required').length}
                                    </h4>
                                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Viáticos por Aprobar</p>
                                </div>
                            </div>
                            <div className="card-premium p-8 flex flex-col items-center text-center gap-4 border-emerald-500/20">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">
                                        {appointments.filter(a => a.logisticsStatus?.transport === 'coordinated').length}
                                    </h4>
                                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Logística Completada</p>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium p-0 overflow-hidden border-white/5">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Paciente</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Transporte</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Viático (Per Diem)</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Sede Destino</th>
                                        <th className="px-8 py-6 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {appointments.filter(a => a.logisticsStatus?.transport !== 'not_required' || a.logisticsStatus?.perDiem !== 'not_required').map(app => (
                                        <tr key={app.id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/10 group-hover:text-blue-400 transition-all">
                                                        <User className="w-5 h-5 text-white/20 group-hover:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white uppercase">{formatName(app.patientName)}</p>
                                                        <p className="text-[9px] text-white/20 font-mono">{app.appointmentDate}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                    app.logisticsStatus?.transport === 'coordinated' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                                                )}>
                                                    {app.logisticsStatus?.transport}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                    app.logisticsStatus?.perDiem === 'coordinated' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                                )}>
                                                    {app.logisticsStatus?.perDiem}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-white/20" />
                                                    <p className="text-[10px] font-bold text-white/60">{app.center?.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedApp(app);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                    className="p-2 bg-white/5 rounded-xl hover:bg-blue-600 group/btn transition-all"
                                                >
                                                    <ArrowRight className="w-4 h-4 text-white/40 group-hover/btn:text-white" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="grid gap-6 animate-in slide-in-from-right-4 duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="card-premium p-6">
                                <ActivityIcon className="w-5 h-5 text-blue-400 mb-4" />
                                <h4 className="text-xl font-black text-white">{appointments.filter(a => a.status === 'completed').length}</h4>
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Procedimientos Finalizados</p>
                            </div>
                            <div className="card-premium p-6">
                                <FileCheck className="w-5 h-5 text-emerald-400 mb-4" />
                                <h4 className="text-xl font-black text-white">{appointments.filter(a => a.checkoutStatus).length}</h4>
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Informes Validados</p>
                            </div>
                        </div>

                        <div className="card-premium p-20 text-center border-2 border-dashed border-white/5 bg-white/[0.01]">
                            <div className="w-20 h-20 rounded-full bg-blue-500/5 flex items-center justify-center mx-auto mb-6">
                                <FileCheck className="w-10 h-10 text-blue-500/20" />
                            </div>
                            <h3 className="text-xl font-black text-white/60 uppercase tracking-tighter">Módulo de Post-Procedimiento</h3>
                            <p className="text-xs text-white/20 mt-2 max-w-sm mx-auto leading-relaxed">
                                Aquí se gestionarán los hallazgos médicos, carga de informes PDF y cierre técnico de la atención. Próximamente disponible.
                            </p>
                            <button className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                Solicitar Acceso Beta
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <ClinicalConfigPanel
                        catalog={catalog}
                        centers={centers}
                        requirements={requirements}
                        batteries={batteries}
                        onUpsertProcedure={upsertProcedure}
                        onUpsertRequirement={upsertRequirement}
                        onUpsertBattery={upsertBattery}
                        onUpsertIndications={upsertIndications}
                        onGetIndications={getIndications}
                        onDeleteProcedure={deleteProcedure}
                        onDeleteRequirement={deleteRequirement}
                        onDeleteBattery={deleteBattery}
                        onDeleteIndications={deleteIndications}
                        indications={indications}
                    />
                )}
            </div>

            <ClinicalProcedureModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedApp(null);
                }}
                onSave={async (data) => {
                    if (selectedApp) {
                        return await updateAppointment(selectedApp.id, data);
                    } else {
                        return await addAppointment(data);
                    }
                }}
                initialData={selectedApp}
                catalog={catalog}
                centers={centers}
                doctors={doctors}
            />

            <ProcedureDetailsPanel
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedApp(null);
                }}
                appointment={selectedApp}
                onVerifyDoc={verifyDocument}
                onGetIndications={getIndications}
                onUpdateStatus={updateAppointmentStatus}
                onEdit={() => {
                    setIsDetailsOpen(false);
                    setIsModalOpen(true);
                }}
            />
        </div>
    );
};
