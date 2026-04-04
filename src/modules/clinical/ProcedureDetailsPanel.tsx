import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    ClipboardCheck,
    MessageSquare,
    Mail,
    Phone,
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
    XCircle,
    History,
    UploadCloud,
    Mic,
    QrCode,
    Smartphone
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
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
    onGetHistory: (rut: string) => Promise<ClinicalAppointment[]>;
    onUploadResult: (appointmentId: string, doctorId: string, findings: string, file?: File) => Promise<{ success: boolean; error?: string }>;
    addendumRequests?: any[];
}

export const ProcedureDetailsPanel: React.FC<ProcedureDetailsPanelProps> = ({
    isOpen,
    onClose,
    appointment,
    onVerifyDoc,
    onGetIndications,
    onUpdateStatus,
    onEdit,
    onGetHistory,
    onUploadResult,
    addendumRequests = []
}) => {
    const [indications, setIndications] = useState<ClinicalIndications | null>(null);
    const [loadingInd, setLoadingInd] = useState(false);
    const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
    const [isFinishing, setIsFinishing] = useState(false);
    const [copiedType, setCopiedType] = useState<'wa' | 'email' | null>(null);
    const [sentStatus, setSentStatus] = useState<{ wa: boolean, email: boolean }>({ wa: false, email: false });
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Patient History states
    const [history, setHistory] = useState<ClinicalAppointment[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Upload Results states
    const [uploadingResult, setUploadingResult] = useState(false);
    const [resultFile, setResultFile] = useState<File | null>(null);
    const [findings, setFindings] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [isPhoneConnected, setIsPhoneConnected] = useState(false);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && appointment) {
            setLoadingInd(true);
            onGetIndications(appointment.procedureId, appointment.centerId || '')
                .then(res => {
                    if (res.success && res.data) setIndications(res.data);
                    else setIndications(null);
                })
                .finally(() => setLoadingInd(false));
        }
        // Reset dropdown and QR state when panel opens/closes
        setOpenDropdownId(null);
        setShowQR(false);
        setSessionToken(null);
    }, [isOpen, appointment]);

    useEffect(() => {
        if (!sessionToken) return;

        const channel = supabase
            .channel(`remote-mic-${sessionToken}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'remote_dictation_sessions',
                filter: `session_token=eq.${sessionToken}` 
            }, (payload: any) => {
                // Actualizar estado de conexión
                if (payload.new.is_connected !== undefined) {
                    setIsPhoneConnected(payload.new.is_connected);
                }

                // Inyectar texto
                const newText = payload.new.live_text;
                if (newText && textareaRef.current) {
                    const start = textareaRef.current.selectionStart;
                    const end = textareaRef.current.selectionEnd;
                    const text = textareaRef.current.value;
                    const before = text.substring(0, start);
                    const after = text.substring(end);
                    
                    const result = `${before}${before.endsWith(' ') || before === '' ? '' : ' '}${newText}${after.startsWith(' ') || after === '' ? '' : ' '}${after}`;
                    setFindings(result);
                    
                    // Simple notification sound or feedback could go here
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionToken]);

    const toggleRemoteMic = async () => {
        if (showQR) {
            setShowQR(false);
            return;
        }

        if (!appointment) return;

        setIsPhoneConnected(false); // Reset connection status for new token

        // Generate token
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Expiration
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        // Save session
        const { error } = await supabase
            .from('remote_dictation_sessions')
            .upsert({
                study_uid: appointment.id,
                session_token: token,
                expires_at: expiresAt.toISOString()
            });

        if (!error) {
            setSessionToken(token);
            setShowQR(true);
        } else {
            console.error("Error creating dictation session:", error);
        }
    };

    if (!isOpen || !appointment) return null;

    const handleCopy = (text: string, type: 'wa' | 'email') => {
        navigator.clipboard.writeText(text);
        setCopiedType(type);
        setSentStatus(prev => ({ ...prev, [type]: true }));
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

        const publicUrl = `${window.location.origin}/guia/${appointment.id}`;
        const accessMessage = `\n\nPuedes acceder a la información detallada y de preparación para tu procedimiento en el siguiente enlace:\n${publicUrl}`;

        return text
            .replace(/\\n/g, '\n') // Fix literal \n coming from DB
            .replace(/{paciente}/g, formatName(appointment.patientName))
            .replace(/{procedimiento}/g, appointment.procedure?.name || '')
            .replace(/{fecha}/g, appointment.appointmentDate)
            .replace(/{hora}/g, appointment.appointmentTime)
            .replace(/{sede}/g, appointment.center?.name || '')
            .replace(/{alertas}/g, alertText) + accessMessage;
    };

    const waText = indications?.whatsappFormat ? formatIndication(indications.whatsappFormat) : '';
    const emailText = indications?.emailFormat ? formatIndication(indications.emailFormat) : '';

    return (
        <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-2xl bg-brand-surface border-l border-brand-border shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-xl shadow-orange-500/20">
                        <Activity className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-brand-text tracking-tighter uppercase leading-none">Detalles del Agendamiento</h2>
                        <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mt-1.5">Expediente Clínico Digital</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href={`/guia/${appointment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-3 bg-brand-surface border border-brand-border/50 text-brand-text/60 hover:text-brand-primary rounded-2xl hover:border-brand-primary/40 transition-all shadow-sm group"
                        title="Ver Guía Pública del Paciente"
                    >
                        <ExternalLink className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                    </a>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(appointment)}
                            className="p-3 bg-brand-surface border border-brand-border text-brand-text/40 rounded-2xl hover:text-brand-primary hover:border-brand-primary transition-all shadow-sm"
                            title="Editar Agendamiento"
                        >
                            <FileText className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-3 bg-brand-surface border border-brand-border text-brand-text/20 rounded-2xl hover:text-brand-text hover:border-brand-text/40 transition-all shadow-sm">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide pb-32">
                {/* Patient Summary Card */}
                <div className="flex items-center gap-6 p-8 bg-brand-bg border border-brand-border rounded-[2rem] shadow-sm relative overflow-hidden">
                    <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center shadow-sm">
                        <User className="w-8 h-8 text-brand-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-brand-text uppercase tracking-tight">{formatName(appointment.patientName)}</h3>
                        <p className="text-[11px] text-brand-text/40 font-bold uppercase tracking-wider mt-1">
                            {formatRUT(appointment.patientRut)} <span className="mx-2 opacity-30">|</span> {appointment.patientEmail}
                        </p>
                        {appointment.patientPhone && (
                            <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest mt-2">{formatPhone(appointment.patientPhone)}</p>
                        )}
                    </div>
                    <button
                        onClick={async () => {
                            setLoadingHistory(true);
                            setIsHistoryOpen(true);
                            try {
                                const data = await onGetHistory(appointment.patientRut);
                                setHistory(data);
                            } finally {
                                setLoadingHistory(false);
                            }
                        }}
                        className="px-6 py-4 bg-brand-surface border border-brand-border hover:bg-brand-bg rounded-2xl transition-all shadow-sm flex items-center gap-3 group"
                    >
                        <History className="w-5 h-5 text-brand-text/40 group-hover:text-brand-primary transition-colors" />
                        <div className="text-left hidden md:block">
                            <p className="text-[10px] font-black text-brand-text uppercase tracking-widest">Historial</p>
                            <p className="text-[9px] text-brand-text/40 font-bold uppercase tracking-tighter">Clínico AMIS</p>
                        </div>
                    </button>

                    {/* Absolute History Overlay */}
                    {isHistoryOpen && (
                        <div className="absolute inset-0 bg-brand-surface/95 backdrop-blur-xl z-50 flex flex-col pt-8 pb-4 px-8 overflow-hidden rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 border border-brand-border">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <History className="w-5 h-5 text-brand-primary" />
                                    <h4 className="text-[11px] font-black text-brand-text uppercase tracking-[0.2em]">Historial del Paciente</h4>
                                </div>
                                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-brand-bg rounded-full text-brand-text/40 hover:text-danger transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pb-8">
                                {loadingHistory ? (
                                    <div className="flex justify-center p-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                    </div>
                                ) : history.length === 0 ? (
                                    <p className="text-center text-[10px] uppercase font-black tracking-widest text-brand-text/20 p-8">No hay atenciones previas.</p>
                                ) : (
                                    history.map(h => (
                                        <div key={h.id} className="p-4 bg-brand-bg border border-brand-border rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[11px] font-black text-brand-text uppercase">{h.procedure?.name}</p>
                                                <p className="text-[10px] text-brand-text/40 font-bold mt-1">
                                                    {new Date(`${h.appointmentDate}T12:00:00`).toLocaleDateString('es-CL')} - {h.center?.name || 'Sede'}
                                                </p>
                                            </div>
                                            <span className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg", h.status === 'completed' ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                                                {h.status}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-brand-border pb-2">
                            <Stethoscope className="w-4 h-4 text-brand-primary" />
                            <h4 className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em]">Especialista AMIS</h4>
                        </div>
                        <div className="p-6 bg-brand-surface border border-brand-border rounded-3xl shadow-sm space-y-2">
                            <p className="text-sm font-black text-brand-text uppercase">
                                {appointment.doctor?.name || 'Por asignar'}
                            </p>
                            <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider">
                                {appointment.doctor?.specialty || 'Especialidad'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-brand-border pb-2">
                            <Activity className="w-4 h-4 text-danger" />
                            <h4 className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em]">Alertas Médicas</h4>
                        </div>
                        <div className="p-6 bg-brand-surface border border-brand-border rounded-3xl shadow-sm flex flex-wrap gap-2">
                            {appointment.medicalBackground?.usesAspirin ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm animate-pulse">Usa Aspirina</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-brand-bg text-brand-text/20 border border-brand-border">Sin Aspirina</span>
                            )}
                            {appointment.medicalBackground?.usesAnticoagulants ? (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm animate-pulse">Anticoagulantes</span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-brand-bg text-brand-text/20 border border-brand-border">Sin Anticoag</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Procedure Context */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-brand-border pb-2">
                        <FileText className="w-4 h-4 text-success" />
                        <h4 className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em]">Plan de Atención Clínica</h4>
                    </div>
                    <div className="p-8 bg-success/10 border border-success/20 rounded-[2rem] shadow-sm">
                        <p className="text-xl font-black text-brand-text uppercase tracking-tighter italic mb-6">
                            [{appointment.procedure?.code}] {appointment.procedure?.name}
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-success/20">
                            <div>
                                <p className="text-[9px] font-black text-brand-text/40 uppercase tracking-[0.2em] mb-1.5 font-bold">Sede Operativa</p>
                                <p className="text-xs font-black text-brand-text/60 uppercase">{appointment.center?.name}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-brand-text/40 uppercase tracking-[0.2em] mb-1.5 font-bold">Centro de Costo</p>
                                <p className="text-xs font-black text-brand-primary uppercase tracking-wider">{appointment.healthcareProvider}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1: Requirement Verification */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-brand-border pb-3">
                        <div className="flex items-center gap-3">
                            <ClipboardCheck className="w-4 h-4 text-brand-primary" />
                            <h4 className="text-xs font-black text-brand-text/40 uppercase tracking-[0.2em]">Cotejo de Requisitos Prevenort</h4>
                        </div>
                        <span className="text-[10px] font-black text-brand-text/10 uppercase tracking-widest">Protocolo de Seguridad</span>
                    </div>

                    <div className="space-y-4">
                        {appointment.documents?.map((doc: any) => (
                            <div
                                key={doc.id}
                                className={cn(
                                    "p-6 rounded-[1.5rem] border transition-all group shadow-sm",
                                    doc.verified
                                        ? "bg-success/10 border-success/20"
                                        : "bg-brand-primary/10 border-brand-primary/20 hover:border-brand-primary/30"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                            doc.verified ? "bg-success text-white shadow-success/20" : "bg-brand-primary shadow-lg shadow-orange-500/20 text-white"
                                        )}>
                                            {doc.verified ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-brand-text uppercase tracking-tight">{doc.requirement?.name}</p>
                                            <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-wider">{doc.requirement?.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {verifyingDocId === doc.id ? (
                                            <div className="px-6 py-3 rounded-2xl bg-brand-bg flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                                                <span className="text-[10px] font-black text-brand-text/40 uppercase tracking-wider">Procesando...</span>
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
                                                    className="p-2.5 rounded-xl bg-brand-bg text-brand-text/20 hover:bg-danger/10 hover:text-danger transition-all border border-brand-border hover:border-danger/20"
                                                    title="Revertir validación"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            /* Not verified — show VALIDAR dropdown */
                                            <div className="flex items-center gap-2 relative">
                                                {doc.documentUrl && (
                                                    <a
                                                        href={doc.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm animate-pulse"
                                                        title="Documento subido por el paciente"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)}
                                                    className={cn(
                                                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm",
                                                        openDropdownId === doc.id
                                                            ? "bg-brand-primary text-white border-brand-primary"
                                                            : "bg-brand-surface text-brand-text/40 border-brand-primary/30 hover:bg-brand-primary hover:text-white hover:border-brand-primary/50"
                                                    )}
                                                >
                                                    VALIDAR
                                                </button>

                                                {openDropdownId === doc.id && (
                                                    <>
                                                        {/* Backdrop to close dropdown */}
                                                        <div className="fixed inset-0 z-[70]" onClick={() => setOpenDropdownId(null)} />
                                                        <div className="absolute right-0 top-full mt-2 z-[80] w-64 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => handleManualVerify(doc.id)}
                                                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-brand-primary/10 transition-all group/opt"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-brand-bg flex items-center justify-center group-hover/opt:bg-brand-primary group-hover/opt:text-white transition-all">
                                                                    <ShieldCheck className="w-4 h-4 text-brand-text/30 group-hover/opt:text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-brand-text uppercase tracking-tight">Validación Manual</p>
                                                                    <p className="text-[9px] text-brand-text/30 font-bold leading-tight mt-0.5">Confirmar verificación visual</p>
                                                                </div>
                                                            </button>
                                                            <div className="mx-4 border-t border-brand-border" />
                                                            <button
                                                                onClick={() => handleFileVerify(doc.id)}
                                                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-success/10 transition-all group/opt"
                                                            >
                                                                <div className="w-9 h-9 rounded-xl bg-brand-bg flex items-center justify-center group-hover/opt:bg-success group-hover/opt:text-white transition-all">
                                                                    <Upload className="w-4 h-4 text-brand-text/30 group-hover/opt:text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-brand-text uppercase tracking-tight">Subir Documento</p>
                                                                    <p className="text-[9px] text-brand-text/30 font-bold leading-tight mt-0.5">PDF, imagen o Word</p>
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
                            <div className="p-16 text-center border-2 border-dashed border-brand-border rounded-[2rem] bg-brand-bg/50">
                                <AlertCircle className="w-10 h-10 text-brand-text/10 mx-auto mb-4" />
                                <p className="text-[10px] text-brand-text/20 font-black uppercase tracking-[0.3em]">Sin requisitos clínicos asignados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Patient Indications */}
                <div className="space-y-6 pt-4 mb-20">
                    <div className="flex items-center justify-between border-b border-brand-border pb-3">
                        <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-success" />
                            <h4 className="text-xs font-black text-brand-text/40 uppercase tracking-[0.2em]">Comunicaciones al Paciente</h4>
                        </div>
                        <span className="text-[10px] font-black text-brand-text/10 uppercase tracking-widest">Indicaciones Prevenort</span>
                    </div>

                    {loadingInd ? (
                        <div className="flex justify-center p-16">
                            <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                        </div>
                    ) : indications ? (
                        <div className="space-y-6">
                            {/* WhatsApp Short */}
                            <div className={cn(
                                "group relative border rounded-[2.5rem] overflow-hidden transition-all shadow-sm",
                                sentStatus.wa
                                    ? "bg-success/10 border-success/20 hover:bg-success/20"
                                    : "bg-brand-primary/10 border-brand-primary/20 hover:bg-brand-primary/20"
                            )}>
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
                                                sentStatus.wa ? "bg-success shadow-success/20" : "bg-brand-primary shadow-orange-500/20"
                                            )}>
                                                <MessageSquare className="w-5 h-5 text-white" />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                                sentStatus.wa ? "text-success" : "text-brand-primary"
                                            )}>Canal WhatsApp</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleCopy(waText, 'wa');
                                                window.open(`https://wa.me/${appointment.patientPhone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(waText)}`, '_blank');
                                            }}
                                            className={cn(
                                                "p-3 bg-brand-surface border rounded-2xl transition-all shadow-sm flex items-center gap-2",
                                                sentStatus.wa ? "border-success/20 text-success hover:bg-success/10" : "border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10"
                                            )}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2">
                                                {sentStatus.wa ? 'Reenviar' : 'Enviar'}
                                            </span>
                                            {copiedType === 'wa' ? <CheckCircle2 className={cn("w-5 h-5", sentStatus.wa ? "text-success" : "text-brand-primary")} /> : <Phone className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className={cn(
                                        "p-6 bg-brand-surface rounded-3xl border shadow-inner transition-colors",
                                        sentStatus.wa ? "border-success/20" : "border-brand-primary/20"
                                    )}>
                                        <p className="text-[11px] text-brand-text/60 whitespace-pre-wrap font-medium leading-relaxed italic">
                                            {waText}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Email Detailed */}
                            <div className={cn(
                                "group relative border rounded-[2.5rem] overflow-hidden transition-all shadow-sm",
                                sentStatus.email
                                    ? "bg-success/10 border-success/20 hover:bg-success/20"
                                    : "bg-brand-primary/10 border-brand-primary/20 hover:bg-brand-primary/20"
                            )}>
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
                                                sentStatus.email ? "bg-success shadow-success/20" : "bg-brand-primary shadow-orange-500/20"
                                            )}>
                                                <Mail className="w-5 h-5 text-white" />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                                sentStatus.email ? "text-success" : "text-brand-primary"
                                            )}>Canal Email</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleCopy(emailText, 'email');
                                                window.open(`mailto:${appointment.patientEmail || ''}?subject=${encodeURIComponent(`Indicaciones de Preparación - ${appointment.procedure?.name}`)}&body=${encodeURIComponent(emailText)}`);
                                            }}
                                            className={cn(
                                                "p-3 bg-brand-surface border rounded-2xl transition-all shadow-sm flex items-center gap-2",
                                                sentStatus.email ? "border-success/20 text-success hover:bg-success/10" : "border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10"
                                            )}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2">
                                                {sentStatus.email ? 'Reenviar' : 'Enviar'}
                                            </span>
                                            {copiedType === 'email' ? <CheckCircle2 className={cn("w-5 h-5", sentStatus.email ? "text-success" : "text-brand-primary")} /> : <Mail className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className={cn(
                                        "p-6 bg-brand-surface rounded-3xl border shadow-inner max-h-48 overflow-y-auto scrollbar-hide transition-colors",
                                        sentStatus.email ? "border-success/20" : "border-brand-primary/20"
                                    )}>
                                        <p className="text-[11px] text-brand-text/60 whitespace-pre-wrap font-medium leading-relaxed">
                                            {emailText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-16 text-center border-2 border-dashed border-brand-border rounded-[2.5rem] bg-brand-bg/50">
                            <AlertCircle className="w-10 h-10 text-warning/30 mx-auto mb-4" />
                            <p className="text-[10px] text-brand-text/20 font-black uppercase tracking-widest px-8">No se encontraron plantillas de indicaciones automáticas.</p>
                            <button className="mt-6 px-8 py-3 bg-brand-surface border border-brand-border text-brand-text/40 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shadow-sm">Configurar Sede</button>
                        </div>
                    )}
                </div>

                {/* Section Result / Finale */}
                <div className="space-y-6 pt-10 border-t border-brand-border">
                    <div className="flex items-center justify-between border-b border-brand-border pb-3">
                        <div className="flex items-center gap-3">
                            <UploadCloud className="w-5 h-5 text-brand-primary" />
                            <h4 className="text-[11px] font-black text-brand-text/40 uppercase tracking-[0.25em]">Resultados y Entrega Final</h4>
                        </div>
                        {/* Addendum Alert in Console */}
                        {appointment && addendumRequests.some(r => r.patient_rut === appointment.patientRut && r.status === 'PENDING') && (
                            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center text-warning">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-warning uppercase tracking-widest">⚠️ SOLICITUD DE ADDENDUM / INTERCONSULTA</p>
                                    <p className="text-[10px] text-brand-text/60 font-bold mt-0.5">
                                        {addendumRequests.find(r => r.patient_rut === appointment.patientRut && r.status === 'PENDING')?.request_text || 'Revisar antecedentes adicionales.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-brand-surface border border-brand-border rounded-[2rem] shadow-sm space-y-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest px-1">Subir Archivo de Resultados (Opcional)</label>
                            <input
                                type="file"
                                onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text focus:border-brand-primary transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:uppercase file:font-black file:tracking-widest file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest">Dictamen o Conclusiones</label>
                                <div className="flex items-center gap-3">
                                    {showQR && (
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                                            isPhoneConnected 
                                                ? "bg-success/10 border-success/30 text-success shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                                                : "bg-brand-text/5 border-brand-border/30 text-brand-text/30"
                                        )}>
                                            <Smartphone className={cn("w-3 h-3", isPhoneConnected && "animate-pulsing-subtle text-success")} />
                                            <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                                                {isPhoneConnected ? 'Puente Firme' : 'Celular no vinculado'}
                                            </span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={toggleRemoteMic}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border",
                                            showQR 
                                                ? "bg-brand-primary text-white border-brand-primary" 
                                                : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white"
                                        )}
                                    >
                                        <Mic className={cn("w-3.5 h-3.5", showQR && "animate-pulse")} />
                                        {showQR ? "DETENER" : "MICRÓFONO REMOTO"}
                                    </button>
                                </div>
                            </div>

                            {showQR && sessionToken && (
                                <div className="p-8 bg-brand-surface border border-brand-primary/30 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 animate-in zoom-in-95 duration-500 shadow-2xl shadow-orange-500/10 mb-6">
                                    <div className="p-4 bg-white rounded-3xl shadow-inner border-4 border-brand-primary/10 group transition-all hover:scale-105">
                                         <QRCodeSVG value={`${window.location.origin}/mobile-mic/${sessionToken}`} size={140} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-3">
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <QrCode className="w-4 h-4 text-brand-primary" />
                                            <h5 className="text-sm font-black uppercase text-brand-text tracking-tighter">Dictado Remoto Activo</h5>
                                        </div>
                                        <p className="text-[10px] text-brand-text/50 font-bold uppercase leading-relaxed max-w-xs">
                                            Escanea con tu celular para convertirlo en micrófono. Los hallazgos se inyectarán en la posición del cursor.
                                        </p>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-xl w-fit mx-auto md:mx-0">
                                            <Clock className="w-3 h-3" />
                                            EXPIRA EN 30 MIN O AL CERRAR EXAMEN
                                        </div>
                                    </div>
                                </div>
                            )}

                            <textarea
                                ref={textareaRef}
                                value={findings}
                                onChange={(e) => setFindings(e.target.value)}
                                className="w-full h-48 bg-brand-bg border border-brand-border rounded-[1.5rem] px-5 py-4 text-sm text-brand-text focus:border-brand-primary transition-all shadow-inner focus:ring-4 focus:ring-brand-primary/5"
                                placeholder="Escriba o use el micrófono remoto para dictar sus hallazgos..."
                            />
                        </div>
                        <button
                            disabled={uploadingResult || appointment.status === 'completed'}
                            onClick={async () => {
                                setUploadingResult(true);
                                try {
                                    const res = await onUploadResult(
                                        appointment.id,
                                        appointment.doctorId,
                                        findings,
                                        resultFile || undefined
                                    );
                                    if (res.success) {
                                        alert("Resultados guardados, procedimiento finalizado exitosamente.");
                                        onClose();
                                    } else {
                                        alert("Error: " + res.error);
                                    }
                                } finally {
                                    setUploadingResult(false);
                                }
                            }}
                            className={cn(
                                "w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                                appointment.status === 'completed'
                                    ? "bg-success/20 text-success border border-success/30"
                                    : "bg-brand-primary text-white hover:brightness-110 shadow-xl shadow-orange-500/20"
                            )}
                        >
                            {uploadingResult ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {appointment.status === 'completed' ? 'Finalizado' : 'Guardar Resultados y Finalizar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions footer */}
            <div className="p-10 border-t border-brand-border bg-brand-surface/95 backdrop-blur-xl flex gap-6 absolute bottom-0 w-full z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                <button
                    onClick={handleFinish}
                    disabled={!appointment.checkoutStatus || isFinishing}
                    className={cn(
                        "flex-1 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl",
                        appointment.checkoutStatus
                            ? "bg-gradient-to-r from-brand-primary to-black text-white shadow-orange-500/20 hover:scale-[1.02] hover:brightness-110"
                            : "bg-brand-bg text-brand-text/20 cursor-not-allowed border border-brand-border shadow-none"
                    )}
                >
                    {isFinishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Finalizar Admisión
                </button>
                <button className="flex-1 py-5 bg-brand-surface border border-brand-border rounded-[1.5rem] text-[11px] font-black text-brand-text/40 uppercase tracking-[0.3em] hover:bg-brand-bg hover:text-brand-primary hover:border-brand-primary transition-all shadow-sm">
                    Ficha PDF
                </button>
            </div>
        </div>
    );
};
