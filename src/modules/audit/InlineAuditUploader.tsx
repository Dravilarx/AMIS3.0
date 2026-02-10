import React, { useState } from 'react';
import { Upload, X, Loader2, FileText, CheckCircle2, Building2, User, Fingerprint, MessageSquare } from 'lucide-react';
import { analyzeClinicalReportFromPDF } from './agrawallAI';
import { useAudit } from '../../hooks/useAudit';
import { cn } from '../../lib/utils';

interface InlineAuditUploaderProps {
    onClose: () => void;
}

export const InlineAuditUploader: React.FC<InlineAuditUploaderProps> = ({ onClose }) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        patientName: '',
        patientId: '',
        institution: 'Holding Portezuelo',
        requestType: 'Radiología',
        description: ''
    });
    const [aiResult, setAiResult] = useState<any>(null);
    const { addAudit } = useAudit();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setAnalyzing(true);
            try {
                console.log('[Audit] IA Analizando archivo...', selectedFile.name);
                const data = await analyzeClinicalReportFromPDF(selectedFile);
                setAiResult(data);
                if (!formData.description) {
                    setFormData(prev => ({ ...prev, description: data.reasoning }));
                }
            } catch (error) {
                console.error('Error análisis IA:', error);
            } finally {
                setAnalyzing(false);
            }
        }
    };

    const handleCreateCase = async () => {
        try {
            const auditData = {
                patient_name: formData.patientName || 'Paciente Nuevo',
                project_id: null,
                score: aiResult?.score || 1,
                reportContent: formData.description || `Análisis de archivo: ${file?.name}`,
                anomalies: (aiResult?.findings || []).join('\n'), // Convertir array a texto plano
                compliance_details: {
                    aiClassificationReason: aiResult?.reasoning || formData.description,
                    patientId: formData.patientId,
                    institution: formData.institution,
                    requestType: formData.requestType,
                    fileName: file?.name
                },
                status: 'completed'
                // created_at eliminado - Supabase lo genera automáticamente
            };

            console.log('[Audit] Datos a enviar:', auditData);
            const result = await addAudit(auditData);

            if (result.success) {
                onClose();
            } else {
                console.error('ERROR SUPABASE:', result.error);
                // Diagnóstico para el usuario
                const errorDetail = result.error?.message || JSON.stringify(result.error);
                alert(`Error de Base de Datos: ${errorDetail}\n\nRevisa si los nombres de columna coinciden.`);
            }
        } catch (err) {
            console.error('Error en el envío:', err);
            alert('Error al procesar el envío del formulario.');
        }
    };

    return (
        <div className="card-premium p-8 bg-prevenort-surface border border-prevenort-border space-y-8 animate-in fade-in zoom-in-slow duration-500 overflow-hidden relative shadow-2xl">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-prevenort-border pb-6 relative">
                <div>
                    <h2 className="text-xl font-black text-prevenort-text uppercase tracking-tighter italic">Nuevo Caso / Reclamo</h2>
                    <p className="text-[10px] text-prevenort-text/30 uppercase tracking-[0.25em] font-bold mt-1 ml-1">Sistema de Gestión Clínica Inteligente</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-prevenort-bg rounded-full text-prevenort-text/20 hover:text-prevenort-text transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-info" /> Paciente
                    </label>
                    <input
                        type="text"
                        placeholder="Nombre Completo"
                        value={formData.patientName}
                        onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                        className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-prevenort-primary/40 transition-all text-prevenort-text placeholder:text-prevenort-text/20"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5 text-info" /> Identificación (RUT/ID)
                    </label>
                    <input
                        type="text"
                        placeholder="Ej: 12.345.678-9"
                        value={formData.patientId}
                        onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                        className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-prevenort-primary/40 transition-all text-prevenort-text font-mono placeholder:text-prevenort-text/20"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-info" /> Institución
                    </label>
                    <div className="relative">
                        <select
                            value={formData.institution}
                            onChange={e => setFormData({ ...formData, institution: e.target.value })}
                            className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-prevenort-primary/40 transition-all text-prevenort-text appearance-none pr-10"
                        >
                            <option value="Holding Portezuelo">Holding Portezuelo</option>
                            <option value="Clínica Norte">Clínica Norte</option>
                            <option value="Hospital Regional">Hospital Regional</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-prevenort-text/20">
                            ▼
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-info" /> Tipo Solicitud
                    </label>
                    <div className="relative">
                        <select
                            value={formData.requestType}
                            onChange={e => setFormData({ ...formData, requestType: e.target.value })}
                            className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-prevenort-primary/40 transition-all text-prevenort-text appearance-none pr-10"
                        >
                            <option value="Radiología">Radiología</option>
                            <option value="Cirugía">Cirugía</option>
                            <option value="Consulta General">Consulta General</option>
                            <option value="Reclamo Administrativo">Reclamo Administrativo</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-prevenort-text/20">
                            ▼
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Motivo / Descripción del Caso</label>
                <textarea
                    placeholder="Describa el motivo detallado de la solicitud..."
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-prevenort-bg border border-prevenort-border rounded-2xl p-4 text-sm focus:outline-none focus:border-prevenort-primary/40 transition-all text-prevenort-text resize-none min-h-[120px] placeholder:text-prevenort-text/20"
                />
            </div>

            <div className="relative group">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf"
                />
                <label
                    htmlFor="file-upload"
                    className={cn(
                        "flex flex-col items-center justify-center w-full min-h-[140px] rounded-3xl border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden relative",
                        file ? "border-prevenort-primary/40 bg-prevenort-primary/5" : "border-prevenort-border bg-prevenort-bg/50 hover:bg-prevenort-surface hover:border-prevenort-primary/30"
                    )}
                >
                    {analyzing ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-info animate-spin" />
                                <div className="absolute inset-0 bg-info/20 blur-xl animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-info uppercase tracking-widest italic animate-pulse">Gemini procesando discrepancias...</p>
                                <p className="text-[10px] text-prevenort-text/20 mt-1 uppercase font-bold tracking-tight">Escanenando contenido clínico</p>
                            </div>
                        </div>
                    ) : aiResult ? (
                        <div className="flex items-center gap-6 p-6 w-full animate-in slide-in-from-bottom-2">
                            <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center border border-success/20 relative group-hover:scale-105 transition-transform">
                                <FileText className="w-8 h-8 text-success" />
                                <div className="absolute top-0 right-0 -mr-2 -mt-2">
                                    <div className="bg-success rounded-full p-1 border-2 border-prevenort-surface">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-prevenort-text italic truncate max-w-[300px]">{file?.name}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="px-2 py-0.5 bg-success/10 border border-success/20 rounded text-[9px] text-success font-black uppercase tracking-widest">
                                        Nivel Agrawall {aiResult.score}
                                    </div>
                                    <span className="text-[10px] text-prevenort-text/30 uppercase font-bold">Hallazgos: {aiResult.findings?.length || 0}</span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setFile(null);
                                    setAiResult(null);
                                }}
                                className="p-3 bg-prevenort-bg hover:bg-danger/20 rounded-xl group/btn transition-all"
                            >
                                <X className="w-5 h-5 text-prevenort-text/20 group-hover/btn:text-danger" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="p-4 bg-prevenort-bg border border-prevenort-border rounded-2xl group-hover:scale-110 group-hover:border-prevenort-primary/50 transition-all duration-500 shadow-xl">
                                <Upload className="w-7 h-7 text-prevenort-text/40 group-hover:text-prevenort-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-black text-prevenort-text/70 uppercase tracking-[0.2em] group-hover:text-prevenort-text transition-colors">Adjuntar Informe / Evidencia</p>
                                <p className="text-[10px] text-prevenort-text/20 mt-1 uppercase tracking-tighter font-bold font-mono">PDF, JPG, PNG (Escanéo IA Activo)</p>
                            </div>
                        </div>
                    )}
                </label>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-prevenort-border gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-prevenort-primary animate-pulse shadow-[0_0_8px_var(--brand-orange)]" />
                    <span className="text-[9px] text-prevenort-text/20 uppercase font-black tracking-widest">IA Engine v3.0 Ready</span>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={onClose}
                        className="text-xs font-black text-prevenort-text/30 uppercase tracking-widest hover:text-prevenort-text transition-all underline decoration-prevenort-primary/20 underline-offset-8"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateCase}
                        disabled={!formData.patientName || analyzing}
                        className="group relative px-12 py-4 bg-prevenort-primary hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-2xl shadow-prevenort-primary/30 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <div className="flex items-center gap-2 relative z-10">
                            <FileText className="w-4 h-4" />
                            Crear Caso
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
