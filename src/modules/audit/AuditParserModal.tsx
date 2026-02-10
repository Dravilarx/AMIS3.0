import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, Upload, FileText } from 'lucide-react';
import { analyzeClinicalReport, analyzeClinicalReportFromPDF } from './agrawallAI';
import { useAudit } from '../../hooks/useAudit';
import { useProjects } from '../../hooks/useProjects';

interface AuditParserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuditParserModal: React.FC<AuditParserModalProps> = ({ isOpen, onClose }) => {
    const [reportText, setReportText] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [patientName, setPatientName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { addAudit } = useAudit();
    const { projects } = useProjects();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setReportText(''); // Clear text if PDF is selected
        } else {
            alert('Por favor selecciona un archivo PDF válido');
        }
    };

    const handleAnalyze = async () => {
        if (!reportText && !pdfFile) return;
        setAnalyzing(true);
        try {
            let data;
            if (pdfFile) {
                data = await analyzeClinicalReportFromPDF(pdfFile);
            } else {
                data = await analyzeClinicalReport(reportText);
            }
            setResult(data);
        } catch (error) {
            console.error('Error analyzing report:', error);
            alert('Error al analizar con IA. Inténtalo de nuevo.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;

        const auditData = {
            patient_name: patientName || 'Paciente Anónimo',
            project_id: selectedProjectId || null,
            score: result.score,
            reportContent: pdfFile ? `[PDF] ${pdfFile.name}` : reportText,
            anomalies: result.findings,
            compliance_details: {
                aiClassificationReason: result.reasoning
            },
            status: 'completed',
            created_at: new Date().toISOString()
        };

        const { success } = await addAudit(auditData);
        if (success) {
            onClose();
            setResult(null);
            setReportText('');
            setPdfFile(null);
            setPatientName('');
            setSelectedProjectId('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-prevenort-surface border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-prevenort-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                            <Sparkles className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">Auditoría Agrawall AI</h2>
                            <p className="text-[10px] text-prevenort-text/40 font-mono uppercase tracking-widest">Análisis de Informe Clínico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-prevenort-bg rounded-full transition-colors">
                        <X className="w-5 h-5 text-prevenort-text/40" />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            {/* Upload PDF or Paste Text */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="pdf-upload"
                                    />
                                    <label
                                        htmlFor="pdf-upload"
                                        className="flex flex-col items-center justify-center w-full h-40 bg-prevenort-bg border-2 border-dashed border-prevenort-border rounded-xl cursor-pointer hover:bg-prevenort-surface hover:border-success/50 transition-all group"
                                    >
                                        {pdfFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <FileText className="w-12 h-12 text-success" />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-prevenort-text">{pdfFile.name}</p>
                                                    <p className="text-xs text-prevenort-text/40 mt-1">Click para cambiar archivo</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-prevenort-text/20 group-hover:text-success transition-colors" />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-prevenort-text/70">Subir Informe PDF</p>
                                                    <p className="text-xs text-prevenort-text/40 mt-1">Click o arrastra un archivo PDF</p>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-prevenort-border"></div>
                                    <span className="text-xs text-prevenort-text/30 uppercase tracking-widest font-bold">O</span>
                                    <div className="flex-1 h-px bg-prevenort-border"></div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Pegar Texto del Informe</label>
                                    <textarea
                                        value={reportText}
                                        onChange={(e) => {
                                            setReportText(e.target.value);
                                            if (e.target.value) setPdfFile(null); // Clear PDF if text is entered
                                        }}
                                        placeholder="Pegue aquí el contenido del informe clínico..."
                                        disabled={!!pdfFile}
                                        className="w-full h-32 bg-prevenort-bg border border-prevenort-border rounded-xl p-4 text-sm focus:outline-none focus:border-success/50 transition-all resize-none font-mono text-prevenort-text placeholder:text-prevenort-text/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={(!reportText && !pdfFile) || analyzing}
                                className="w-full py-4 bg-prevenort-primary text-white rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl shadow-prevenort-primary/20"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>IA Analizando Agrawall...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Ejecutar Auditoría Agrawall</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                    <p className="text-xs font-bold text-success uppercase tracking-widest">Análisis Completado</p>
                                </div>
                                <div className="px-3 py-1 bg-success/20 rounded-lg text-success font-black text-sm">
                                    Nivel {result.score}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-2 tracking-widest">Razonamiento IA</p>
                                    <p className="text-sm font-bold text-prevenort-text leading-relaxed">{result.reasoning}</p>
                                </div>

                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-2 tracking-widest">Hallazgos Clave</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.findings.map((f: string, i: number) => (
                                            <span key={i} className="text-[10px] px-2 py-1 bg-success/10 border border-success/20 rounded text-success/80">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Optional fields before saving */}
                                <div className="pt-4 border-t border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-3 tracking-widest">Información Adicional (Opcional)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Paciente</label>
                                            <input
                                                type="text"
                                                value={patientName}
                                                onChange={(e) => setPatientName(e.target.value)}
                                                placeholder="Nombre del paciente..."
                                                className="w-full bg-prevenort-bg border border-prevenort-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-success/50 transition-all text-prevenort-text placeholder:text-prevenort-text/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Proyecto</label>
                                            <select
                                                value={selectedProjectId}
                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                className="w-full bg-prevenort-bg border border-prevenort-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-success/50 transition-all text-prevenort-text"
                                            >
                                                <option value="">Sin proyecto</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setResult(null)}
                                    className="flex-1 py-3 bg-prevenort-bg text-prevenort-text/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-prevenort-surface transition-all border border-prevenort-border"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-3 bg-success text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 shadow-xl shadow-success/20 transition-all border border-success/30"
                                >
                                    Guardar Auditoría
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
