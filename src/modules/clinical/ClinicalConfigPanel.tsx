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
            <div className="flex gap-4 p-1.5 bg-prevenort-bg/80 rounded-2xl w-fit border border-prevenort-border backdrop-blur-sm shadow-inner">
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
                                ? "bg-prevenort-primary text-white shadow-lg shadow-orange-500/10 border border-prevenort-primary"
                                : "text-prevenort-text/40 hover:text-prevenort-text hover:bg-prevenort-surface"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="card-premium bg-prevenort-surface border-prevenort-border p-8 shadow-2xl shadow-orange-500/5">
                {activeSubTab === 'catalog' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">Gestión de Catálogo</h3>
                                <p className="text-xs text-prevenort-text/40 font-mono mt-1 uppercase tracking-widest">Procedimientos, Códigos Prestacionales y Precios Base</p>
                            </div>
                            <button
                                onClick={() => setEditingProc({ name: '', code: '', basePrice: 0, description: '', isActive: true })}
                                className="flex items-center gap-2 px-6 py-3 bg-prevenort-primary hover:bg-orange-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-orange-600/20"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Procedimiento
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.map(proc => (
                                <div key={proc.id} className="group bg-prevenort-bg/50 border border-prevenort-border rounded-3xl p-6 hover:border-prevenort-primary/30 transition-all hover:bg-prevenort-surface hover:shadow-xl hover:shadow-orange-500/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-orange-500/10 text-prevenort-primary border border-orange-500/20">
                                            <Book className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingProc(proc)}
                                                className="p-2 hover:bg-prevenort-bg rounded-lg text-prevenort-text/20 hover:text-prevenort-text transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicateProcedure(proc)}
                                                className="p-2 hover:bg-orange-500/10 rounded-lg text-prevenort-text/20 hover:text-prevenort-primary transition-all"
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
                                                className="p-2 hover:bg-danger/10 rounded-lg text-prevenort-text/20 hover:text-danger transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-prevenort-text uppercase tracking-tight text-lg leading-tight mb-2">{proc.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-prevenort-surface p-3 rounded-xl border border-prevenort-border">
                                            <span className="text-[10px] font-black text-prevenort-text/20 uppercase tracking-widest">Código</span>
                                            <span className="text-xs font-mono text-prevenort-primary font-bold">{proc.code}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-prevenort-surface p-3 rounded-xl border border-prevenort-border">
                                            <span className="text-[10px] font-black text-prevenort-text/20 uppercase tracking-widest">Precio Base</span>
                                            <div className="flex items-center gap-1 text-success font-bold">
                                                <DollarSign className="w-3 h-3" />
                                                <span className="text-sm font-mono">{proc.basePrice.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            proc.isActive ? "bg-success" : "bg-danger"
                                        )} />
                                        <span className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">
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
                            <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-prevenort-primary" />
                                Baterías de Requisitos
                            </h3>
                            <div className="grid gap-4">
                                {batteries.map(battery => (
                                    <div key={battery.id} className="bg-prevenort-bg/50 border border-prevenort-border rounded-3xl p-6 hover:border-prevenort-primary/30 transition-all hover:bg-prevenort-surface hover:shadow-lg hover:shadow-blue-500/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-black text-prevenort-text uppercase tracking-tight">{battery.name}</h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDuplicateBattery(battery)}
                                                    className="text-prevenort-text/20 hover:text-prevenort-primary transition-all"
                                                    title="Duplicar Batería"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingBattery(battery)}
                                                    className="text-prevenort-text/20 hover:text-prevenort-text transition-all"
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
                                                    className="text-prevenort-text/20 hover:text-danger transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-prevenort-text/40 leading-relaxed mb-4">{battery.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {battery.requirements?.map(req => (
                                                <span key={req.id} className="px-2 py-1 bg-orange-500/10 text-prevenort-primary rounded-lg text-[10px] font-bold uppercase border border-orange-500/20">
                                                    {req.name}
                                                </span>
                                            ))}
                                            {(!battery.requirements || battery.requirements.length === 0) && (
                                                <span className="text-[10px] text-prevenort-text/20 italic font-mono uppercase tracking-widest">Sin requisitos vinculados</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEditingBattery({ name: '', description: '' })}
                                    className="w-full py-5 border-2 border-dashed border-prevenort-border rounded-3xl text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.3em] hover:border-prevenort-primary/40 hover:text-prevenort-primary hover:bg-orange-500/5 transition-all"
                                >
                                    + Crear Nueva Batería
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter flex items-center gap-2">
                                <Layout className="w-5 h-5 text-amber-500" />
                                Requisitos Maestros
                            </h3>
                            <div className="bg-prevenort-bg/50 rounded-3xl overflow-hidden border border-prevenort-border">
                                <table className="w-full text-left">
                                    <thead className="bg-prevenort-bg/80">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Requisito</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Tipo</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest text-center">Mandatorio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-prevenort-border">
                                        {requirements.map(req => (
                                            <tr key={req.id} className="hover:bg-prevenort-surface transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-prevenort-text uppercase">{req.name}</p>
                                                            <p className="text-[10px] text-prevenort-text/40 font-mono mt-1">{req.description}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleDuplicateRequirement(req)}
                                                                className="p-1.5 hover:bg-prevenort-primary/10 rounded-lg text-prevenort-text/20 hover:text-prevenort-primary transition-all"
                                                                title="Duplicar Ítem"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingRequirement(req)}
                                                                className="p-1.5 hover:bg-prevenort-bg rounded-lg text-prevenort-text/20 hover:text-prevenort-text transition-all"
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
                                                                className="p-1.5 hover:bg-danger/10 rounded-lg text-prevenort-text/20 hover:text-danger transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-prevenort-bg border border-prevenort-border text-prevenort-text/40 rounded text-[9px] font-black uppercase tracking-widest">
                                                        {req.requirementType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {req.isMandatory ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" /> : <X className="w-4 h-4 text-prevenort-text/10 mx-auto" />}
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
                            <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-emerald-600" />
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
                                    className="h-full min-h-[160px] border-2 border-dashed border-prevenort-border rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-prevenort-primary/50 hover:bg-prevenort-primary/5 group transition-all"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-prevenort-bg flex items-center justify-center group-hover:bg-prevenort-primary group-hover:text-white transition-all shadow-inner">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-prevenort-text/20 group-hover:text-prevenort-primary">Crear Nueva Plantilla</span>
                                </button>

                                {indications.map(ind => (
                                    <div key={ind.id} className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:border-prevenort-primary/30 transition-all flex flex-col justify-between h-full shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2 bg-blue-50 rounded-xl text-prevenort-primary">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const { id, procedureName, centerName, ...copyData } = ind;
                                                            await onUpsertIndications(copyData);
                                                            alert('Plantilla duplicada');
                                                        }}
                                                        className="p-2 bg-prevenort-bg hover:bg-prevenort-primary rounded-lg transition-all group/dup"
                                                    >
                                                        <Copy className="w-3.5 h-3.5 text-prevenort-text/20 group-hover/dup:text-white" />
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
                                                        className="p-2 bg-prevenort-bg hover:bg-prevenort-primary rounded-lg transition-all group/edit"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-prevenort-text/20 group-hover/edit:text-white" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Borrar esta plantilla?') && onDeleteIndications) {
                                                                await onDeleteIndications(ind.id!);
                                                            }
                                                        }}
                                                        className="p-2 bg-prevenort-bg hover:bg-danger rounded-lg transition-all group/del"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-prevenort-text/20 group-hover/del:text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-prevenort-text leading-tight uppercase tracking-tight">{ind.procedureName}</h4>
                                                <p className="text-[10px] text-prevenort-primary font-mono mt-1 uppercase tracking-widest">{ind.centerName}</p>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", ind.emailFormat ? "bg-success/10 text-success border border-success/20" : "bg-prevenort-bg text-prevenort-text/20")}>EMAIL</span>
                                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", ind.whatsappFormat ? "bg-success/10 text-success border border-success/20" : "bg-prevenort-bg text-prevenort-text/20")}>WHATSAPP</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor Panel (Only show when editingInd is set) */}
                        {editingInd && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-10 bg-prevenort-bg border border-prevenort-border rounded-[3rem] shadow-xl shadow-blue-500/5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">Editor de Plantilla</h3>
                                    <button onClick={() => setEditingInd(null)} className="text-[10px] font-black text-prevenort-text/40 uppercase hover:text-prevenort-text tracking-widest px-6 py-2.5 bg-prevenort-surface border border-prevenort-border rounded-xl shadow-sm transition-all">Cerrar Editor</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end p-8 bg-prevenort-surface border border-prevenort-border rounded-[2rem] shadow-sm">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Layout className="w-4 h-4 text-prevenort-primary" />
                                            <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Procedimiento Destino</label>
                                        </div>
                                        <select
                                            value={selectedProcId}
                                            onChange={(e) => setSelectedProcId(e.target.value)}
                                            className="w-full bg-prevenort-bg border border-prevenort-border rounded-2xl px-5 py-4 text-sm text-prevenort-text focus:border-prevenort-primary outline-none transition-all appearance-none font-bold"
                                        >
                                            <option value="">Seleccionar Procedimiento...</option>
                                            {catalog.map(proc => <option key={proc.id} value={proc.id}>{proc.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-prevenort-primary" />
                                            <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Sede de Atención</label>
                                        </div>
                                        <select
                                            value={selectedCenterId}
                                            onChange={(e) => setSelectedCenterId(e.target.value)}
                                            className="w-full bg-prevenort-bg border border-prevenort-border rounded-2xl px-5 py-4 text-sm text-prevenort-text focus:border-prevenort-primary outline-none transition-all appearance-none font-bold"
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
                                                <div className="p-3 bg-prevenort-bg rounded-2xl text-prevenort-primary border border-prevenort-border">
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-prevenort-text uppercase tracking-widest">Plantilla Correo Electrónico</h4>
                                                    <p className="text-[9px] text-prevenort-text/40 mt-1 uppercase font-bold tracking-tighter">Cuerpo del mensaje en HTML</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 px-3 py-1 bg-prevenort-bg text-prevenort-primary rounded-full text-[9px] font-bold border border-prevenort-border border-prevenort-border">
                                                <Info className="w-3 h-3" />
                                                Usa {`{paciente}, {fecha}, {hora} y {sede}`}
                                            </div>
                                        </div>
                                        <textarea
                                            value={indTemplates.email}
                                            onChange={(e) => setIndTemplates(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Ej: Estimado/a {paciente}, le confirmamos su cita..."
                                            className="w-full h-80 bg-prevenort-surface border border-prevenort-border rounded-3xl p-8 text-sm text-prevenort-text focus:border-prevenort-primary outline-none leading-relaxed transition-all font-mono shadow-inner"
                                        />
                                    </div>

                                    {/* WhatsApp Template */}
                                    <div className="space-y-6 flex flex-col h-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-prevenort-bg rounded-2xl text-success border border-prevenort-border">
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-prevenort-text uppercase tracking-widest">Plantilla WhatsApp</h4>
                                                    <p className="text-[9px] text-prevenort-text/40 mt-1 uppercase font-bold tracking-tighter">Mensaje corto y directo</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-success/10 border border-success/20 rounded-full text-[8px] font-black text-success uppercase tracking-widest">
                                                Soporta emojis y saltos de línea
                                            </div>
                                        </div>
                                        <textarea
                                            value={indTemplates.whatsapp}
                                            onChange={(e) => setIndTemplates(prev => ({ ...prev, whatsapp: e.target.value }))}
                                            placeholder="Ej: Hola {paciente}! Te recordamos tu cita de {procedimiento}..."
                                            className="w-full h-80 bg-prevenort-surface border border-prevenort-border rounded-3xl p-8 text-sm text-prevenort-text focus:border-success outline-none leading-relaxed transition-all font-mono shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-8">
                                    <button
                                        onClick={() => setEditingInd(null)}
                                        className="px-10 py-4 bg-prevenort-surface border border-prevenort-border hover:bg-prevenort-bg rounded-2xl text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest transition-all shadow-sm"
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
                                        className="px-10 py-4 bg-prevenort-primary hover:bg-blue-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3"
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-prevenort-bg/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-prevenort-surface border border-prevenort-border rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-prevenort-border flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">
                                    {editingProc.id ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}
                                </h3>
                                <p className="text-[10px] text-prevenort-text/40 font-mono uppercase tracking-widest">Configuración Técnica y Precio</p>
                            </div>
                            <button onClick={() => setEditingProc(null)} className="p-2 hover:bg-prevenort-bg rounded-full text-prevenort-text/20 hover:text-prevenort-text transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingProc.name || ''}
                                        onChange={(e) => setEditingProc({ ...editingProc, name: e.target.value })}
                                        className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text font-bold outline-none focus:border-prevenort-primary transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Código</label>
                                    <input
                                        type="text"
                                        value={editingProc.code || ''}
                                        onChange={(e) => setEditingProc({ ...editingProc, code: e.target.value })}
                                        className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text font-bold outline-none focus:border-prevenort-primary transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Precio Base ($)</label>
                                <input
                                    type="number"
                                    value={editingProc.basePrice || 0}
                                    onChange={(e) => setEditingProc({ ...editingProc, basePrice: Number(e.target.value) })}
                                    className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3 text-sm text-prevenort-text font-bold outline-none focus:border-prevenort-primary transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                                <textarea
                                    value={editingProc.description || ''}
                                    onChange={(e) => setEditingProc({ ...editingProc, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-prevenort-primary transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
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
                                className="flex-1 py-4 bg-prevenort-primary hover:bg-blue-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                            >
                                Guardar Procedimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Requirement Edit Modal */}
            {editingReq && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                                    {editingReq.id ? 'Editar Requisito' : 'Nuevo Requisito'}
                                </h3>
                            </div>
                            <button onClick={() => setEditingRequirement(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-slate-900 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Requisito</label>
                                <input
                                    type="text"
                                    value={editingReq.name || ''}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-prevenort-primary transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                                <select
                                    value={editingReq.requirementType || 'document'}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, requirementType: e.target.value as any })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-prevenort-primary transition-all appearance-none"
                                >
                                    <option value="document">Documento</option>
                                    <option value="physical_exam">Examen Físico</option>
                                    <option value="equipment">Equipamiento</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={editingReq.isMandatory || false}
                                    onChange={(e) => setEditingRequirement({ ...editingReq, isMandatory: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-prevenort-primary focus:ring-prevenort-primary"
                                />
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Es Mandatorio</label>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
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
                                className="w-full py-4 bg-prevenort-primary hover:bg-blue-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                            >
                                Guardar Requisito
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Battery Edit Modal */}
            {editingBatt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                                    {editingBatt.id ? 'Editar Batería' : 'Nueva Batería'}
                                </h3>
                            </div>
                            <button onClick={() => setEditingBattery(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-slate-900 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Batería</label>
                                <input
                                    type="text"
                                    value={editingBatt.name || ''}
                                    onChange={(e) => setEditingBattery({ ...editingBatt, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-prevenort-primary transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                                <textarea
                                    value={editingBatt.description || ''}
                                    onChange={(e) => setEditingBattery({ ...editingBatt, description: e.target.value })}
                                    className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-prevenort-primary transition-all leading-relaxed"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>Vincular Requisitos Maestro</span>
                                    <span className="text-prevenort-primary">{(editingBatt.requirements?.length || 0)} seleccionados</span>
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
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
                                                        ? "bg-blue-50 border-prevenort-primary/30 text-slate-900"
                                                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        isSelected ? "bg-prevenort-primary border-prevenort-primary" : "border-slate-300"
                                                    )}>
                                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold leading-none">{req.name}</p>
                                                        <p className="text-[9px] mt-1 opacity-50 uppercase tracking-tighter">{req.requirementType}</p>
                                                    </div>
                                                </div>
                                                {req.isMandatory && (
                                                    <span className="text-[8px] font-black text-amber-600 uppercase px-1.5 py-0.5 bg-amber-50 rounded">Mandatorio</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
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
                                className="w-full py-4 bg-prevenort-primary hover:bg-blue-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
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
