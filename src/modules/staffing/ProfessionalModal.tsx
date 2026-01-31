import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, GraduationCap, Plus, Trash2, Loader2, Layers, FolderSearch, AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react';
import { useBatteries } from '../dms/useBatteries';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentUploadModal } from '../dms/DocumentUploadModal';
import { cn } from '../../lib/utils';

import type { Professional, HoldingCompany } from '../../types/core';

interface ProfessionalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (professional: Omit<Professional, 'id'>) => Promise<{ success: boolean; error?: string }>;
    initialData?: Professional | null;
    existingProfessionals?: Professional[];
}

const ROLES = ['Médico', 'Tecnólogo Médico', 'Administración', 'Ejecutivo', 'TENS', 'Enfermera', 'Ingeniero', 'Radiólogo', 'Secretaria'] as const;
const COMPANIES: HoldingCompany[] = ['Portezuelo', 'Boreal', 'Amis', 'Soran', 'Vitalmédica', 'Resomag', 'Ceimavan', 'Irad'];
const EMPLOYMENT_RELATIONSHIPS = [
    'Contrato indefinido',
    'Contrato a plazo',
    'Boleta honorarios personales',
    'Boleta honorarios empresa'
];

export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ isOpen, onClose, onSave, initialData, existingProfessionals }) => {
    const [formData, setFormData] = useState<Omit<Professional, 'id'>>({
        name: '',
        lastName: '',
        email: '',
        nationalId: '',
        nationality: 'Chilena',
        birthDate: '',
        joiningDate: '',
        phone: '',
        role: 'Médico',
        status: 'active',
        residence: { city: '', region: '', country: 'Chile' },
        university: '',
        registrationNumber: '',
        specialty: '',
        subSpecialty: '',
        team: '',
        username: '',
        signatureType: '',
        competencies: [],
        contracts: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                lastName: initialData.lastName || '',
                email: initialData.email,
                nationalId: initialData.nationalId,
                nationality: initialData.nationality || 'Chilena',
                birthDate: initialData.birthDate || '',
                joiningDate: initialData.joiningDate || '',
                phone: initialData.phone || '',
                role: initialData.role,
                status: initialData.status,
                residence: initialData.residence,
                university: initialData.university || '',
                registrationNumber: initialData.registrationNumber || '',
                specialty: initialData.specialty || '',
                subSpecialty: initialData.subSpecialty || '',
                team: initialData.team || '',
                username: initialData.username || '',
                signatureType: initialData.signatureType || '',
                competencies: initialData.competencies,
                contracts: initialData.contracts
            });
        } else {
            setFormData({
                name: '',
                lastName: '',
                email: '',
                nationalId: '',
                nationality: 'Chilena',
                birthDate: '',
                joiningDate: '',
                phone: '',
                role: 'Médico',
                status: 'active',
                residence: { city: '', region: '', country: 'Chile' },
                university: '',
                registrationNumber: '',
                specialty: '',
                subSpecialty: '',
                team: '',
                username: '',
                signatureType: '',
                competencies: [],
                contracts: []
            });
        }
    }, [initialData, isOpen]);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'contracts' | 'expediente'>('info');

    // Integración de Baterías
    const { batteries } = useBatteries();
    const { documents, uploadDocument } = useDocuments({ limit: 100 });
    const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadPrefill, setUploadPrefill] = useState<any>(null);

    // Filtrar documentos del profesional actual
    const professionalDocuments = (documents || []).filter(d => d.targetId === initialData?.id);
    const selectedBattery = batteries.find(b => b.id === selectedBatteryId);

    // Calcular progreso de batería
    const batteryProgress = selectedBattery ? Math.round(
        (selectedBattery.requirements.filter(req =>
            professionalDocuments.some(d => d.requirementId === req.id)
        ).length / selectedBattery.requirements.length) * 100
    ) : 0;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await onSave(formData);
        setIsSubmitting(false);
        if (result.success) {
            onClose();
        } else {
            alert('Error: ' + result.error);
        }
    };

    const handleRequirementUpload = (req: any) => {
        setUploadPrefill({
            targetId: initialData?.id,
            visibility: 'user',
            category: req.category,
            requirementId: req.id,
            title: `${req.label} - ${initialData?.name} ${initialData?.lastName}`
        });
        setShowUploadModal(true);
    };



    const addContract = () => {
        setFormData({
            ...formData,
            contracts: [...formData.contracts, { company: 'Boreal', amount: 0, type: 'Planta' }]
        });
    };

    const removeContract = (index: number) => {
        setFormData({
            ...formData,
            contracts: formData.contracts.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-white/40" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold">{initialData ? `${initialData.name} ${initialData.lastName}` : 'Nuevo Profesional'}</h2>
                    <p className="text-white/40 text-sm">Matriz Única del Holding Portezuelo</p>
                </div>

                {/* Tabs de Navegación del Modal */}
                <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-8">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'info' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                        )}
                    >
                        <User className="w-3.5 h-3.5" />
                        Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('academic')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'academic' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                        )}
                    >
                        <GraduationCap className="w-3.5 h-3.5" />
                        Académico
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'contracts' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Contratos
                    </button>
                    <button
                        onClick={() => setActiveTab('expediente')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'expediente' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                        )}
                    >
                        <FolderSearch className="w-3.5 h-3.5" />
                        Expediente
                    </button>
                </div>

                {/* DataLists para Autocompletado Inteligente */}
                <datalist id="nationalities-list">
                    {Array.from(new Set(['Chilena', 'Argentina', 'Colombiana', 'Venezolana', 'Española', 'Peruana', ...(existingProfessionals?.map(p => p.nationality).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="countries-list">
                    {Array.from(new Set(['Chile', 'Argentina', 'Colombia', 'Venezuela', 'España', ...(existingProfessionals?.map(p => p.residence.country).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="regions-list">
                    {Array.from(new Set(['Región Metropolitana', 'Valparaíso', 'Antofagasta', 'Biobío', 'Maule', 'Araucanía', ...(existingProfessionals?.map(p => p.residence.region).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="cities-list">
                    {Array.from(new Set(['Santiago', 'Antofagasta', 'Viña del Mar', 'Concepción', 'Valparaíso', 'Rancagua', ...(existingProfessionals?.map(p => p.residence.city).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="universities-list">
                    {Array.from(new Set(['Universidad de Chile', 'PUC', 'Universidad de Antofagasta', 'USACH', 'UNAB', ...(existingProfessionals?.map(p => p.university).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="specialties-list">
                    {Array.from(new Set(['Radiología', 'Traumatología', 'Medicina General', 'Enfermería', ...(existingProfessionals?.map(p => p.specialty).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="subspecialties-list">
                    {Array.from(new Set(['Osteopulmonar', 'Neurorradiología', 'Intervencionismo', ...(existingProfessionals?.map(p => p.subSpecialty).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="teams-list">
                    {Array.from(new Set(['Médica Antofagasta', 'Central Santiago', 'Operaciones Norte', ...(existingProfessionals?.map(p => p.team).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sección 1: Cargo y Rol */}
                            <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Información del Cargo</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Cargo / Rol Principal</label>
                                        <select
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none appearance-none"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Email Corporativo / Uso</label>
                                        <input
                                            required
                                            type="email"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Datos Personales */}
                            <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Datos Personales</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nombres</label>
                                        <input
                                            required
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Apellidos</label>
                                        <input
                                            required
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.lastName}
                                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">RUT / DNI</label>
                                        <input
                                            required
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.nationalId}
                                            onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nacionalidad</label>
                                        <input
                                            list="nationalities-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.nationality}
                                            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Fecha Nacimiento</label>
                                        <input
                                            type="date"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.birthDate}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Teléfono</label>
                                        <input
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Ciudad</label>
                                        <input
                                            list="cities-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.residence.city}
                                            onChange={e => setFormData({ ...formData, residence: { ...formData.residence, city: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Región</label>
                                        <input
                                            list="regions-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.residence.region}
                                            onChange={e => setFormData({ ...formData, residence: { ...formData.residence, region: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sección Académica */}
                            <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Académico & Profesional</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Universidad</label>
                                        <input
                                            list="universities-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.university}
                                            onChange={e => setFormData({ ...formData, university: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">N° Registro (SIS / Colegio)</label>
                                        <input
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.registrationNumber}
                                            onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Especialidad</label>
                                        <input
                                            list="specialties-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Sub-especialidad</label>
                                        <input
                                            list="subspecialties-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.subSpecialty}
                                            onChange={e => setFormData({ ...formData, subSpecialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Equipo / Unidad</label>
                                        <input
                                            list="teams-list"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                            value={formData.team}
                                            onChange={e => setFormData({ ...formData, team: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sección 4: Configuración Contractual */}
                            <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Configuración Contractual</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContract}
                                        className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir Contrato
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.contracts.map((contract, i) => (
                                        <div key={i} className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-4 relative group">
                                            <button
                                                type="button"
                                                onClick={() => removeContract(i)}
                                                className="absolute top-2 right-2 p-1.5 text-red-500/40 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-white/20">Empresa Contratante</label>
                                                    <select
                                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-3 py-1.5 text-xs outline-none"
                                                        value={contract.company}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].company = e.target.value as HoldingCompany;
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    >
                                                        {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-white/20">Relación Laboral</label>
                                                    <select
                                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-3 py-1.5 text-xs outline-none"
                                                        value={contract.type}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].type = e.target.value;
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {EMPLOYMENT_RELATIONSHIPS.map(rel => <option key={rel} value={rel}>{rel}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-white/20">Monto Mensual</label>
                                                    <input
                                                        type="number"
                                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-3 py-1.5 text-xs outline-none"
                                                        value={contract.amount}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].amount = Number(e.target.value);
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'expediente' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Selector de Batería */}
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest block mb-4">Asignar Batería Documental</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <select
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={selectedBatteryId}
                                        onChange={e => setSelectedBatteryId(e.target.value)}
                                    >
                                        <option value="">Seleccionar batería...</option>
                                        {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>

                                    {selectedBattery && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                <span className="text-white/40">Cumplimiento</span>
                                                <span className="text-blue-400">{batteryProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-500"
                                                    style={{ width: `${batteryProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lista de Requerimientos */}
                            {selectedBattery ? (
                                <div className="space-y-2">
                                    {selectedBattery.requirements.map(req => {
                                        const doc = professionalDocuments.find(d => d.requirementId === req.id);
                                        return (
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-3">
                                                    {doc ? (
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    ) : (
                                                        <AlertCircle className={cn("w-5 h-5", req.isRequired ? "text-amber-500" : "text-white/10")} />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-white/90">{req.label}</p>
                                                        <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                                                            {req.category} • {req.isRequired ? 'Obligatorio' : 'Opcional'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {doc ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => window.open(doc.url, '_blank')}
                                                            className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-bold uppercase hover:bg-white/10 transition-all"
                                                        >
                                                            Ver Archivo
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequirementUpload(req)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold uppercase text-blue-400 hover:bg-blue-500/20 transition-all"
                                                        >
                                                            <UploadCloud className="w-3 h-3" />
                                                            Cargar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                                    <FolderSearch className="w-8 h-8 text-white/10 mx-auto mb-4" />
                                    <p className="text-sm text-white/40">Selecciona una batería para visualizar los requerimientos específicos de este perfil profesional.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-all text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="flex-[2] px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg transition-all text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Vincular Profesional'}
                        </button>
                    </div>
                </form>

                {/* Modal de Carga Integrado */}
                {showUploadModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <DocumentUploadModal
                            prefill={uploadPrefill}
                            onClose={() => setShowUploadModal(false)}
                            onUpload={async (file, metadata) => {
                                const res = await uploadDocument(file, metadata);
                                if (res.success) {
                                    setShowUploadModal(false);
                                }
                                return res;
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};


