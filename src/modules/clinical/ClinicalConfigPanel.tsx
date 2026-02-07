import React, { useState } from 'react';
import {
    Book,
    MessageSquare,
    ClipboardList,
    Plus,
    Edit2,
    Save,
    CheckCircle2,
    X,
    Mail,
    DollarSign,
    Info,
    Layout,
    Copy,
    Activity,
    Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type {
    MedicalProcedure,
    MedicalRequirement,
    RequirementBattery,
    ClinicalCenter,
    ClinicalIndications
} from '../../types/clinical';

interface ClinicalConfigPanelProps {
    catalog: MedicalProcedure[];
    centers: ClinicalCenter[];
    requirements: MedicalRequirement[];
    batteries: RequirementBattery[];
    onUpsertProcedure: (proc: Partial<MedicalProcedure>) => Promise<any>;
    onUpsertRequirement: (req: Partial<MedicalRequirement>) => Promise<any>;
    onUpsertBattery: (batt: Partial<RequirementBattery>) => Promise<any>;
    onUpsertIndications: (ind: any) => Promise<any>;
    onGetIndications: (procId: string, centerId: string) => Promise<{ success: boolean; data?: ClinicalIndications | null }>;
    indications: ClinicalIndications[];
    onDeleteIndications?: (id: string) => Promise<any>;
    onDeleteProcedure?: (id: string) => Promise<any>;
    onDeleteRequirement?: (id: string) => Promise<any>;
    onDeleteBattery?: (id: string) => Promise<any>;
}

export const ClinicalConfigPanel: React.FC<ClinicalConfigPanelProps> = ({
    catalog,
    centers,
    requirements,
    batteries,
    onUpsertProcedure,
    onUpsertRequirement,
    onUpsertBattery,
    onUpsertIndications,
    indications,
    onDeleteIndications,
    onDeleteProcedure,
    onDeleteRequirement,
    onDeleteBattery
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'requirements' | 'messaging'>('catalog');

    // Procedure Editing State
    const [editingProc, setEditingProc] = useState<Partial<MedicalProcedure> | null>(null);

    // Indications Editing State
    const [selectedProcId, setSelectedProcId] = useState<string>('');
    const [selectedCenterId, setSelectedCenterId] = useState<string>('');
    const [indTemplates, setIndTemplates] = useState<{ email: string; whatsapp: string; id?: string }>({ email: '', whatsapp: '' });

    // Additional config states
    const [editingReq, setEditingRequirement] = useState<Partial<MedicalRequirement> | null>(null);
    const [editingBatt, setEditingBattery] = useState<Partial<RequirementBattery> | null>(null);
    const [editingInd, setEditingInd] = useState<Partial<ClinicalIndications> | null>(null);

    // Skill Global: Implementación de Duplicado
    const handleDuplicateProcedure = async (proc: MedicalProcedure) => {
        if (!confirm(`¿Desea duplicar el procedimiento "${proc.name}"?`)) return;
        const { id, ...rest } = proc;
        const res = await onUpsertProcedure({
            ...rest,
            name: `${proc.name} (Copia)`,
            isActive: true
        });
        if (res.success) alert('Procedimiento duplicado con éxito');
    };

    const handleDuplicateRequirement = async (req: MedicalRequirement) => {
        if (!confirm(`¿Desea duplicar el requisito "${req.name}"?`)) return;
        const { id, ...rest } = req;
        const res = await onUpsertRequirement({
            ...rest,
            name: `${req.name} (Copia)`
        });
        if (res.success) alert('Requisito duplicado con éxito');
    };

    const handleDuplicateBattery = async (batt: RequirementBattery) => {
        if (!confirm(`¿Desea duplicar la batería "${batt.name}"?`)) return;
        const { id, requirements: battReqs, ...rest } = batt;
        const res = await onUpsertBattery({
            ...rest,
            name: `${batt.name} (Copia)`
        });
        if (res.success) alert('Batería duplicada con éxito');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Sub-navigation */}
            <div className="flex gap-4 p-1 bg-white/5 rounded-2xl w-fit">
                {[
                    { id: 'catalog', name: 'Catálogo & Precios', icon: Book },
                    { id: 'requirements', name: 'Requisitos & Baterías', icon: ClipboardList },
                    { id: 'messaging', name: 'Mensajería & Indicaciones', icon: MessageSquare },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            activeSubTab === tab.id
                                ? "bg-white text-black shadow-lg"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="card-premium p-8">
                {activeSubTab === 'catalog' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Gestión de Catálogo</h3>
                                <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">Procedimientos, Códigos Prestacionales y Precios Base</p>
                            </div>
                            <button
                                onClick={() => setEditingProc({ name: '', code: '', basePrice: 0, description: '', isActive: true })}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Procedimiento
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.map(proc => (
                                <div key={proc.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all hover:bg-white/[0.03]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                            <Book className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingProc(proc)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicateProcedure(proc)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-blue-400 transition-all"
                                                title="Duplicar"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`¿Está seguro de eliminar el procedimiento "${proc.name}"? Esta acción no se puede deshacer.`)) {
                                                        const res = await onDeleteProcedure?.(proc.id);
                                                        if (res?.success) alert('Procedimiento eliminado');
                                                    }
                                                }}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-white uppercase tracking-tight text-lg leading-tight mb-2">{proc.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Código</span>
                                            <span className="text-xs font-mono text-blue-400 font-bold">{proc.code}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Precio Base</span>
                                            <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                                <DollarSign className="w-3 h-3" />
                                                <span className="text-sm font-mono">{proc.basePrice.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            proc.isActive ? "bg-emerald-500" : "bg-red-500"
                                        )} />
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                            {proc.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubTab === 'requirements' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-blue-400" />
                                Baterías de Requisitos
                            </h3>
                            <div className="grid gap-4">
                                {batteries.map(battery => (
                                    <div key={battery.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-black text-white uppercase tracking-tight">{battery.name}</h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDuplicateBattery(battery)}
                                                    className="text-white/20 hover:text-blue-400 transition-all"
                                                    title="Duplicar Batería"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingBattery(battery)}
                                                    className="text-white/20 hover:text-white transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar batería "${battery.name}"?`)) {
                                                            const res = await onDeleteBattery?.(battery.id);
                                                            if (res?.success) alert('Batería eliminada');
                                                        }
                                                    }}
                                                    className="text-white/20 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-white/40 leading-relaxed mb-4">{battery.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {battery.requirements?.map(req => (
                                                <span key={req.id} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold uppercase border border-blue-500/20">
                                                    {req.name}
                                                </span>
                                            ))}
                                            {(!battery.requirements || battery.requirements.length === 0) && (
                                                <span className="text-[10px] text-white/20 italic font-mono uppercase tracking-widest">Sin requisitos vinculados</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEditingBattery({ name: '', description: '' })}
                                    className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:border-blue-500/20 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
                                >
                                    + Crear Nueva Batería
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <Layout className="w-5 h-5 text-amber-400" />
                                Requisitos
                            </h3>
                            <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/5">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Requisito</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Tipo</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Mandatorio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {requirements.map(req => (
                                            <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-white uppercase">{req.name}</p>
                                                            <p className="text-[10px] text-white/30 font-mono mt-1">{req.description}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleDuplicateRequirement(req)}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/10 hover:text-blue-400 transition-all"
                                                                title="Duplicar Ítem"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingRequirement(req)}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/10 hover:text-white transition-all"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(`¿Eliminar ítem "${req.name}"?`)) {
                                                                        const res = await onDeleteRequirement?.(req.id);
                                                                        if (res?.success) alert('Ítem eliminado');
                                                                    }
                                                                }}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/10 hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-white/5 text-white/60 rounded text-[9px] font-black uppercase tracking-widest">
                                                        {req.requirementType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {req.isMandatory ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-white/10 mx-auto" />}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'messaging' && (
                    <div className="space-y-12">
                        {/* Repository List */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-emerald-400" />
                                Repositorio de Mensajes Maestro
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <button
                                    onClick={() => {
                                        setEditingInd({ emailFormat: '', whatsappFormat: '' });
                                        setSelectedProcId('');
                                        setSelectedCenterId('');
                                        setIndTemplates({ email: '', whatsapp: '' });
                                    }}
                                    className="h-full min-h-[160px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 group transition-all"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Crear Nueva Plantilla</span>
                                </button>

                                {indications.map(ind => (
                                    <div key={ind.id} className="group relative bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:border-white/20 transition-all flex flex-col justify-between h-full">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                                    <Mail className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const { id, procedureName, centerName, ...copyData } = ind;
                                                            await onUpsertIndications(copyData);
                                                            alert('Plantilla duplicada');
                                                        }}
                                                        className="p-2 bg-white/5 hover:bg-blue-600 rounded-lg transition-all"
                                                    >
                                                        <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingInd(ind);
                                                            setSelectedProcId(ind.procedureId);
                                                            setSelectedCenterId(ind.centerId);
                                                            setIndTemplates({
                                                                id: ind.id,
                                                                email: ind.emailFormat || '',
                                                                whatsapp: ind.whatsappFormat || ''
                                                            });
                                                        }}
                                                        className="p-2 bg-white/5 hover:bg-blue-600 rounded-lg transition-all"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Borrar esta plantilla?') && onDeleteIndications) {
                                                                await onDeleteIndications(ind.id!);
                                                            }
                                                        }}
                                                        className="p-2 bg-white/5 hover:bg-red-600 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{ind.procedureName}</h4>
                                                <p className="text-[10px] text-blue-400 font-mono mt-1 uppercase tracking-widest">{ind.centerName}</p>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", ind.emailFormat ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/20")}>EMAIL</span>
                                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", ind.whatsappFormat ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/20")}>WHATSAPP</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor Panel (Only show when editingInd is set) */}
                        {editingInd && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 bg-blue-500/5 border border-blue-500/20 rounded-[40px]">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Editor de Plantilla</h3>
                                    <button onClick={() => setEditingInd(null)} className="text-[10px] font-black text-white/40 uppercase hover:text-white tracking-widest px-4 py-2 bg-white/5 rounded-xl text-white">Cerrar Editor</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end p-8 bg-black/40 border border-white/5 rounded-3xl">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Layout className="w-4 h-4 text-blue-400" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Procedimiento Destino</label>
                                        </div>
                                        <select
                                            value={selectedProcId}
                                            onChange={(e) => setSelectedProcId(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Seleccionar Procedimiento...</option>
                                            {catalog.map(proc => <option key={proc.id} value={proc.id}>{proc.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Centro Clínico</label>
                                        </div>
                                        <select
                                            value={selectedCenterId}
                                            onChange={(e) => setSelectedCenterId(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="">Seleccionar Sede...</option>
                                            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Email Template */}
                                    <div className="space-y-6 flex flex-col h-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-500/10 rounded-2xl">
                                                    <Mail className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Plantilla Correo Electrónico</h4>
                                                    <p className="text-[9px] text-white/20 mt-1 uppercase font-bold tracking-tighter">Cuerpo del mensaje en HTML</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-bold">
                                                <Info className="w-3 h-3" />
                                                Usa {`{paciente}, {fecha}, {hora} y {sede}`}
                                            </div>
                                        </div>
                                        <textarea
                                            value={indTemplates.email}
                                            onChange={(e) => setIndTemplates(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Ej: Estimado/a {paciente}, le confirmamos su cita..."
                                            className="w-full h-80 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm text-white focus:border-blue-500 outline-none leading-relaxed transition-all font-mono"
                                        />
                                    </div>

                                    {/* WhatsApp Template */}
                                    <div className="space-y-6 flex flex-col h-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Plantilla WhatsApp</h4>
                                                    <p className="text-[9px] text-white/20 mt-1 uppercase font-bold tracking-tighter">Mensaje corto y directo</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                                                Soporta emojis y saltos de línea
                                            </div>
                                        </div>
                                        <textarea
                                            value={indTemplates.whatsapp}
                                            onChange={(e) => setIndTemplates(prev => ({ ...prev, whatsapp: e.target.value }))}
                                            placeholder="Ej: Hola {paciente}! Te recordamos tu cita de {procedimiento}..."
                                            className="w-full h-80 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm text-white focus:border-emerald-500 outline-none leading-relaxed transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-8">
                                    <button
                                        onClick={() => setEditingInd(null)}
                                        className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-widest transition-all"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!selectedProcId || !selectedCenterId) {
                                                alert('Por favor selecciona procedimiento y sede');
                                                return;
                                            }
                                            const res = await onUpsertIndications({
                                                id: indTemplates.id,
                                                procedureId: selectedProcId,
                                                centerId: selectedCenterId,
                                                emailFormat: indTemplates.email,
                                                whatsappFormat: indTemplates.whatsapp
                                            });
                                            if (res.success) {
                                                setEditingInd(null);
                                                alert('Plantilla guardada con éxito');
                                            }
                                        }}
                                        className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center gap-3 text-white"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Configuración de Mensajes
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Procedure Edit Modal */}
            {editingProc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {editingProc.id ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}
                                </h3>
                                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Configuración Técnica y Precio</p>
                            </div>
                            <button onClick={() => setEditingProc(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingProc.name || ''}
                                        onChange={(e) => setEditingProc({ ...editingProc, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Código</label>
                                    <input
                                        type="text"
                                        value={editingProc.code || ''}
                                        onChange={(e) => setEditingProc({ ...editingProc, code: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Precio Base ($)</label>
                                <input
                                    type="number"
                                    value={editingProc.basePrice || 0}
                                    onChange={(e) => setEditingProc({ ...editingProc, basePrice: Number(e.target.value) })}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Descripción</label>
                                <textarea
                                    value={editingProc.description || ''}
                                    onChange={(e) => setEditingProc({ ...editingProc, description: e.target.value })}
                                    className="w-full h-24 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button
                                onClick={async () => {
                                    const res = await onUpsertProcedure(editingProc);
                                    if (res.success) {
                                        setEditingProc(null);
                                        alert('Procedimiento guardado con éxito');
                                    } else {
                                        alert('Error al guardar: ' + res.error);
                                    }
                                }}
                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20"
                            >
                                Guardar Procedimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Requirement Edit Modal */}
            {editingReq && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {editingReq.id ? 'Editar Requisito' : 'Nuevo Requisito'}
                                </h3>
                            </div>
                            <button onClick={() => setEditingRequirement(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre del Requisito</label>
                                <input
                                    type="text"
                                    value={editingReq.name || ''}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tipo</label>
                                <select
                                    value={editingReq.requirementType || 'document'}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, requirementType: e.target.value as any })}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                >
                                    <option value="document">Documento</option>
                                    <option value="physical_exam">Examen Físico</option>
                                    <option value="equipment">Equipamiento</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={editingReq.isMandatory || false}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, isMandatory: e.target.checked })}
                                    className="w-4 h-4 bg-black/40 border border-white/5 rounded"
                                />
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Es Mandatorio</label>
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5">
                            <button
                                onClick={async () => {
                                    const res = await onUpsertRequirement(editingReq);
                                    if (res.success) {
                                        setEditingRequirement(null);
                                        alert('Requisito guardado con éxito');
                                    } else {
                                        alert('Error: ' + res.error);
                                    }
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                            >
                                Guardar Requisito
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Battery Edit Modal */}
            {editingBatt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {editingBatt.id ? 'Editar Batería' : 'Nueva Batería'}
                                </h3>
                            </div>
                            <button onClick={() => setEditingBattery(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre de la Batería</label>
                                <input
                                    type="text"
                                    value={editingBatt.name || ''}
                                    onChange={(e) => setEditingBattery({ ...editingBatt, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Descripción</label>
                                <textarea
                                    value={editingBatt.description || ''}
                                    onChange={(e) => setEditingBattery({ ...editingBatt, description: e.target.value })}
                                    className="w-full h-24 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all leading-relaxed"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center justify-between">
                                    <span>Vincular Requisitos Maestro</span>
                                    <span className="text-blue-400">{(editingBatt.requirements?.length || 0)} seleccionados</span>
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {requirements.map(req => {
                                        const isSelected = editingBatt.requirements?.some((r: any) => r.id === req.id);
                                        return (
                                            <button
                                                key={req.id}
                                                onClick={() => {
                                                    const current = editingBatt.requirements || [];
                                                    const next = isSelected
                                                        ? current.filter((r: any) => r.id !== req.id)
                                                        : [...current, req];
                                                    setEditingBattery({ ...editingBatt, requirements: next });
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                                    isSelected
                                                        ? "bg-blue-600/10 border-blue-500/50 text-white"
                                                        : "bg-black/20 border-white/5 text-white/40 hover:border-white/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        isSelected ? "bg-blue-500 border-blue-500" : "border-white/20"
                                                    )}>
                                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold leading-none">{req.name}</p>
                                                        <p className="text-[9px] mt-1 opacity-50 uppercase tracking-tighter">{req.requirementType}</p>
                                                    </div>
                                                </div>
                                                {req.isMandatory && (
                                                    <span className="text-[8px] font-black text-amber-500/80 uppercase px-1.5 py-0.5 bg-amber-500/10 rounded">Mandatorio</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5">
                            <button
                                onClick={async () => {
                                    const res = await onUpsertBattery({
                                        ...editingBatt,
                                        requirements: editingBatt.requirements?.map((r: any) => r.id)
                                    });
                                    if (res.success) {
                                        setEditingBattery(null);
                                        alert('Batería guardada con éxito');
                                    } else {
                                        alert('Error: ' + res.error);
                                    }
                                }}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20"
                            >
                                Guardar Batería y Vincular Requisitos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
