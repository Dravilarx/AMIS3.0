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
    FileText,
    Upload,
    ExternalLink,
    ShieldCheck,
    XCircle
} from 'lucide-react';
import { type ClinicalAppointment, type ClinicalIndications } from '../../types/clinical';
import { cn, formatRUT, formatName, formatPhone } from '../../lib/utils';

interface ProcedureDetailsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: ClinicalAppointment | null;
    onVerifyDoc: (docId: string, verified: boolean, file?: File) => Promise<{ success: boolean; error?: string }>;
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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
        // Reset dropdown state when panel opens/closes
        setOpenDropdownId(null);
    }, [isOpen, appointment]);

    if (!isOpen || !appointment) return null;

    const handleCopy = (text: string, type: 'wa' | 'email') => {
        navigator.clipboard.writeText(text);
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
    };

    // Manual verification (no file attached)
    const handleManualVerify = async (docId: string) => {
        setVerifyingDocId(docId);
        setOpenDropdownId(null);
        const result = await onVerifyDoc(docId, true);
        setVerifyingDocId(null);
        if (!result.success) {
            alert('Error al validar: ' + (result.error || 'Error desconocido'));
        }
    };

    // File-based verification (upload a document)
    const handleFileVerify = (docId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setVerifyingDocId(docId);
            setOpenDropdownId(null);
            const result = await onVerifyDoc(docId, true, file);
            setVerifyingDocId(null);
            if (!result.success) {
                alert('Error al subir archivo: ' + (result.error || 'Error desconocido'));
            }
        };
        input.click();
    };

    // Revert verification
    const handleRevert = async (docId: string) => {
        setVerifyingDocId(docId);
        const result = await onVerifyDoc(docId, false);
        setVerifyingDocId(null);
        if (!result.success) {
            alert('Error al revertir: ' + (result.error || 'Error desconocido'));
        }
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
        <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-2xl bg-prevenort-surface border-l border-prevenort-border shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-prevenort-border bg-prevenort-bg/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-prevenort-primary to-black flex items-center justify-center shadow-xl shadow-orange-500/20">
                        <Activity className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-prevenort-text tracking-tighter uppercase leading-none">Detalles del Agendamiento</h2>
                        <p className="text-[10px] text-prevenort-primary font-black uppercase tracking-[0.2em] mt-1.5">Expediente Clínico Digital</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(appointment)}
                            className="p-3 bg-prevenort-surface border border-prevenort-border text-prevenort-text/40 rounded-2xl hover:text-prevenort-primary hover:border-prevenort-primary transition-all shadow-sm"
                            title="Editar Agendamiento"
                        >
                            <FileText className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-3 bg-prevenort-surface border border-prevenort-border text-prevenort-text/20 rounded-2xl hover:text-prevenort-text hover:border-prevenort-text/40 transition-all shadow-sm">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide pb-32">
                {/* Patient Summary Card */}
                <div className="flex items-center gap-6 p-8 bg-prevenort-bg border border-prevenort-border rounded-[2rem] shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-prevenort-surface border border-prevenort-border flex items-center justify-center shadow-sm">
                        <User className="w-8 h-8 text-prevenort-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-prevenort-text uppercase tracking-tight">{formatName(appointment.patientName)}</h3>
                        <p className="text-[11px] text-prevenort-text/40 font-bold uppercase tracking-wider mt-1">
                            {formatRUT(appointment.patientRut)} <span className="mx-2 opacity-30">|</span> {appointment.patientEmail}
                        </p>
                        {appointment.patientPhone && (
                            <p className="text-[10px] text-prevenort-primary font-black uppercase tracking-widest mt-2">{formatPhone(appointment.patientPhone)}</p>
                        )}
                    </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-prevenort-border pb-2">
                            <Stethoscope className="w-4 h-4 text-prevenort-primary" />
                            <h4 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Especialista AMIS</h4>
                        </div>
                        <div className="p-6 bg-prevenort-surface border border-prevenort-border rounded-3xl shadow-sm space-y-2">
                            <p className="text-sm font-black text-prevenort-text uppercase">
                                {appointment.doctor?.name || 'Por asignar'}
                            </p>
                            <p className="text-[10px] text-prevenort-primary font-black uppercase tracking-wider">
                                {appointment.doctor?.specialty || 'Especialidad'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-prevenort-border pb-2">
                            <Activity className="w-4 h-4 text-danger" />
                            <h4 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Alertas Médicas</h4>
                        </div>
                        <div className="p-6 bg-prevenort-surface border border-prevenort-border rounded-3xl shadow-sm flex flex-wrap gap-2">
                            {appointment.medicalBackground?.usesAspirin ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm animate-pulse">Usa Aspirina</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-prevenort-bg text-prevenort-text/20 border border-prevenort-border">Sin Aspirina</span>
                            )}
                            {appointment.medicalBackground?.usesAnticoagulants ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm animate-pulse">Anticoagulantes</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-prevenort-bg text-prevenort-text/20 border border-prevenort-border">Sin Anticoag</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Procedure Context */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-prevenort-border pb-2">
                        <FileText className="w-4 h-4 text-success" />
                        <h4 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Plan de Atención Clínica</h4>
                    </div>
                    <div className="p-8 bg-success/10 border border-success/20 rounded-[2rem] shadow-sm">
                        <p className="text-xl font-black text-prevenort-text uppercase tracking-tighter italic mb-6">
                            [{appointment.procedure?.code}] {appointment.procedure?.name}
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-success/20">
                            <div>
                                <p className="text-[9px] font-black text-prevenort-text/40 uppercase tracking-[0.2em] mb-1.5 font-bold">Sede Operativa</p>
                                <p className="text-xs font-black text-prevenort-text/60 uppercase">{appointment.center?.name}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-prevenort-text/40 uppercase tracking-[0.2em] mb-1.5 font-bold">Centro de Costo</p>
                                <p className="text-xs font-black text-prevenort-primary uppercase tracking-wider">{appointment.healthcareProvider}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1: Requirement Verification */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-prevenort-border pb-3">
                        <div className="flex items-center gap-3">
                            <ClipboardCheck className="w-4 h-4 text-prevenort-primary" />
                            <h4 className="text-xs font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Cotejo de Requisitos Prevenort</h4>
                        </div>
                        <span className="text-[10px] font-black text-prevenort-text/10 uppercase tracking-widest">Protocolo de Seguridad</span>
                    </div>

                    <div className="space-y-4">
                        {appointment.documents?.map((doc: any) => (
                            <div
                                key={doc.id}
                                className={cn(
                                    "p-6 rounded-[1.5rem] border transition-all group shadow-sm",
                                    doc.verified
                                        ? "bg-success/10 border-success/20"
                                        : "bg-prevenort-surface border-prevenort-border hover:border-prevenort-primary/30"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                            doc.verified ? "bg-success text-white" : "bg-prevenort-bg text-prevenort-text/20"
                                        )}>
                                            {doc.verified ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-prevenort-text uppercase tracking-tight">{doc.requirement?.name}</p>
                                            <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-wider">{doc.requirement?.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {verifyingDocId === doc.id ? (
                                            <div className="px-6 py-3 rounded-2xl bg-prevenort-bg flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-prevenort-primary" />
                                                <span className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-wider">Procesando...</span>
                                            </div>
                                        ) : doc.verified ? (
                                            /* Verified state — show status + revert button */
                                            <>
                                                {doc.documentUrl && (
                                                    <a
                                                        href={doc.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2.5 rounded-xl bg-success/20 text-success hover:bg-success hover:text-white transition-all shadow-sm"
                                                        title="Ver documento adjunto"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-success/20 text-success">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                                                        {doc.documentUrl ? 'DOC. ADJUNTO' : 'MANUAL'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRevert(doc.id)}
                                                    className="p-2.5 rounded-xl bg-prevenort-bg text-prevenort-text/20 hover:bg-danger/10 hover:text-danger transition-all border border-prevenort-border hover:border-danger/20"
                                                    title="Revertir validación"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            /* Not verified — show VALIDAR dropdown */
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}
                                                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-prevenort-bg text-prevenort-text/40 hover:bg-prevenort-primary hover:text-white transition-all border border-prevenort-border hover:border-prevenort-primary"
                                                >
                                                    VALIDAR
                                                </button>

                                                {openDropdownId === doc.id && (
                                                    <>
                                                        {/* Backdrop to close dropdown */}
                                                        <div className="fixed inset-0 z-[70]" onClick={() => setOpenDropdownId(null)} />
                                                        <div className="absolute right-0 top-full mt-2 z-[80] w-64 bg-prevenort-surface border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => handleManualVerify(doc.id)}
                                                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-prevenort-primary/10 transition-all group/opt"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-prevenort-bg flex items-center justify-center group-hover/opt:bg-prevenort-primary group-hover/opt:text-white transition-all">
                                                                    <ShieldCheck className="w-4 h-4 text-prevenort-text/30 group-hover/opt:text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-prevenort-text uppercase tracking-tight">Validación Manual</p>
                                                                    <p className="text-[9px] text-prevenort-text/30 font-bold leading-tight mt-0.5">Confirmar verificación visual</p>
                                                                </div>
                                                            </button>
                                                            <div className="mx-4 border-t border-prevenort-border" />
                                                            <button
                                                                onClick={() => handleFileVerify(doc.id)}
                                                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-success/10 transition-all group/opt"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-prevenort-bg flex items-center justify-center group-hover/opt:bg-success group-hover/opt:text-white transition-all">
                                                                    <Upload className="w-4 h-4 text-prevenort-text/30 group-hover/opt:text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-prevenort-text uppercase tracking-tight">Subir Documento</p>
                                                                    <p className="text-[9px] text-prevenort-text/30 font-bold leading-tight mt-0.5">PDF, imagen o Word</p>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(!appointment.documents || appointment.documents.length === 0) && (
                            <div className="p-16 text-center border-2 border-dashed border-prevenort-border rounded-[2rem] bg-prevenort-bg/50">
                                <AlertCircle className="w-10 h-10 text-prevenort-text/10 mx-auto mb-4" />
                                <p className="text-[10px] text-prevenort-text/20 font-black uppercase tracking-[0.3em]">Sin requisitos clínicos asignados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Patient Indications */}
                <div className="space-y-6 pt-4 mb-20">
                    <div className="flex items-center justify-between border-b border-prevenort-border pb-3">
                        <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-success" />
                            <h4 className="text-xs font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Comunicaciones al Paciente</h4>
                        </div>
                        <span className="text-[10px] font-black text-prevenort-text/10 uppercase tracking-widest">Indicaciones Prevenort</span>
                    </div>

                    {loadingInd ? (
                        <div className="flex justify-center p-16">
                            <Loader2 className="w-10 h-10 text-prevenort-primary animate-spin" />
                        </div>
                    ) : indications ? (
                        <div className="space-y-6">
                            {/* WhatsApp Short */}
                            <div className="group relative bg-success/10 border border-success/20 rounded-[2.5rem] overflow-hidden hover:bg-success/20 transition-all shadow-sm">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-success flex items-center justify-center shadow-lg shadow-success/20">
                                                <MessageSquare className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black text-success uppercase tracking-[0.2em]">Canal WhatsApp</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(waText, 'wa')}
                                            className="p-3 bg-prevenort-surface border border-success/20 rounded-2xl transition-all shadow-sm text-prevenort-text/20 hover:text-success"
                                        >
                                            {copiedType === 'wa' ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="p-6 bg-prevenort-surface rounded-3xl border border-success/20 shadow-inner">
                                        <p className="text-[11px] text-prevenort-text/60 whitespace-pre-wrap font-medium leading-relaxed italic">
                                            {waText}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Email Detailed */}
                            <div className="group relative bg-prevenort-primary/10 border border-prevenort-primary/20 rounded-[2.5rem] overflow-hidden hover:bg-prevenort-primary/20 transition-all shadow-sm">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-prevenort-primary flex items-center justify-center shadow-lg shadow-orange-500/20">
                                                <Mail className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black text-prevenort-primary uppercase tracking-[0.2em]">Canal Email</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(emailText, 'email')}
                                            className="p-3 bg-prevenort-surface border border-prevenort-primary/20 rounded-2xl transition-all shadow-sm text-prevenort-text/20 hover:text-prevenort-primary"
                                        >
                                            {copiedType === 'email' ? <CheckCircle2 className="w-5 h-5 text-prevenort-primary" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="p-6 bg-prevenort-surface rounded-3xl border border-prevenort-primary/20 shadow-inner max-h-48 overflow-y-auto scrollbar-hide">
                                        <p className="text-[11px] text-prevenort-text/60 whitespace-pre-wrap font-medium leading-relaxed">
                                            {emailText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-16 text-center border-2 border-dashed border-prevenort-border rounded-[2.5rem] bg-prevenort-bg/50">
                            <AlertCircle className="w-10 h-10 text-warning/30 mx-auto mb-4" />
                            <p className="text-[10px] text-prevenort-text/20 font-black uppercase tracking-widest px-8">No se encontraron plantillas de indicaciones automáticas.</p>
                            <button className="mt-6 px-8 py-3 bg-prevenort-surface border border-prevenort-border text-prevenort-text/40 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-prevenort-primary hover:text-white hover:border-prevenort-primary transition-all shadow-sm">Configurar Sede</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions footer */}
            <div className="p-10 border-t border-prevenort-border bg-prevenort-surface/95 backdrop-blur-xl flex gap-6 absolute bottom-0 w-full z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                <button
                    onClick={handleFinish}
                    disabled={!appointment.checkoutStatus || isFinishing}
                    className={cn(
                        "flex-1 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl",
                        appointment.checkoutStatus
                            ? "bg-gradient-to-r from-prevenort-primary to-black text-white shadow-orange-500/20 hover:scale-[1.02] hover:brightness-110"
                            : "bg-prevenort-bg text-prevenort-text/20 cursor-not-allowed border border-prevenort-border shadow-none"
                    )}
                >
                    {isFinishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Finalizar Admisión
                </button>
                <button className="flex-1 py-5 bg-prevenort-surface border border-prevenort-border rounded-[1.5rem] text-[11px] font-black text-prevenort-text/40 uppercase tracking-[0.3em] hover:bg-prevenort-bg hover:text-prevenort-primary hover:border-prevenort-primary transition-all shadow-sm">
                    Ficha PDF
                </button>
            </div>
        </div>
    );
};
