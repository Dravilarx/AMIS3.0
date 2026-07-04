import React, { useState } from 'react';
import { X, PenTool, RefreshCw } from 'lucide-react';
import { useRubrica } from '../../../hooks/useRubrica';
import { RubricaEditor } from './RubricaEditor';

interface RubricaModalProps {
    onClose: () => void;
    onGuardado?: () => void;
    subtitulo?: string;
}

// Modal standalone para gestionar la rúbrica desde el perfil, y también se
// reutiliza embebido (sin cerrar) dentro del flujo de firma cuando el usuario
// no tiene rúbrica registrada aún. "Subir imagen" es la vía principal (foto
// real de la firma); "Dibujar" queda como alternativa con mouse/touch.
export const RubricaModal: React.FC<RubricaModalProps> = ({ onClose, onGuardado, subtitulo }) => {
    const { guardarRubrica, signedUrl, loading, tieneRubrica } = useRubrica();
    const [reemplazando, setReemplazando] = useState(false);

    const mostrarEditor = reemplazando || (!loading && !tieneRubrica);
    const handleGuardado = () => { onGuardado?.(); onClose(); };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-3xl max-h-[90vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <PenTool className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Mi rúbrica</h3>
                            <p className="text-[10px] text-brand-text/40">{subtitulo || 'Se usará para estampar tus firmas digitales'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {!mostrarEditor && !loading && signedUrl && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Rúbrica actual</p>
                            <div className="bg-white border border-brand-border rounded-xl p-6 flex items-center justify-center">
                                <img src={signedUrl} alt="Rúbrica actual" className="max-h-28 object-contain" />
                            </div>
                            <button onClick={() => setReemplazando(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 border border-brand-border rounded-xl text-[11px] font-black uppercase tracking-widest text-brand-text/50 hover:bg-brand-bg transition-all">
                                <RefreshCw className="w-4 h-4" /> Reemplazar
                            </button>
                        </div>
                    )}

                    {mostrarEditor && <RubricaEditor onGuardar={guardarRubrica} onGuardado={handleGuardado} />}
                </div>
            </div>
        </div>
    );
};
