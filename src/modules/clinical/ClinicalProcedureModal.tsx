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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-prevenort-surface border border-prevenort-border rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="sticky top-0 z-10 p-8 border-b border-prevenort-border bg-prevenort-surface/95 backdrop-blur-xl">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-prevenort-primary to-black flex items-center justify-center shadow-xl shadow-orange-500/20">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-prevenort-text tracking-tighter uppercase leading-none">
                                {initialData ? 'Editar Agendamiento' : 'Nuevo Agendamiento AMIS'}
                            </h3>
                            <p className="text-[10px] text-prevenort-primary font-black uppercase tracking-[0.3em] mt-1.5">Inteligencia Clínica & Control Operativo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-prevenort-bg rounded-2xl transition-all group">
                        <X className="w-6 h-6 text-prevenort-text/20 group-hover:text-prevenort-text" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-14">
                    {error && (
                        <div className="p-5 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-[11px] font-black uppercase tracking-widest flex items-center gap-4 shadow-sm">
                            <div className="w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    {/* Section 1: Patient Information */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-prevenort-border pb-3">
                            <User className="w-5 h-5 text-prevenort-primary" />
                            <h4 className="text-[11px] font-black text-prevenort-text/40 uppercase tracking-[0.25em]">Expediente del Paciente</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">Nombre Completo</label>
                                <input
                                    required
                                    value={formData.patientName}
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientName: formatName(e.target.value) })}
                                    className="input-premium"
                                    placeholder="Ej: Marcelo Ávila"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">RUT / Identificador</label>
                                <input
                                    required
                                    value={formData.patientRut}
                                    onChange={(e) => setFormData({ ...formData, patientRut: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientRut: formatRUT(e.target.value) })}
                                    className="input-premium"
                                    placeholder="12.345.678-9"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">Fecha Nacimiento</label>
                                <input
                                    type="date"
                                    value={formData.patientBirthDate}
                                    onChange={(e) => setFormData({ ...formData, patientBirthDate: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">Email de Contacto</label>
                                <input
                                    type="email"
                                    value={formData.patientEmail}
                                    onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                                    className="input-premium"
                                    placeholder="usuario@amis.global"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">Teléfono Móvil</label>
                                <input
                                    value={formData.patientPhone}
                                    onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                                    onBlur={(e) => setFormData({ ...formData, patientPhone: formatPhone(e.target.value) })}
                                    className="input-premium"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/20 tracking-widest px-1">Sistema de Previsión</label>
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
                        <div className="space-y-2.5">
                            <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Domicilio Actual</label>
                            <input
                                value={formData.patientAddress}
                                onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                                className="input-premium"
                                placeholder="Calle, Número, Comuna, Ciudad"
                            />
                        </div>

                        {/* Medical Background Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-prevenort-bg border border-prevenort-border/60 p-8 rounded-[2rem] shadow-sm">
                            <div className="flex items-center justify-between p-5 bg-prevenort-surface rounded-2xl border border-prevenort-border shadow-sm transition-all hover:border-prevenort-primary/30">
                                <div>
                                    <p className="text-xs font-black text-prevenort-text tracking-tight uppercase">Consume Aspirina</p>
                                    <p className="text-[10px] text-prevenort-text/40 font-black uppercase tracking-wider mt-0.5">Control de Sangramiento</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.medicalBackground?.usesAspirin}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalBackground: { ...formData.medicalBackground!, usesAspirin: e.target.checked }
                                    })}
                                    className="w-6 h-6 accent-prevenort-primary rounded-lg"
                                />
                            </div>
                            <div className="flex items-center justify-between p-5 bg-prevenort-surface rounded-2xl border border-prevenort-border shadow-sm transition-all hover:border-prevenort-primary/30">
                                <div>
                                    <p className="text-xs font-black text-prevenort-text tracking-tight uppercase">Anticoagulantes</p>
                                    <p className="text-[10px] text-prevenort-text/40 font-black uppercase tracking-wider mt-0.5">Riesgo Quirúrgico</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.medicalBackground?.usesAnticoagulants}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalBackground: { ...formData.medicalBackground!, usesAnticoagulants: e.target.checked }
                                    })}
                                    className="w-6 h-6 accent-prevenort-primary rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Clinical Data */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-prevenort-border pb-3">
                            <ClipboardList className="w-5 h-5 text-success" />
                            <h4 className="text-[11px] font-black text-prevenort-text/40 uppercase tracking-[0.25em]">Planificación Clínica</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Procedimiento Médico</label>
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
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Centro / Sede AMIS</label>
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
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Fecha Programada</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.appointmentDate}
                                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Hora Estimada</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.appointmentTime}
                                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div className="space-y-2.5 md:col-span-2">
                                <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Médico / Especialista a Cargo</label>
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
                        <div className="space-y-2.5">
                            <label className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-1">Institución de Referencia</label>
                            <input
                                value={formData.referralInstitution}
                                onChange={(e) => setFormData({ ...formData, referralInstitution: e.target.value })}
                                className="input-premium"
                                placeholder="Clínica u Hospital de origen"
                            />
                        </div>
                    </div>

                    {/* Section 3: Logistics */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-prevenort-border pb-3">
                            <Landmark className="w-5 h-5 text-warning" />
                            <h4 className="text-[11px] font-black text-prevenort-text/40 uppercase tracking-[0.25em]">Logística Operativa</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-prevenort-bg border border-prevenort-border/60 rounded-[2rem] shadow-sm">
                            <div className="flex items-center justify-between gap-6 p-1">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-prevenort-text tracking-tight uppercase">Coordinación de Traslado</p>
                                    <p className="text-[10px] text-prevenort-text/40 font-black uppercase tracking-wider">Flujo de Movilidad Externa</p>
                                </div>
                                <select
                                    value={formData.logisticsStatus?.transport}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        logisticsStatus: { ...formData.logisticsStatus!, transport: e.target.value as any }
                                    })}
                                    className="bg-prevenort-surface border-2 border-prevenort-border rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase text-prevenort-primary focus:border-prevenort-primary outline-none transition-all shadow-sm"
                                >
                                    <option value="not_required">No Requiere</option>
                                    <option value="required">Pendiente</option>
                                    <option value="coordinated">Coordinado</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between gap-6 p-1">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-prevenort-text tracking-tight uppercase">Gestión de Viáticos</p>
                                    <p className="text-[10px] text-prevenort-text/40 font-black uppercase tracking-wider">Asignación de Fondos Operativos</p>
                                </div>
                                <select
                                    value={formData.logisticsStatus?.perDiem}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        logisticsStatus: { ...formData.logisticsStatus!, perDiem: e.target.value as any }
                                    })}
                                    className="bg-prevenort-surface border-2 border-prevenort-border rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase text-warning focus:border-warning outline-none transition-all shadow-sm"
                                >
                                    <option value="not_required">No Aplica</option>
                                    <option value="required">Solicitado</option>
                                    <option value="coordinated">Aprobado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-6 pt-12 sticky bottom-0 bg-prevenort-surface/90 backdrop-blur-md pb-6 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-5 bg-prevenort-bg text-prevenort-text/40 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-prevenort-border transition-all border border-prevenort-border"
                        >
                            Descartar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-8 py-5 bg-gradient-to-r from-prevenort-primary to-black text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {initialData ? 'Actualizar Expediente' : 'Confirmar & Programar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .input-premium {
                    width: 100%;
                    background: var(--prevenort-bg);
                    border: 2px solid var(--prevenort-border);
                    border-radius: 1.25rem;
                    padding: 0.9rem 1.4rem;
                    font-size: 0.875rem;
                    color: var(--prevenort-text);
                    font-weight: 500;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-premium:focus {
                    outline: none;
                    background: var(--prevenort-surface);
                    border-color: var(--prevenort-primary);
                    box-shadow: 0 0 20px rgba(249, 115, 22, 0.08);
                }
                .input-premium::placeholder {
                    opacity: 0.3;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};
