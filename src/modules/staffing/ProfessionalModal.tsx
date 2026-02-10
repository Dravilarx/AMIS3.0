import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, GraduationCap, Plus, Trash2, Loader2, Layers, FolderSearch, AlertCircle, CheckCircle2, UploadCloud, ShieldCheck, BookOpen, BellRing, UserCheck, Sparkles, Trash } from 'lucide-react';
import { useBatteries } from '../dms/useBatteries';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentUploadModal } from '../dms/DocumentUploadModal';
import { useHRManagers } from '../../hooks/useHRManagers';
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
        contracts: [],
        induction: {
            enabled: false,
            hasReadAndAccepted: false,
            status: 'pending'
        }
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
                registrationNumber: initialData.registrationNumber || '',
                specialty: initialData.specialty || '',
                subSpecialty: initialData.subSpecialty || '',
                team: initialData.team || '',
                username: initialData.username || '',
                signatureType: initialData.signatureType || '',
                competencies: initialData.competencies,
                contracts: initialData.contracts,
                induction: initialData.induction || {
                    enabled: false,
                    hasReadAndAccepted: false,
                    status: 'pending'
                }
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
                contracts: [],
                induction: {
                    enabled: false,
                    hasReadAndAccepted: false,
                    status: 'pending'
                }
            });
        }
    }, [initialData, isOpen]);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'contracts' | 'expediente' | 'induction'>('info');

    // Integración de Baterías
    const { batteries } = useBatteries();
    const { documents, uploadDocument } = useDocuments({ limit: 100 });
    const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadPrefill, setUploadPrefill] = useState<any>(null);
    const { managers } = useHRManagers();

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
                    className="absolute top-4 right-4 p-2 hover:bg-prevenort-surface rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-prevenort-text/40" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-prevenort-text">{initialData ? `${initialData.name} ${initialData.lastName}` : 'Nuevo Profesional'}</h2>
                    <p className="text-prevenort-text/40 text-sm">Matriz Única del Holding Portezuelo</p>
                </div>

                {/* Tabs de Navegación del Modal */}
                <div className="flex items-center gap-1 p-1 bg-prevenort-surface border border-prevenort-border rounded-xl mb-8">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'info' ? "bg-prevenort-text text-prevenort-bg shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60 hover:bg-prevenort-surface"
                        )}
                    >
                        <User className="w-3.5 h-3.5" />
                        Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('academic')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'academic' ? "bg-prevenort-text text-prevenort-bg shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60 hover:bg-prevenort-surface"
                        )}
                    >
                        <GraduationCap className="w-3.5 h-3.5" />
                        Académico
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'contracts' ? "bg-prevenort-text text-prevenort-bg shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60 hover:bg-prevenort-surface"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Contratos
                    </button>
                    <button
                        onClick={() => setActiveTab('induction')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'induction' ? "bg-prevenort-text text-prevenort-bg shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60 hover:bg-prevenort-surface"
                        )}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Inducción
                    </button>
                    <button
                        onClick={() => setActiveTab('expediente')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'expediente' ? "bg-prevenort-text text-prevenort-bg shadow-lg" : "text-prevenort-text/40 hover:text-prevenort-text/60 hover:bg-prevenort-surface"
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
                            <div className="space-y-4 p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-prevenort-text/60">Información del Cargo</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Cargo / Rol Principal</label>
                                        <select
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none appearance-none"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Email Corporativo / Uso</label>
                                        <input
                                            required
                                            type="email"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Datos Personales */}
                            <div className="space-y-4 p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-prevenort-text/60">Datos Personales</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Nombres</label>
                                        <input
                                            required
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Apellidos</label>
                                        <input
                                            required
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.lastName}
                                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">RUT / DNI</label>
                                        <input
                                            required
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.nationalId}
                                            onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Nacionalidad</label>
                                        <input
                                            list="nationalities-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.nationality}
                                            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Fecha Nacimiento</label>
                                        <input
                                            type="date"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.birthDate}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Teléfono</label>
                                        <input
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Ciudad</label>
                                        <input
                                            list="cities-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.residence.city}
                                            onChange={e => setFormData({ ...formData, residence: { ...formData.residence, city: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Región</label>
                                        <input
                                            list="regions-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
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
                            <div className="space-y-4 p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-prevenort-text/60">Académico & Profesional</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Universidad</label>
                                        <input
                                            list="universities-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.university}
                                            onChange={e => setFormData({ ...formData, university: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">N° Registro (SIS / Colegio)</label>
                                        <input
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.registrationNumber}
                                            onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Especialidad</label>
                                        <input
                                            list="specialties-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Sub-especialidad</label>
                                        <input
                                            list="subspecialties-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                            value={formData.subSpecialty}
                                            onChange={e => setFormData({ ...formData, subSpecialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Equipo / Unidad</label>
                                        <input
                                            list="teams-list"
                                            className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
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
                            <div className="space-y-4 p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-prevenort-text/60">Configuración Contractual</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContract}
                                        className="text-[10px] uppercase font-bold text-info hover:text-info/80 transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir Contrato
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.contracts.map((contract, i) => (
                                        <div key={i} className="p-4 bg-prevenort-surface border border-prevenort-border rounded-xl space-y-4 relative group">
                                            <button
                                                type="button"
                                                onClick={() => removeContract(i)}
                                                className="absolute top-2 right-2 p-1.5 text-danger/40 hover:text-danger transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-prevenort-text/20">Empresa Contratante</label>
                                                    <select
                                                        className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-3 py-1.5 text-xs text-prevenort-text outline-none"
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
                                                    <label className="text-[9px] uppercase font-bold text-prevenort-text/20">Relación Laboral</label>
                                                    <select
                                                        className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-3 py-1.5 text-xs text-prevenort-text outline-none"
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
                                                    <label className="text-[9px] uppercase font-bold text-prevenort-text/20">Monto Mensual</label>
                                                    <input
                                                        type="number"
                                                        className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-3 py-1.5 text-xs text-prevenort-text outline-none"
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

                    {activeTab === 'induction' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Control Master de Inducción */}
                            <div className="p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            formData.induction?.enabled ? "bg-info/10 text-info" : "bg-prevenort-surface text-prevenort-text/20"
                                        )}>
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-prevenort-text/90">Gestión de Inducción</h3>
                                            <p className="text-[10px] text-prevenort-text/40 uppercase tracking-widest font-bold">Punto de Control Auditoría</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.induction?.enabled}
                                            onChange={e => setFormData({
                                                ...formData,
                                                induction: { ...formData.induction!, enabled: e.target.checked }
                                            })}
                                        />
                                        <div className="w-11 h-6 bg-prevenort-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-prevenort-text after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-prevenort-text/20 after:border-prevenort-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-prevenort-primary peer-checked:after:bg-white"></div>
                                    </label>
                                </div>

                                {formData.induction?.enabled && (
                                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Inicio Inducción</label>
                                                <input
                                                    type="date"
                                                    className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                                    value={formData.induction?.startDate || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        induction: { ...formData.induction!, startDate: e.target.value, status: 'in_progress' }
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Fin Inducción</label>
                                                <input
                                                    type="date"
                                                    className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text focus:border-info/50 outline-none"
                                                    value={formData.induction?.endDate || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        induction: { ...formData.induction!, endDate: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-info/5 border border-info/10 rounded-xl">
                                                <BookOpen className="w-5 h-5 text-info" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-info">Verificación de Lectura y Aceptación</p>
                                                    <p className="text-[9px] text-info/60 uppercase tracking-tighter">Legalmente vinculante para certificaciones</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-prevenort-border bg-prevenort-surface text-info focus:ring-info/20"
                                                    checked={formData.induction?.hasReadAndAccepted}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        induction: {
                                                            ...formData.induction!,
                                                            hasReadAndAccepted: e.target.checked,
                                                            acceptedAt: e.target.checked ? new Date().toISOString() : undefined
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest flex items-center gap-2">
                                                    <UserCheck className="w-3 h-3" /> Encargado RRHH Responsable
                                                </label>
                                                <select
                                                    className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text outline-none"
                                                    value={formData.induction?.assignedHRManagerId || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        induction: { ...formData.induction!, assignedHRManagerId: e.target.value }
                                                    })}
                                                >
                                                    <option value="">Seleccionar responsable...</option>
                                                    {managers.map(manager => (
                                                        <option key={manager.id} value={manager.id}>
                                                            {manager.fullName} - {manager.role}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="p-3 bg-warning/5 border border-warning/10 rounded-xl flex items-start gap-3">
                                                <BellRing className="w-5 h-5 text-warning mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Sistema de Alertas</p>
                                                    <p className="text-[11px] text-warning/80 leading-tight">
                                                        Se enviarán avisos automáticos a la jefatura y al profesional 15 días antes del vencimiento del periodo de inducción o de cualquier documento crítico.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!formData.induction?.enabled && (
                                    <div className="text-center py-8">
                                        <ShieldCheck className="w-12 h-12 text-prevenort-text/5 mx-auto mb-2" />
                                        <p className="text-xs text-prevenort-text/20">La inducción está desactivada para este perfil profesional.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'expediente' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Selector de Batería */}
                            <div className="p-4 bg-prevenort-surface/50 border border-prevenort-border rounded-2xl">
                                <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest block mb-4">Asignar Batería Documental</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <select
                                        className="bg-prevenort-surface border border-prevenort-border rounded-lg w-full px-4 py-2 text-sm text-prevenort-text outline-none"
                                        value={selectedBatteryId}
                                        onChange={e => setSelectedBatteryId(e.target.value)}
                                    >
                                        <option value="">Seleccionar batería...</option>
                                        {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>

                                    {selectedBattery && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                <span className="text-prevenort-text/40">Cumplimiento</span>
                                                <span className="text-info">{batteryProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-prevenort-surface rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-info transition-all duration-500"
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
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-prevenort-surface/50 border border-prevenort-border rounded-xl group hover:border-prevenort-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    {doc ? (
                                                        <CheckCircle2 className="w-5 h-5 text-success" />
                                                    ) : (
                                                        <AlertCircle className={cn("w-5 h-5", req.isRequired ? "text-warning" : "text-prevenort-text/10")} />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-bold text-prevenort-text/90">{req.label}</p>
                                                        <p className="text-[10px] text-prevenort-text/30 uppercase tracking-tighter">
                                                            {req.category} • {req.isRequired ? 'Obligatorio' : 'Opcional'}
                                                        </p>
                                                        {doc?.isValidated && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Sparkles className="w-2.5 h-2.5 text-info" />
                                                                <span className="text-[8px] font-bold text-info uppercase tracking-widest">Validado Agrawall AI</span>
                                                            </div>
                                                        )}
                                                        {doc?.expiryDate && (
                                                            <p className="text-[9px] text-warning font-bold mt-1">
                                                                Vence: {new Date(doc.expiryDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {doc ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => window.open(doc.url, '_blank')}
                                                                className="px-3 py-1.5 bg-prevenort-surface rounded-lg text-[10px] font-bold uppercase hover:bg-prevenort-primary/10 transition-all text-prevenort-text"
                                                            >
                                                                Ver
                                                            </button>
                                                            <button
                                                                type="button"
                                                                title={doc.isLocked ? "Bloqueado por Auditoría" : "Eliminar"}
                                                                disabled={doc.isLocked}
                                                                className={cn(
                                                                    "p-1.5 rounded-lg transition-colors",
                                                                    doc.isLocked ? "text-prevenort-text/10 cursor-not-allowed" : "text-prevenort-text/20 hover:bg-danger/10 hover:text-danger"
                                                                )}
                                                            >
                                                                <Trash className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequirementUpload(req)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-info/10 border border-info/20 rounded-lg text-[10px] font-bold uppercase text-info hover:bg-info/20 transition-all"
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
                                <div className="text-center py-12 border border-dashed border-prevenort-border rounded-2xl">
                                    <FolderSearch className="w-8 h-8 text-prevenort-text/10 mx-auto mb-4" />
                                    <p className="text-sm text-prevenort-text/40">Selecciona una batería para visualizar los requerimientos específicos de este perfil profesional.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-prevenort-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-prevenort-border rounded-lg hover:bg-prevenort-surface transition-all text-sm font-medium text-prevenort-text"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="flex-[2] px-4 py-2 bg-prevenort-text text-prevenort-bg hover:opacity-90 rounded-lg transition-all text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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


