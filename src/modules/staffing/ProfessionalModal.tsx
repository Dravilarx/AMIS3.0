import React, { useState } from 'react';
import { X, User, Mail, CreditCard, Briefcase, MapPin, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Professional, HoldingCompany } from '../../types/core';

interface ProfessionalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (professional: Omit<Professional, 'id'>) => Promise<{ success: boolean; error?: string }>;
    initialData?: Professional | null;
}

const ROLES = ['Radiólogo', 'TENS', 'Secretaria', 'Enfermero'] as const;
const COMPANIES: HoldingCompany[] = ['Portezuelo', 'Boreal', 'Amis', 'Soran', 'Vitalmédica', 'Resomag', 'Ceimavan', 'Irad'];

export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Omit<Professional, 'id'>>({
        name: '',
        email: '',
        nationalId: '',
        role: 'Radiólogo',
        status: 'active',
        residence: { city: '', region: '' },
        competencies: [],
        contracts: []
    });

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                nationalId: initialData.nationalId,
                role: initialData.role,
                status: initialData.status,
                residence: initialData.residence,
                competencies: initialData.competencies,
                contracts: initialData.contracts
            });
        } else {
            setFormData({
                name: '',
                email: '',
                nationalId: '',
                role: 'Radiólogo',
                status: 'active',
                residence: { city: '', region: '' },
                competencies: [],
                contracts: []
            });
        }
    }, [initialData, isOpen]);

    const [newCompetency, setNewCompetency] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const addCompetency = () => {
        if (newCompetency && !formData.competencies.includes(newCompetency)) {
            setFormData({ ...formData, competencies: [...formData.competencies, newCompetency] });
            setNewCompetency('');
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información Básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3" /> Nombre Completo
                            </label>
                            <input
                                required
                                type="text"
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <Mail className="w-3 h-3" /> Email Corporativo
                            </label>
                            <input
                                required
                                type="email"
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> RUT
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="12.345.678-9"
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.nationalId}
                                onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <Briefcase className="w-3 h-3" /> Cargo / Rol
                            </label>
                            <select
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none appearance-none"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                            >
                                {ROLES.map(r => <option key={r} value={r} className="bg-neutral-900">{r}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Residencia */}
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Logística de Residencia
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                placeholder="Ciudad"
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.residence.city}
                                onChange={e => setFormData({ ...formData, residence: { ...formData.residence, city: e.target.value } })}
                            />
                            <input
                                placeholder="Región"
                                className="bg-white/5 border border-white/10 rounded-lg w-full px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.residence.region}
                                onChange={e => setFormData({ ...formData, residence: { ...formData.residence, region: e.target.value } })}
                            />
                        </div>
                    </div>

                    {/* Competencias */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <GraduationCap className="w-3 h-3" /> Matriz de Competencias
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ej: RM Próstata, TC Coronario..."
                                className="bg-white/5 border border-white/10 rounded-lg flex-1 px-4 py-2 text-sm focus:border-blue-500/50 outline-none"
                                value={newCompetency}
                                onChange={e => setNewCompetency(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCompetency())}
                            />
                            <button
                                type="button"
                                onClick={addCompetency}
                                className="p-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {formData.competencies.map((c, i) => (
                                <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-full flex items-center gap-2">
                                    {c}
                                    <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFormData({ ...formData, competencies: formData.competencies.filter((_, idx) => idx !== i) })} />
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Contratos */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Contratos Vigentes</label>
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
                                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-white/5 border border-white/10 rounded-lg relative group">
                                    <select
                                        className="bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-blue-500/50 outline-none"
                                        value={contract.company}
                                        onChange={e => {
                                            const newContracts = [...formData.contracts];
                                            newContracts[i].company = e.target.value as HoldingCompany;
                                            setFormData({ ...formData, contracts: newContracts });
                                        }}
                                    >
                                        {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Monto"
                                        className="bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-blue-500/50 outline-none"
                                        value={contract.amount}
                                        onChange={e => {
                                            const newContracts = [...formData.contracts];
                                            newContracts[i].amount = Number(e.target.value);
                                            setFormData({ ...formData, contracts: newContracts });
                                        }}
                                    />
                                    <input
                                        placeholder="Tipo (Planta/Hon.)"
                                        className="bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-blue-500/50 outline-none"
                                        value={contract.type}
                                        onChange={e => {
                                            const newContracts = [...formData.contracts];
                                            newContracts[i].type = e.target.value;
                                            setFormData({ ...formData, contracts: newContracts });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeContract(i)}
                                        className="p-1.5 text-red-500/40 hover:text-red-500 transition-colors flex justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
