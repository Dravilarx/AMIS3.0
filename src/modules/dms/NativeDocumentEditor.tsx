import React, { useState, useRef } from 'react';
import {
    X,
    Save,
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Undo,
    Redo,
    Type,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NativeDocumentEditorProps {
    onClose: () => void;
    onSave: (title: string, content: string) => Promise<{ success: boolean; error?: string }>;
}

export const NativeDocumentEditor: React.FC<NativeDocumentEditorProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setError('El título es obligatorio');
            return;
        }
        if (!editorRef.current?.innerHTML.trim()) {
            setError('El contenido del documento no puede estar vacío');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const result = await onSave(title, editorRef.current.innerHTML);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Error al guardar el documento');
            }
        } catch (err) {
            setError('Error inesperado al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const ToolbarButton = ({
        icon: Icon,
        onClick,
        title,
        active = false
    }: {
        icon: any,
        onClick: () => void,
        title: string,
        active?: boolean
    }) => (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className={cn(
                "p-2 rounded-lg transition-all hover:bg-prevenort-surface",
                active ? "bg-info/20 text-info" : "text-prevenort-text/40 hover:text-prevenort-text"
            )}
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-prevenort-bg border border-prevenort-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-prevenort-border flex items-center justify-between bg-prevenort-surface/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center border border-info/20">
                            <Type className="w-4 h-4 text-info" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-prevenort-text/90 uppercase tracking-widest">Editor de Documento Nativo</h3>
                            <p className="text-[10px] text-prevenort-text/40 font-mono tracking-tighter">Crea activos digitales con formato enriquecido</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-prevenort-surface rounded-full text-prevenort-text/20 hover:text-prevenort-text transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-2 border-b border-prevenort-border bg-prevenort-surface/30 flex items-center gap-1 flex-wrap">
                    <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Negrita (Ctrl+B)" />
                    <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Cursiva (Ctrl+I)" />
                    <div className="w-px h-4 bg-prevenort-border mx-1" />
                    <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'h1')} title="Título 1" />
                    <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'h2')} title="Título 2" />
                    <div className="w-px h-4 bg-prevenort-border mx-1" />
                    <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Lista" />
                    <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="Lista Enumerada" />
                    <div className="w-px h-4 bg-prevenort-border mx-1" />
                    <ToolbarButton icon={Undo} onClick={() => execCommand('undo')} title="Deshacer" />
                    <ToolbarButton icon={Redo} onClick={() => execCommand('redo')} title="Rehacer" />
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-prevenort-bg">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Título del documento..."
                        className="w-full bg-transparent border-none text-2xl font-black text-prevenort-text/90 placeholder:text-prevenort-text/10 focus:outline-none mb-6"
                    />
                    <div
                        ref={editorRef}
                        contentEditable
                        className="prose prose-invert max-w-none focus:outline-none min-h-[400px] text-prevenort-text/80"
                        data-placeholder="Comienza a escribir aquí..." // Custom attribute instead/
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-prevenort-border flex items-center justify-between bg-prevenort-surface/50">
                    <div className="flex items-center gap-2">
                        {error && (
                            <div className="flex items-center gap-2 text-danger text-[10px] font-bold uppercase animate-in slide-in-from-left-2">
                                <AlertCircle className="w-3 h-3" />
                                {error}
                            </div>
                        )}
                        {!error && !isSaving && (
                            <div className="text-[10px] text-prevenort-text/20 font-black uppercase tracking-[0.2em]">Listo para persistir</div>
                        )}
                        {isSaving && (
                            <div className="flex items-center gap-2 text-info text-[10px] font-bold uppercase">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Guardando en nube...
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-prevenort-text/40 hover:text-prevenort-text hover:bg-prevenort-surface transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-2 bg-prevenort-primary hover:bg-prevenort-primary/90 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 text-xs font-bold uppercase tracking-widest shadow-xl shadow-prevenort-primary/20"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'Guardando...' : 'Guardar Activo'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
