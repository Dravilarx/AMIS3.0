import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Loader2 } from 'lucide-react';
import type { Shift } from '../../types/shifts';
import type { Professional } from '../../types/core';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Omit<Shift, 'id' | 'status'>) => Promise<{ success: boolean; error?: string }>;
    professionals: Professional[];
    initialData?: Partial<Shift> | null;
}

const ROLES = ['Médico', 'Radiólogo', 'Tecnólogo Médico', 'Enfermera', 'TENS', 'Secretaria', 'Ingeniero', 'Administración'] as const;

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, professionals, initialData }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [formData, setFormData] = useState<Omit<Shift, 'id' | 'status'>>({
        professionalId: '',
        professionalName: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '20:00',
        location: '',
        sedeCity: ''
    });

    React.useEffect(() => {
        if (initialData && isOpen) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                startTime: initialData.startTime || prev.startTime,
                date: initialData.date || prev.date
            }));
        } else if (isOpen) {
            setFormData({
                professionalId: '',
                professionalName: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '20:00',
                location: '',
                sedeCity: ''
            });
            setSelectedRole('');
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const isRemote = ['Médico', 'Radiólogo', 'Ingeniero'].includes(selectedRole);

    const filteredProfessionals = professionals.filter(p => !selectedRole || p.role === selectedRole);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.professionalId) {
            alert('Por favor selecciona un profesional');
            return;
        }

        setIsSubmitting(true);
        const dataToSave = {
            ...formData,
            sedeCity: isRemote ? 'Remoto' : formData.sedeCity
        };
        const result = await onSave(dataToSave);
        setIsSubmitting(false);

        if (result.success) {
            onClose();
        } else {
            alert('Error al planificar turno: ' + result.error);
        }
    };

    const handleProfessionalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prof = professionals.find(p => p.id === e.target.value);
        if (prof) {
            setFormData({
                ...formData,
                professionalId: prof.id,
                professionalName: `${prof.name} ${prof.lastName}`
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="card-premium w-full max-w-lg relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-white/40" />
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Planificar Nuevo Turno</h2>
                    </div>
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                        {isRemote ? 'Asignación Remota / Grupo Virtual' : 'Asignación Física / Sede Presencial'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                    Tipo de Profesional
                                </label>
                                <select
                                    required
                                    className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none appearance-none cursor-pointer"
                                    value={selectedRole}
                                    onChange={e => {
                                        setSelectedRole(e.target.value);
                                        setFormData(prev => ({ ...prev, professionalId: '', professionalName: '' }));
                                    }}
                                >
                                    <option value="">Seleccionar tipo...</option>
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" /> Profesional
                                </label>
                                <select
                                    required
                                    disabled={!selectedRole}
                                    className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none appearance-none cursor-pointer disabled:opacity-40"
                                    value={formData.professionalId}
                                    onChange={handleProfessionalChange}
                                >
                                    <option value="">Seleccionar...</option>
                                    {filteredProfessionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} {p.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Hora Inicio
                                </label>
                                <input
                                    required
                                    type="time"
                                    className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Hora Término
                                </label>
                                <input
                                    required
                                    type="time"
                                    className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Fecha del Turno
                            </label>
                            <input
                                required
                                type="date"
                                className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                                {isRemote ? <User className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                {isRemote ? 'Grupo Virtual de Atención' : 'Ubicación / Sede Física'}
                            </label>
                            <input
                                required
                                placeholder={isRemote ? "Ej: Grupo 1 - Red Pública (Soru/Ceimavan)" : "Ej: Clínica Santa María - Piso 4"}
                                className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        {!isRemote && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Ciudad de la Sede</label>
                                <input
                                    required
                                    placeholder="Ej: Santiago"
                                    className="bg-neutral-900 border border-white/10 rounded-xl w-full px-4 py-3 text-sm focus:border-blue-500/50 outline-none"
                                    value={formData.sedeCity}
                                    onChange={e => setFormData({ ...formData, sedeCity: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="flex-[2] px-4 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : 'Confirmar Planificación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
