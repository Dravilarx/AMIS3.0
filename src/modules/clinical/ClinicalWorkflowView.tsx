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
                <div className="w-20 h-20 rounded-full border-4 border-prevenort-primary/20 border-t-prevenort-primary animate-spin" />
                <ActivityIcon className="w-8 h-8 text-prevenort-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="mt-8 text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.4em] animate-pulse font-sans">Sincronizando Sistema AMIS...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Master Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-prevenort-primary/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-prevenort-primary" />
                        </div>
                        <span className="text-[10px] font-black text-prevenort-primary uppercase tracking-[0.3em]">Protocolo M9: Gestión Intervencional</span>
                    </div>
                    <h1 className="text-5xl font-black text-prevenort-text tracking-tight uppercase leading-none">
                        Atención <span className="text-prevenort-primary">Médica</span>
                    </h1>
                    <p className="text-sm text-prevenort-text/60 font-bold max-w-xl">
                        Gestión centralizada de agendamientos intervencionales, baterías de protocolos y logística clínica de la Red.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20 group-hover:text-prevenort-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar Paciente o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-prevenort-surface border border-prevenort-border rounded-2xl pl-12 pr-6 py-4.5 text-xs focus:outline-none focus:border-prevenort-primary/30 focus:ring-4 focus:ring-prevenort-primary/5 w-72 transition-all text-prevenort-text placeholder:text-prevenort-text/20 shadow-sm"
                        />
                    </div>

                    <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20 group-hover:text-prevenort-primary transition-colors" />
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="bg-prevenort-surface border border-prevenort-border rounded-2xl pl-12 pr-10 py-4.5 text-xs focus:outline-none focus:border-prevenort-primary/30 focus:ring-4 focus:ring-prevenort-primary/5 w-64 transition-all text-prevenort-text appearance-none shadow-sm font-bold"
                        >
                            <option value="">Filtrar por Especialista...</option>
                            {doctors.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedApp(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-8 py-4.5 bg-prevenort-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-500/20 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        Nuevo Agendamiento
                    </button>
                </div>
            </div>

            {/* Tactical Tabs */}
            <div className="flex items-center gap-2 p-2 bg-prevenort-surface border border-prevenort-border rounded-[2rem] w-fit shadow-xl">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-8 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                isActive
                                    ? "bg-prevenort-primary text-white shadow-xl shadow-orange-500/20 border border-prevenort-primary scale-[1.05]"
                                    : "text-prevenort-text/40 hover:text-prevenort-text hover:bg-prevenort-bg"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-prevenort-text/20")} />
                            {tab.name}
                        </button>
                    );
                })}
            </div>

            {/* Dashboard Content */}
            <div className="grid gap-8">
                {fetchError && (
                    <div className="p-5 bg-danger/10 border border-danger/20 rounded-3xl text-danger text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-sm">
                        <div className="p-2 bg-prevenort-surface rounded-xl shadow-sm">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        Error de Sistema: {fetchError}
                    </div>
                )}

                {activeTab === 'agenda' && (
                    <div className="space-y-8 anim-fade-up">
                        <div className="flex items-center justify-between pb-8 border-b border-prevenort-border">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-prevenort-primary uppercase tracking-[0.3em] mb-1">Agenda Clínica</span>
                                <h2 className="text-3xl font-black text-prevenort-text tracking-tight uppercase">Programación Institucional</h2>
                            </div>
                            <div className="flex items-center gap-2 bg-prevenort-surface border border-prevenort-border rounded-2xl p-1.5 shadow-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'list'
                                            ? "bg-prevenort-primary text-white shadow-lg shadow-orange-500/20 border border-prevenort-primary"
                                            : "text-prevenort-text/40 hover:text-prevenort-text"
                                    )}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'calendar'
                                            ? "bg-prevenort-primary text-white shadow-lg shadow-orange-500/20 border border-prevenort-primary"
                                            : "text-prevenort-text/40 hover:text-prevenort-text"
                                    )}
                                >
                                    Calendario
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {viewMode === 'list' ? (
                                filteredAppointments.length === 0 ? (
                                    <div className="xl:col-span-2 p-28 text-center border-4 border-dashed border-slate-100 rounded-[4rem] bg-slate-50/30">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-50">
                                            <ActivityIcon className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 uppercase font-black tracking-[0.2em] text-[11px]">No se registran procedimientos en esta vista</p>
                                    </div>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => {
                                                setSelectedApp(app);
                                                setIsDetailsOpen(true);
                                            }}
                                            className="card-premium group relative overflow-hidden cursor-pointer hover:border-prevenort-primary/40 transition-all duration-500"
                                        >
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50/50 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-100/50 transition-colors" />

                                            <div className="flex flex-col gap-10">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-16 h-16 rounded-[1.5rem] bg-prevenort-bg border border-prevenort-border flex items-center justify-center shadow-inner group-hover:bg-prevenort-primary group-hover:border-prevenort-primary transition-all duration-500">
                                                            <User className="w-7 h-7 text-prevenort-text/20 group-hover:text-white transition-colors" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-prevenort-text tracking-tight">{formatName(app.patientName)}</h3>
                                                            <div className="flex items-center gap-4 mt-1.5">
                                                                <span className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-widest bg-prevenort-bg border border-prevenort-border px-2.5 py-1 rounded-lg">{formatRUT(app.patientRut)}</span>
                                                                <span className="text-[10px] text-prevenort-primary font-black uppercase tracking-[0.1em]">{app.healthcareProvider}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                                                        app.status === 'scheduled' ? "border-info/20 text-info bg-info/10" :
                                                            app.status === 'requirements_pending' ? "border-warning/20 text-warning bg-warning/10" :
                                                                "border-success/20 text-success bg-success/10"
                                                    )}>
                                                        {app.status.replace('_', ' ')}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 p-8 bg-prevenort-bg/50 rounded-[2.5rem] border border-prevenort-border shadow-inner group-hover:bg-prevenort-surface transition-colors duration-500">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-prevenort-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-prevenort-primary/10 rounded-lg">
                                                                <Stethoscope className="w-3.5 h-3.5 text-prevenort-primary" />
                                                            </div>
                                                            Protocolo Médico
                                                        </div>
                                                        <p className="text-[13px] font-black text-prevenort-text leading-tight uppercase">
                                                            <span className="text-prevenort-primary">[{app.procedure?.code}]</span> {app.procedure?.name}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-prevenort-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-success/10 rounded-lg">
                                                                <MapPin className="w-3.5 h-3.5 text-success" />
                                                            </div>
                                                            Centro Clínico
                                                        </div>
                                                        <p className="text-[13px] font-black text-prevenort-text leading-tight uppercase">
                                                            {app.center?.name} <span className="text-prevenort-text/40 font-bold text-[10px]">({app.center?.city})</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-prevenort-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-warning/10 rounded-lg">
                                                                <Clock className="w-3.5 h-3.5 text-warning" />
                                                            </div>
                                                            Fecha y Hora
                                                        </div>
                                                        <p className="text-[13px] font-black text-prevenort-text">
                                                            {new Date(app.appointmentDate).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })} • <span className="text-prevenort-primary">{app.appointmentTime}</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4 relative">
                                                        <div className="flex items-center gap-3 text-[10px] text-prevenort-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-danger/10 rounded-lg">
                                                                <ActivityIcon className="w-3.5 h-3.5 text-danger" />
                                                            </div>
                                                            Condición Paciente
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {app.medicalBackground?.usesAspirin && (
                                                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm">Aspirina</span>
                                                            )}
                                                            {app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm">Anticoagulante</span>
                                                            )}
                                                            {!app.medicalBackground?.usesAspirin && !app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="text-[10px] font-bold text-prevenort-text/20 uppercase italic">Sin observaciones críticas</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-prevenort-border gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-3 h-3 rounded-full border-2 border-prevenort-surface shadow-xl",
                                                            app.checkoutStatus ? "bg-success shadow-success/20" : "bg-danger shadow-danger/20"
                                                        )} />
                                                        <span className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">
                                                            {app.checkoutStatus ? 'Requisitos Clínicos Validados' : 'Pendiente Verificación Documental'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                            className="p-4 bg-prevenort-surface border border-prevenort-border rounded-2xl hover:bg-white hover:text-black transition-all shadow-sm"
                                                        >
                                                            <Share2 className="w-4 h-4 text-prevenort-text/40" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedApp(app);
                                                                setIsDetailsOpen(true);
                                                            }}
                                                            className="flex items-center gap-4 px-8 py-4 bg-prevenort-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-orange-500/20"
                                                        >
                                                            Expediente Digital
                                                            <ArrowRight className="w-5 h-5" />
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
                    <div className="card-premium p-0 overflow-hidden border-prevenort-border shadow-2xl animate-in zoom-in-95">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-prevenort-border bg-prevenort-bg/50">
                                    <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Código Prevenort</th>
                                    <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Protocolo / Denominación</th>
                                    <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Valor Arancelario</th>
                                    <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Estatus Operativo</th>
                                    <th className="px-10 py-7 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-prevenort-border bg-transparent">
                                {catalog.map(proc => (
                                    <tr key={proc.id} className="hover:bg-prevenort-bg transition-colors group">
                                        <td className="px-10 py-7">
                                            <span className="text-xs font-mono font-black text-prevenort-primary bg-prevenort-primary/10 border border-prevenort-primary/20 px-4 py-1.5 rounded-xl shadow-sm">{proc.code}</span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <p className="text-sm font-black text-prevenort-text group-hover:text-prevenort-primary transition-colors uppercase tracking-tight leading-tight">{proc.name}</p>
                                            <p className="text-[10px] text-prevenort-text/40 font-bold mt-1.5 line-clamp-1 uppercase tracking-tight">{proc.description}</p>
                                        </td>
                                        <td className="px-10 py-7">
                                            <span className="text-sm font-black text-prevenort-text">$ {proc.basePrice.toLocaleString('es-CL')}</span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-2 h-2 rounded-full bg-success shadow-lg shadow-success/20" />
                                                <span className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-wider">Activo Red Prevenort</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <button className="p-3 text-prevenort-text/20 hover:text-prevenort-primary bg-prevenort-bg rounded-xl transition-all hover:shadow-md">
                                                <Sparkles className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'logistics' && (
                    <div className="grid gap-8 animate-in slide-in-from-bottom-6 transition-all duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="card-premium p-10 flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-prevenort-primary/10 flex items-center justify-center shadow-inner border border-prevenort-primary/20">
                                    <Truck className="w-10 h-10 text-prevenort-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-prevenort-text">
                                        {appointments.filter(a => a.logisticsStatus?.transport === 'required').length}
                                    </h4>
                                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold tracking-[0.2em] mt-1">Traslados Críticos Pendientes</p>
                                </div>
                            </div>
                            <div className="card-premium p-10 flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-warning/10 flex items-center justify-center shadow-inner border border-warning/20">
                                    <Landmark className="w-10 h-10 text-warning" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-prevenort-text">
                                        {appointments.filter(a => a.logisticsStatus?.perDiem === 'required').length}
                                    </h4>
                                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold tracking-[0.2em] mt-1">Viáticos por Liberar</p>
                                </div>
                            </div>
                            <div className="card-premium p-10 flex flex-col items-center text-center gap-6 border-success/20">
                                <div className="w-20 h-20 rounded-[2rem] bg-success/10 flex items-center justify-center shadow-inner border border-success/20">
                                    <CheckCircle2 className="w-10 h-10 text-success" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-prevenort-text">
                                        {appointments.filter(a => a.logisticsStatus?.transport === 'coordinated').length}
                                    </h4>
                                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold tracking-[0.2em] mt-1">Movilidad Red Consolidada</p>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium p-0 overflow-hidden border-prevenort-border shadow-xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-prevenort-border bg-prevenort-bg/50">
                                        <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Analista / Paciente</th>
                                        <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Estatus Movilidad</th>
                                        <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Gestión Viáticos</th>
                                        <th className="px-10 py-7 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Sede Asignada</th>
                                        <th className="px-10 py-7 text-right">Evolución</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-prevenort-border bg-transparent">
                                    {appointments.filter(a => a.logisticsStatus?.transport !== 'not_required' || a.logisticsStatus?.perDiem !== 'not_required').map(app => (
                                        <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-[1rem] bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-orange-50 group-hover:border-orange-100 transition-all shadow-inner">
                                                        <User className="w-5 h-5 text-slate-400 group-hover:text-prevenort-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 uppercase leading-tight">{formatName(app.patientName)}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{app.appointmentDate}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7">
                                                <span className={cn(
                                                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                    app.logisticsStatus?.transport === 'coordinated' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                )}>
                                                    {app.logisticsStatus?.transport}
                                                </span>
                                            </td>
                                            <td className="px-10 py-7">
                                                <span className={cn(
                                                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                    app.logisticsStatus?.perDiem === 'coordinated' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {app.logisticsStatus?.perDiem}
                                                </span>
                                            </td>
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{app.center?.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedApp(app);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-prevenort-primary group/btn transition-all shadow-lg hover:shadow-blue-200"
                                                >
                                                    <ArrowRight className="w-5 h-5" />
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
                    <div className="grid gap-10 animate-in slide-in-from-right-6 duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="card-premium p-10 group hover:border-prevenort-primary transition-all">
                                <ActivityIcon className="w-6 h-6 text-prevenort-primary mb-6" />
                                <h4 className="text-4xl font-black text-prevenort-text">{appointments.filter(a => a.status === 'completed').length}</h4>
                                <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest mt-2">Atenciones Finalizadas</p>
                            </div>
                            <div className="card-premium p-10 group hover:border-success/40 transition-all">
                                <FileCheck className="w-6 h-6 text-success mb-6" />
                                <h4 className="text-4xl font-black text-prevenort-text">{appointments.filter(a => a.checkoutStatus).length}</h4>
                                <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest mt-2">Protocolos Validados</p>
                            </div>
                        </div>

                        <div className="card-premium p-28 text-center border-4 border-dashed border-prevenort-border bg-prevenort-bg/50 rounded-[4rem]">
                            <div className="w-24 h-24 rounded-full bg-prevenort-surface flex items-center justify-center mx-auto mb-10 shadow-2xl border border-prevenort-border group">
                                <FileCheck className="w-12 h-12 text-prevenort-text/10 group-hover:text-prevenort-primary transition-colors" />
                            </div>
                            <h3 className="text-2xl font-black text-prevenort-text uppercase tracking-tight">Consola de Hallazgos Clínicos</h3>
                            <p className="text-sm text-prevenort-text/40 font-bold mt-3 max-w-sm mx-auto leading-relaxed uppercase tracking-tight">
                                Gestión de resultados médicos, carga de archivos PDF y cierre técnico de expedientes.
                            </p>
                            <div className="mt-12 flex items-center justify-center gap-6">
                                <button className="px-10 py-4 bg-prevenort-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 hover:shadow-2xl transition-all">
                                    Solicitar Acceso Auditor
                                </button>
                                <button className="px-10 py-4 bg-prevenort-surface border border-prevenort-border text-prevenort-text/40 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-prevenort-bg transition-all">
                                    Guía de Protocolo
                                </button>
                            </div>
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
