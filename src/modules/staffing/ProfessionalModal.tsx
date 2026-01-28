import React, { useState } from 'react';
import { X, User, Briefcase, GraduationCap, Plus, Trash2, Loader2, Layers } from 'lucide-react';

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

    React.useEffect(() => {
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
            // Auto-expandir si hay datos académicos
            if (initialData.university || initialData.specialty || initialData.registrationNumber || initialData.username) {
                setIsAcademicExpanded(true);
            }
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
            setIsAcademicExpanded(false);
        }
    }, [initialData, isOpen]);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAcademicExpanded, setIsAcademicExpanded] = useState(false);

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

                <div className="mb-8">
                    <h2 className="text-2xl font-bold">Nuevo Profesional</h2>
                    <p className="text-white/40 text-sm">Registro en la Matriz Única del Holding</p>
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

                <form onSubmit={handleSubmit} className="space-y-8">
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
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Fecha Incorporación</label>
                                <input
                                    type="date"
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                    value={formData.joiningDate}
                                    onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Teléfono (+56 9 999 999 999)</label>
                                <input
                                    placeholder="+56 9 XXXX XXXX"
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-3 block">Ubicación y Residencia</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    list="countries-list"
                                    placeholder="País"
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                    value={formData.residence.country}
                                    onChange={e => setFormData({ ...formData, residence: { ...formData.residence, country: e.target.value } })}
                                />
                                <input
                                    list="regions-list"
                                    placeholder="Región"
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                    value={formData.residence.region}
                                    onChange={e => setFormData({ ...formData, residence: { ...formData.residence, region: e.target.value } })}
                                />
                                <input
                                    list="cities-list"
                                    placeholder="Ciudad"
                                    className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                    value={formData.residence.city}
                                    onChange={e => setFormData({ ...formData, residence: { ...formData.residence, city: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección 3: Datos Académicos y Profesionales */}
                    <div className="space-y-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Académico & Profesional</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAcademicExpanded(!isAcademicExpanded)}
                                className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                            >
                                {isAcademicExpanded ? 'Ocultar Detalles' : 'Añadir Detalles Académicos'}
                            </button>
                        </div>

                        {isAcademicExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Universidad / Institución</label>
                                    <input
                                        list="universities-list"
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={formData.university}
                                        onChange={e => setFormData({ ...formData, university: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">N° Registro / SISO</label>
                                    <input
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={formData.registrationNumber}
                                        onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Especialidad</label>
                                    <input
                                        list="specialties-list"
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Sub-Especialidad</label>
                                    <input
                                        list="subspecialties-list"
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={formData.subSpecialty}
                                        onChange={e => setFormData({ ...formData, subSpecialty: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Team / Célula Gestión</label>
                                    <input
                                        list="teams-list"
                                        className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                        value={formData.team}
                                        onChange={e => setFormData({ ...formData, team: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nombre Usuario</label>
                                        <input
                                            placeholder="Ej: jdoe"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Tipo Firma</label>
                                        <input
                                            placeholder="Ej: Digital"
                                            className="bg-neutral-900 border border-white/10 rounded-lg w-full px-4 py-2 text-sm outline-none"
                                            value={formData.signatureType}
                                            onChange={e => setFormData({ ...formData, signatureType: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

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
                                            <label className="text-[9px] uppercase font-bold text-white/20">Monto Mensual / Honorario</label>
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

                    <div className="flex gap-3 pt-6">
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
            </div>
        </div>
    );
};


