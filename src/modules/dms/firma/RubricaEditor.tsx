import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { RubricaPad } from './RubricaPad';
import { RubricaUpload } from './RubricaUpload';

interface RubricaEditorProps {
    onGuardar: (blob: Blob) => Promise<{ success: boolean; error?: string }>;
    onGuardado?: () => void;
}

// Selector "Subir imagen" (principal) / "Dibujar" (alternativa), reutilizado
// tanto en el modal standalone de rúbrica como embebido en los flujos de firma.
export const RubricaEditor: React.FC<RubricaEditorProps> = ({ onGuardar, onGuardado }) => {
    const [tab, setTab] = useState<'subir' | 'dibujar'>('subir');

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTab('subir')}
                    className={cn('px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all', tab === 'subir' ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text/40')}
                >
                    Subir imagen
                </button>
                <button
                    onClick={() => setTab('dibujar')}
                    className={cn('px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all', tab === 'dibujar' ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text/40')}
                >
                    Dibujar
                </button>
            </div>

            {tab === 'subir'
                ? <RubricaUpload onGuardar={onGuardar} onGuardado={onGuardado} />
                : <RubricaPad onGuardar={onGuardar} onGuardado={onGuardado} />}
        </div>
    );
};
