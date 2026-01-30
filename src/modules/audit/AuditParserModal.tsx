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
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white/90 uppercase tracking-tighter">Auditoría Agrawall AI</h2>
                            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Análisis de Informe Clínico</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
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
                                        className="flex flex-col items-center justify-center w-full h-40 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/10 hover:border-emerald-500/50 transition-all group"
                                    >
                                        {pdfFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <FileText className="w-12 h-12 text-emerald-400" />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-white/90">{pdfFile.name}</p>
                                                    <p className="text-xs text-white/40 mt-1">Click para cambiar archivo</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-white/20 group-hover:text-emerald-400 transition-colors" />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-white/70">Subir Informe PDF</p>
                                                    <p className="text-xs text-white/40 mt-1">Click o arrastra un archivo PDF</p>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-white/10"></div>
                                    <span className="text-xs text-white/30 uppercase tracking-widest font-bold">O</span>
                                    <div className="flex-1 h-px bg-white/10"></div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Pegar Texto del Informe</label>
                                    <textarea
                                        value={reportText}
                                        onChange={(e) => {
                                            setReportText(e.target.value);
                                            if (e.target.value) setPdfFile(null); // Clear PDF if text is entered
                                        }}
                                        placeholder="Pegue aquí el contenido del informe clínico..."
                                        disabled={!!pdfFile}
                                        className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={(!reportText && !pdfFile) || analyzing}
                                className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
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
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Análisis Completado</p>
                                </div>
                                <div className="px-3 py-1 bg-emerald-500/20 rounded-lg text-emerald-400 font-black text-sm">
                                    Nivel {result.score}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase font-mono mb-2 tracking-widest">Razonamiento IA</p>
                                    <p className="text-sm font-bold text-white/90 leading-relaxed">{result.reasoning}</p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase font-mono mb-2 tracking-widest">Hallazgos Clave</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.findings.map((f: string, i: number) => (
                                            <span key={i} className="text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400/80">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Optional fields before saving */}
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase font-mono mb-3 tracking-widest">Información Adicional (Opcional)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Paciente</label>
                                            <input
                                                type="text"
                                                value={patientName}
                                                onChange={(e) => setPatientName(e.target.value)}
                                                placeholder="Nombre del paciente..."
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Proyecto</label>
                                            <select
                                                value={selectedProjectId}
                                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
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
                                    className="flex-1 py-3 bg-white/5 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/10"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all border border-emerald-400/30"
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
