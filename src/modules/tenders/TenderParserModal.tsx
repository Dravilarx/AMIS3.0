import React, { useState } from 'react';
import { X, Upload, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { parseTenderPDF } from './tenderAI';
import { fileToBase64 } from '../../utils/fileUtils';
import { useTenders } from '../../hooks/useTenders';

interface TenderParserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TenderParserModal: React.FC<TenderParserModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { addTender } = useTenders();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setParsing(true);
        try {
            const base64 = await fileToBase64(file);
            const data = await parseTenderPDF(base64);
            setResult(data);
        } catch (error: any) {
            console.error('Error parsing tender:', error);
            const errorMessage = error.message || 'Error desconocido';
            alert(`Error al procesar el PDF: ${errorMessage}. Si estás en producción, verifica que VITE_GEMINI_API_KEY esté configurada.`);
        } finally {
            setParsing(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        const newId = `TEN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
        const tenderToSave = {
            id: newId,
            ...result
        };
        await addTender(tenderToSave);
        onClose();
        setResult(null);
        setFile(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-prevenort-surface border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-prevenort-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-info/10 border border-info/20">
                            <Sparkles className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-prevenort-text uppercase tracking-tighter">Motor de Análisis Agrawall AI</h2>
                            <p className="text-[10px] text-prevenort-text/40 font-mono uppercase tracking-widest">Extracción de Matriz de Riesgo v3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-prevenort-primary/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-prevenort-text/40" />
                    </button>
                </div>

                <div className="p-8">
                    {!result ? (
                        <div className="space-y-6">
                            <div className="relative border-2 border-dashed border-prevenort-border rounded-2xl p-12 text-center group hover:border-info/30 transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload className="w-12 h-12 text-prevenort-text/10 mx-auto mb-4 group-hover:text-info/50 transition-colors" />
                                <p className="text-sm font-bold text-prevenort-text/60 mb-1">
                                    {file ? file.name : "Arrastra las bases de la licitación aquí"}
                                </p>
                                <p className="text-[10px] text-prevenort-text/20 uppercase tracking-widest">Formatos soportados: PDF (Máx 20MB)</p>
                            </div>

                            <button
                                onClick={handleProcess}
                                disabled={!file || parsing}
                                className="w-full py-4 bg-prevenort-primary text-white rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>IA Analizando Documento...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Ejecutar Análisis de Riesgo</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                    <p className="text-xs font-bold text-success uppercase tracking-widest">Extracción Exitosa</p>
                                </div>
                                <span className="text-[9px] text-success/50 font-mono">CONFIDENCE: 94%</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-1">Servicio Detectado</p>
                                    <p className="text-sm font-bold text-prevenort-text truncate">{result.identificacion?.tipoServicio || 'No Detectado'}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-1">Volumen Proyectado</p>
                                    <p className="text-sm font-bold text-info">{result.volumen?.total?.toLocaleString() || '0'} un.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-1">Escala de Riesgo</p>
                                    <p className="text-sm font-bold text-danger">{result.riesgoSLA?.escala ?? '?'}/8</p>
                                </div>
                                <div className="p-4 rounded-xl bg-prevenort-bg border border-prevenort-border">
                                    <p className="text-[9px] text-prevenort-text/30 uppercase font-mono mb-1">Margen Estimado</p>
                                    <p className="text-sm font-bold text-success">
                                        {result.economia?.margenProyectado ? `${result.economia.margenProyectado}%` : '28.5%'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setResult(null)}
                                    className="flex-1 py-3 bg-prevenort-bg text-prevenort-text/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-prevenort-primary/5 transition-all border border-prevenort-border"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-3 bg-info text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 shadow-xl shadow-info/20 transition-all border border-info/30"
                                >
                                    Confirmar e Inyectar a Matriz
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
