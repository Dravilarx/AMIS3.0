import React, { useState, useEffect } from 'react';
import {
    X,
    ClipboardCheck,
    MessageSquare,
    Mail,
    Copy,
    CheckCircle2,
    AlertCircle,
    Clock,
    User,
    Send,
    Loader2,
    Stethoscope,
    Activity,
    FileText
} from 'lucide-react';
import { type ClinicalAppointment, type ClinicalIndications } from '../../types/clinical';
import { cn, formatRUT, formatName, formatPhone } from '../../lib/utils';

interface ProcedureDetailsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: ClinicalAppointment | null;
    onVerifyDoc: (docId: string, verified: boolean) => Promise<{ success: boolean; error?: string }>;
    onGetIndications: (procedureId: string, centerId: string) => Promise<{ success: boolean; data?: ClinicalIndications | null }>;
    onUpdateStatus: (id: string, status: any) => Promise<{ success: boolean; error?: string }>;
    onEdit?: (appointment: ClinicalAppointment) => void;
}

export const ProcedureDetailsPanel: React.FC<ProcedureDetailsPanelProps> = ({
    isOpen,
    onClose,
    appointment,
    onVerifyDoc,
    onGetIndications,
    onUpdateStatus,
    onEdit
}) => {
    const [indications, setIndications] = useState<ClinicalIndications | null>(null);
    const [loadingInd, setLoadingInd] = useState(false);
    const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
    const [isFinishing, setIsFinishing] = useState(false);
    const [copiedType, setCopiedType] = useState<'wa' | 'email' | null>(null);

    useEffect(() => {
        if (isOpen && appointment) {
            setLoadingInd(true);
            onGetIndications(appointment.procedureId, appointment.centerId)
                .then(res => {
                    if (res.success && res.data) setIndications(res.data);
                    else setIndications(null);
                })
                .finally(() => setLoadingInd(false));
        }
    }, [isOpen, appointment]);

    if (!isOpen || !appointment) return null;

    const handleCopy = (text: string, type: 'wa' | 'email') => {
        navigator.clipboard.writeText(text);
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
    };

    const handleVerify = async (docId: string, currentStatus: boolean) => {
        setVerifyingDocId(docId);
        await onVerifyDoc(docId, !currentStatus);
        setVerifyingDocId(null);
    };

    const handleFinish = async () => {
        if (!appointment) return;
        setIsFinishing(true);
        const res = await onUpdateStatus(appointment.id, 'in_progress');
        setIsFinishing(false);
        if (res.success) onClose();
    };

    const formatIndication = (text: string) => {
        if (!text) return '';
        const medicalAlerts = [];
        if (appointment.medicalBackground?.usesAspirin) medicalAlerts.push('USA ASPIRINA');
        if (appointment.medicalBackground?.usesAnticoagulants) medicalAlerts.push('USA ANTICOAGULANTES');
        const alertText = medicalAlerts.length > 0 ? ` [ALERTA: ${medicalAlerts.join(' / ')}] ` : '';

        return text
            .replace('{paciente}', formatName(appointment.patientName))
            .replace('{procedimiento}', appointment.procedure?.name || '')
            .replace('{fecha}', appointment.appointmentDate)
            .replace('{hora}', appointment.appointmentTime)
            .replace('{sede}', appointment.center?.name || '')
            .replace('{alertas}', alertText);
    };

    const waText = indications?.whatsappFormat ? formatIndication(indications.whatsappFormat) : '';
    const emailText = indications?.emailFormat ? formatIndication(indications.emailFormat) : '';

    return (
        <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-2xl bg-[#050505] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Ficha de Procedimiento</h2>
                    <p className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.3em] mt-1">ID: {appointment.id.split('-')[0]}</p>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(appointment)}
                            className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                        >
                            Editar Cita
                        </button>
                    )}
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-white/20" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
                {/* Patient Summary */}
                <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">{formatName(appointment.patientName)}</h3>
                        <p className="text-xs text-white/40 font-medium">{formatRUT(appointment.patientRut)} • {appointment.patientEmail}</p>
                        {appointment.patientPhone && (
                            <p className="text-[9px] text-blue-400 font-mono mt-1">{formatPhone(appointment.patientPhone)}</p>
                        )}
                    </div>
                </div>

                {/* Medical & Logistics Details */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Stethoscope className="w-4 h-4 text-blue-400" />
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Profesional Asignado</h4>
                        </div>
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl group/doc hover:bg-white/[0.04] transition-all">
                            <p className="text-sm font-bold text-white uppercase group-hover/doc:text-blue-400 transition-colors">
                                {appointment.doctor?.name || 'Médico no asignado'}
                            </p>
                            <p className="text-[10px] text-white/30 mt-1 uppercase tracking-tighter">
                                {appointment.doctor?.specialty || 'Especialidad'} • {appointment.doctor?.rut}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-red-500" />
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Antecedentes Médicos</h4>
                        </div>
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-wrap gap-2">
                            {appointment.medicalBackground?.usesAspirin ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">Usa Aspirina</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-white/5 text-white/20 border border-white/5">No Aspirina</span>
                            )}
                            {appointment.medicalBackground?.usesAnticoagulants ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">Anticoagulantes</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-white/5 text-white/20 border border-white/5">No Anticoag</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Procedure Context */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Detalle del Procedimiento</h4>
                    </div>
                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-lg font-black text-white uppercase tracking-tighter italic">
                                [{appointment.procedure?.code}] {appointment.procedure?.name}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Sede / Ubicación</p>
                                <p className="text-xs font-bold text-white/80">{appointment.center?.name}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Centro de Costo</p>
                                <p className="text-xs font-bold text-white/80 uppercase italic">{appointment.healthcareProvider}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1: Requirement Verification (CHECK-OUT) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-3">
                            <ClipboardCheck className="w-4 h-4 text-blue-400" />
                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Verificación de Requisitos (Check-out)</h4>
                        </div>
                        <span className="text-[10px] font-mono text-white/20 uppercase">REQ-002: OPERACIONAL</span>
                    </div>

                    <div className="space-y-3">
                        {appointment.documents?.map((doc: any) => (
                            <div
                                key={doc.id}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                                    doc.verified
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        doc.verified ? "bg-emerald-500 text-white" : "bg-white/5 text-white/20"
                                    )}>
                                        {doc.verified ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white/90">{doc.requirement?.name}</p>
                                        <p className="text-[10px] text-white/30 truncate max-w-xs">{doc.requirement?.description}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleVerify(doc.id, doc.verified)}
                                    disabled={verifyingDocId === doc.id}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        doc.verified
                                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                            : "bg-white/5 text-white/40 hover:bg-blue-600 hover:text-white"
                                    )}
                                >
                                    {verifyingDocId === doc.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : doc.verified ? 'Verificado' : 'Validar'}
                                </button>
                            </div>
                        ))}

                        {(!appointment.documents || appointment.documents.length === 0) && (
                            <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                <AlertCircle className="w-8 h-8 text-white/10 mx-auto mb-4" />
                                <p className="text-xs text-white/40 font-medium">No hay requisitos configurados para este procedimiento.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Patient Indications (WHATSAPP / EMAIL) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Envío de Indicaciones</h4>
                        </div>
                        <span className="text-[10px] font-mono text-white/20 uppercase">REQ-004: COMUNICACIÓN</span>
                    </div>

                    {loadingInd ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : indications ? (
                        <div className="space-y-6">
                            {/* WhatsApp Short */}
                            <div className="group relative bg-[#0B2A1F]/30 border border-emerald-500/20 rounded-3xl overflow-hidden hover:bg-[#0B2A1F]/50 transition-all">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                <MessageSquare className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">WhatsApp Format (Short)</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(waText, 'wa')}
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            {copiedType === 'wa' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                                        </button>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                        <p className="text-xs text-white/70 whitespace-pre-wrap font-medium leading-relaxed italic">
                                            {waText}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Email Long */}
                            <div className="group relative bg-[#1A1F2C]/30 border border-blue-500/20 rounded-3xl overflow-hidden hover:bg-[#1A1F2C]/50 transition-all">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Email Body (Detailed)</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(emailText, 'email')}
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            {copiedType === 'email' ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                                        </button>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 max-h-40 overflow-y-auto scrollbar-hide">
                                        <p className="text-xs text-white/70 whitespace-pre-wrap font-medium leading-relaxed">
                                            {emailText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                            <AlertCircle className="w-8 h-8 text-amber-500/30 mx-auto mb-4" />
                            <p className="text-xs text-white/40 font-medium px-8">No se encontraron plantillas de indicaciones para este procedimiento en esta sede.</p>
                            <button className="mt-4 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Configurar ahora</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions footer */}
            <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl flex gap-4">
                <button
                    onClick={handleFinish}
                    disabled={!appointment.checkoutStatus || isFinishing}
                    className={cn(
                        "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                        appointment.checkoutStatus
                            ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 hover:scale-105"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                >
                    {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Finalizar Admisión
                </button>
                <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    Descargar Ficha PDF
                </button>
            </div>
        </div>
    );
};
