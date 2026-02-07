import React, { useState, useEffect } from 'react';
import { X, User, ClipboardList, Loader2, Save, Activity, Landmark } from 'lucide-react';
import { type ClinicalAppointment, type MedicalProcedure, type ClinicalCenter, type MedicalProfessional } from '../../types/clinical';
import { formatName, formatRUT, formatPhone } from '../../lib/utils';

interface ClinicalProcedureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<ClinicalAppointment>) => Promise<{ success: boolean; error?: string }>;
    initialData?: ClinicalAppointment | null;
    catalog: MedicalProcedure[];
    centers: ClinicalCenter[];
    doctors: MedicalProfessional[];
}

export const ClinicalProcedureModal: React.FC<ClinicalProcedureModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    catalog,
    centers,
    doctors
}) => {
    const [formData, setFormData] = useState<Partial<ClinicalAppointment>>({
        patientName: '',
        patientRut: '',
        patientEmail: '',
        patientPhone: '',
        patientAddress: '',
        patientBirthDate: '',
        healthcareProvider: '',
        referralInstitution: '',
        procedureId: '',
        centerId: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '09:00',
        logisticsStatus: {
            transport: 'not_required',
            perDiem: 'not_required'
        },
        medicalBackground: {
            usesAnticoagulants: false,
            usesAspirin: false,
            observations: ''
        },
        doctorId: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                patientName: '',
                patientRut: '',
                patientEmail: '',
                patientPhone: '',
                patientAddress: '',
                patientBirthDate: '',
                healthcareProvider: '',
                referralInstitution: '',
                procedureId: catalog[0]?.id || '',
                centerId: centers[0]?.id || '',
                appointmentDate: new Date().toISOString().split('T')[0],
                appointmentTime: '09:00',
                logisticsStatus: {
                    transport: 'not_required',
                    perDiem: 'not_required'
                },
                medicalBackground: {
                    usesAnticoagulants: false,
                    usesAspirin: false,
                    observations: ''
                },
                doctorId: doctors[0]?.id || ''
            });
        }
    }, [initialData, isOpen, catalog, centers]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await onSave(formData);
        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Error al guardar el agendamiento');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-[#050505] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="sticky top-0 z-10 p-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/20">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                                {initialData ? 'Editar Agendamiento' : 'Nuevo Agendamiento AMIS'}
                            </h3>
                            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.3em] mt-1">Intervencionismo & Control de Requisitos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-white/20" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-12">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    {/* Section 1: Patient Information */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Datos del Paciente</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Nombre Completo</label>
                                <input
                                    required
                                    value={formData.patientName}
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientName: formatName(e.target.value) })}
                                    className="input-premium"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">RUT / ID</label>
                                <input
                                    required
                                    value={formData.patientRut}
                                    onChange={(e) => setFormData({ ...formData, patientRut: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientRut: formatRUT(e.target.value) })}
                                    className="input-premium"
                                    placeholder="12.345.678-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Fecha Nacimiento</label>
                                <input
                                    type="date"
                                    value={formData.patientBirthDate}
                                    onChange={(e) => setFormData({ ...formData, patientBirthDate: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Email</label>
                                <input
                                    type="email"
                                    value={formData.patientEmail}
                                    onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                                    className="input-premium"
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Teléfono</label>
                                <input
                                    value={formData.patientPhone}
                                    onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientPhone: formatPhone(e.target.value) })}
                                    className="input-premium"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Previsión</label>
                                <select
                                    value={formData.healthcareProvider}
                                    onChange={(e) => setFormData({ ...formData, healthcareProvider: e.target.value })}
                                    className="input-premium"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Fonasa">Fonasa</option>
                                    <option value="Colmena">Colmena</option>
                                    <option value="Banmédica">Banmédica</option>
                                    <option value="Consalud">Consalud</option>
                                    <option value="Cruz Blanca">Cruz Blanca</option>
                                    <option value="Vida Cámara">Vida Cámara</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Dirección de Residencia</label>
                            <input
                                value={formData.patientAddress}
                                onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                                className="input-premium"
                                placeholder="Av. Providencia 1234, Santiago"
                            />
                        </div>

                        {/* Medical Background Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-red-500/[0.02] border border-red-500/10 p-6 rounded-3xl">
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-xs font-bold text-white tracking-tight uppercase">Consume Aspirina</p>
                                    <p className="text-[9px] text-white/20 font-mono uppercase">Uso crónico / ocasional</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.medicalBackground?.usesAspirin}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalBackground: { ...formData.medicalBackground!, usesAspirin: e.target.checked }
                                    })}
                                    className="w-5 h-5 accent-red-500"
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-xs font-bold text-white tracking-tight uppercase">Anticoagulantes</p>
                                    <p className="text-[9px] text-white/20 font-mono uppercase">Warfarina, Heparina, etc.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.medicalBackground?.usesAnticoagulants}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalBackground: { ...formData.medicalBackground!, usesAnticoagulants: e.target.checked }
                                    })}
                                    className="w-5 h-5 accent-red-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Clinical Data */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                            <ClipboardList className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Detalles del Procedimiento</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Procedimiento</label>
                                <select
                                    required
                                    value={formData.procedureId}
                                    onChange={(e) => setFormData({ ...formData, procedureId: e.target.value })}
                                    className="input-premium"
                                >
                                    <option value="">Seleccione el procedimiento...</option>
                                    {catalog.map(proc => (
                                        <option key={proc.id} value={proc.id}>[{proc.code}] {proc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Centro Clínico</label>
                                <select
                                    required
                                    value={formData.centerId}
                                    onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                                    className="input-premium"
                                >
                                    <option value="">Seleccione sede...</option>
                                    {centers.map(center => (
                                        <option key={center.id} value={center.id}>{center.name} - {center.city}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Fecha Agenda</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.appointmentDate}
                                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Hora</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.appointmentTime}
                                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Médico / Profesional Responsable</label>
                                <select
                                    required
                                    value={formData.doctorId}
                                    onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                                    className="input-premium"
                                >
                                    <option value="">Seleccione médico...</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Institución Referente</label>
                            <input
                                value={formData.referralInstitution}
                                onChange={(e) => setFormData({ ...formData, referralInstitution: e.target.value })}
                                className="input-premium"
                                placeholder="Clínica Santa María / Centro Médico..."
                            />
                        </div>
                    </div>

                    {/* Section 3: Logistics (Requirement 6) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                            <Landmark className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Logística y Traslados</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white/80">Coordinación de Traslado</p>
                                    <p className="text-[10px] text-white/40 font-mono uppercase">Requerido si es fuera de sede</p>
                                </div>
                                <select
                                    value={formData.logisticsStatus?.transport}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        logisticsStatus: { ...formData.logisticsStatus!, transport: e.target.value as any }
                                    })}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-blue-400 focus:outline-none focus:border-blue-500/40"
                                >
                                    <option value="not_required">No Requiere</option>
                                    <option value="required">Pendiente</option>
                                    <option value="coordinated">Coordinado</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white/80">Gestión de Viáticos</p>
                                    <p className="text-[10px] text-white/40 font-mono uppercase"> Gastos operativos vinculados</p>
                                </div>
                                <select
                                    value={formData.logisticsStatus?.perDiem}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        logisticsStatus: { ...formData.logisticsStatus!, perDiem: e.target.value as any }
                                    })}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-amber-400 focus:outline-none focus:border-amber-500/40"
                                >
                                    <option value="not_required">No Aplica</option>
                                    <option value="required">Solicitado</option>
                                    <option value="coordinated">Aprobado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 pt-10 sticky bottom-0 bg-black/80 backdrop-blur-md pb-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-5 bg-white/5 text-white/40 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] hover:bg-blue-500 active:scale-[0.98] transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {initialData ? 'Actualizar Agendamiento' : 'Confirmar & Programar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .input-premium {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1.25rem;
                    padding: 0.85rem 1.25rem;
                    font-size: 0.875rem;
                    color: white;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-premium:focus {
                    outline: none;
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
                }
                .input-premium::placeholder {
                    color: rgba(255, 255, 255, 0.15);
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};
