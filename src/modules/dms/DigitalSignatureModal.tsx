import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Check,
    Shield,
    Info,
    Type,
    PenTool,
    Smartphone,
    MousePointer2,
    Eye,
    ChevronRight,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface DigitalSignatureModalProps {
    documentTitle: string;
    documentUrl?: string;
    isPdf?: boolean;
    onClose: () => void;
    onConfirm: (name: string, styleId: string, position?: { x: number, y: number, pageIndex: number }) => Promise<void>;
}

const SIGNATURE_STYLES = [
    { id: '1', name: 'Elegante', font: "'Great Vibes', cursive" },
    { id: '2', name: 'Moderno', font: "'Dancing Script', cursive" },
    { id: '3', name: 'Orgánico', font: "'Homemade Apple', cursive" },
    { id: '4', name: 'Clásico', font: "'Alex Brush', cursive" }
];

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
    documentTitle,
    documentUrl,
    isPdf = false,
    onClose,
    onConfirm
}) => {
    const [step, setStep] = useState(1);
    const [signerName, setSignerName] = useState('Marcelo Avila');
    const [selectedStyle, setSelectedStyle] = useState('1');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isNavigating, setIsNavigating] = useState(true); // Nuevo: Modo navegación vs firma

    // Estado para posicionamiento
    const [pdfPos, setPdfPos] = useState<{ x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedFont = SIGNATURE_STYLES.find(s => s.id === selectedStyle)?.font || SIGNATURE_STYLES[0].font;

    const handleConfirm = async () => {
        if (isPdf && !pdfPos) {
            setStep(2);
            return;
        }

        setIsConfirming(true);
        try {
            if (isPdf && pdfPos) {
                await onConfirm(signerName, selectedStyle, {
                    x: pdfPos.x,
                    y: pdfPos.y,
                    pageIndex: 0
                });
            } else {
                await onConfirm(signerName, selectedStyle);
            }
            onClose();
        } catch (err) {
            console.error('Signature error:', err);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        if (!isPdf || step !== 2 || isNavigating || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;

        // Coordenadas locales al contenido scrolleado
        const x = e.clientX - rect.left;
        const y = (e.clientY - rect.top) + scrollTop;

        // Calculamos el porcentaje (0-100) respecto al contenedor total
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / containerRef.current.scrollHeight) * 100;

        setPdfPos({ x: xPercent, y: yPercent });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Homemade+Apple&display=swap');
                    .no-ptr { pointer-events: none !important; }
                `}
            </style>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                    "bg-[#0f1115] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 flex flex-col",
                    step === 1 ? "w-full max-w-lg h-auto" : "w-full max-w-5xl h-[92vh]"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <PenTool className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm leading-tight">Gestor de Firmas AMIS</h3>
                            <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Documento Activo: {documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#090a0d]">
                        {step === 1 ? (
                            <div className="space-y-6">
                                {/* Input Nombre */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Firmante Autorizado</label>
                                    <div className="relative group">
                                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400" />
                                        <input
                                            type="text"
                                            value={signerName}
                                            onChange={(e) => setSignerName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 text-white placeholder:text-white/10 focus:border-blue-500/50 transition-all text-lg font-medium"
                                            placeholder="Marcelo Avila"
                                        />
                                    </div>
                                </div>

                                {/* Selección de Estilos */}
                                <div className="grid grid-cols-2 gap-3">
                                    {SIGNATURE_STYLES.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setSelectedStyle(style.id)}
                                            className={cn(
                                                "p-4 rounded-xl border transition-all text-left relative overflow-hidden",
                                                selectedStyle === style.id ? "bg-blue-500/10 border-blue-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <span className="text-[10px] text-white/30 block mb-2">{style.name}</span>
                                            <span style={{ fontFamily: style.font }} className={cn("text-xl block truncate", selectedStyle === style.id ? "text-blue-400" : "text-white/60")}>
                                                {signerName || 'Firma'}
                                            </span>
                                            {selectedStyle === style.id && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                                        </button>
                                    ))}
                                </div>

                                {/* Preview Grande */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[160px] relative">
                                    <span style={{ fontFamily: selectedFont }} className="text-5xl text-blue-400 drop-shadow-2xl text-center">
                                        {signerName || 'Marcelo Avila'}
                                    </span>
                                    <p className="mt-4 text-[9px] text-white/20 font-mono text-center">Firma Certificada AMIS 3.0<br />Válida para documentos internos y externos</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full gap-3">
                                <div className="flex items-center justify-between bg-white/[0.03] p-2 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsNavigating(true)}
                                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm", isNavigating ? "bg-blue-600 text-white" : "text-white/40 hover:bg-white/5")}
                                        >
                                            <Eye className="w-3.5 h-3.5" /> MODO LECTURA
                                        </button>
                                        <button
                                            onClick={() => setIsNavigating(false)}
                                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm", !isNavigating ? "bg-emerald-600 text-white" : "text-white/40 hover:bg-white/5")}
                                        >
                                            <PenTool className="w-3.5 h-3.5" /> POSICIONAR MI FIRMA
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                        <Info className="w-3 h-3 text-blue-400" />
                                        {isNavigating ? "Desliza para buscar el lugar de firma" : "Toca el documento exactamente donde deseas firmar"}
                                    </div>
                                </div>

                                {/* Visor con Scroll Real */}
                                <div
                                    ref={containerRef}
                                    onClick={handleContainerClick}
                                    className={cn(
                                        "flex-1 bg-[#1a1c21] border border-white/10 rounded-xl relative overflow-y-auto custom-scrollbar group/doc select-none",
                                        !isNavigating ? "cursor-crosshair ring-2 ring-emerald-500/20" : "cursor-default"
                                    )}
                                >
                                    {documentUrl ? (
                                        <div className="relative min-h-full w-full bg-white/5 p-4 flex flex-col items-center">
                                            {/* Contenedor del PDF que determina el tamaño real */}
                                            <div className="relative w-full max-w-4xl bg-white shadow-2xl min-h-[1200px]">
                                                <iframe
                                                    src={`${documentUrl}#toolbar=0&navpanes=0`}
                                                    className={cn(
                                                        "absolute inset-0 w-full h-full border-none transition-all duration-300",
                                                        !isNavigating ? "pointer-events-none opacity-40 grayscale" : "pointer-events-auto opacity-100"
                                                    )}
                                                />

                                                {/* Overlay de captura solo en modo posicionar */}
                                                {!isNavigating && (
                                                    <div className="absolute inset-0 z-10" />
                                                )}

                                                {/* Sello de Firma basado en PORCENTAJES */}
                                                <AnimatePresence>
                                                    {pdfPos && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            style={{
                                                                left: `${pdfPos.x}%`,
                                                                top: `${pdfPos.y}%`
                                                            }}
                                                            className="absolute z-20 -translate-x-1/2 -translate-y-full pointer-events-none"
                                                        >
                                                            <div className="bg-blue-600/90 backdrop-blur-md border-2 border-white shadow-[0_0_20px_rgba(37,99,235,0.4)] px-6 py-2 rounded-lg flex flex-col items-center">
                                                                <span style={{ fontFamily: selectedFont }} className="text-2xl text-white block whitespace-nowrap leading-none mb-1">
                                                                    {signerName}
                                                                </span>
                                                                <div className="text-[7px] text-white/70 font-bold uppercase tracking-widest border-t border-white/20 pt-1 w-full text-center">Firma Digital AMIS</div>
                                                            </div>
                                                            {/* Indicador de Punto de Anclaje */}
                                                            <div className="w-3 h-3 bg-white rounded-full border-2 border-blue-600 absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 shadow-md" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-white/20 text-sm">Cargando visor...</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer con Acciones Claras */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-bold text-white/40 uppercase">Encriptación SSL Activada</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {step === 2 && (
                                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-white/40 hover:text-white text-xs font-bold">Atrás</button>
                            )}

                            <button
                                onClick={handleConfirm}
                                disabled={isConfirming || !signerName || (step === 2 && !pdfPos)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                    step === 1 ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                            >
                                {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                {step === 1 ? "Continuar al Posicionamiento" : "Confirmar Firma en Documento"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
