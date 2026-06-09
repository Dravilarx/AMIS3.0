import React, { useState } from 'react';
import { Edit3, Save, Trash2, Plus, Loader2, X } from 'lucide-react';

interface Props {
    label:    string;
    value:    string;
    onChange: (val: string) => void;
    items:    { id: string; label: string }[];
    onAdd:    (label: string) => Promise<{ success: boolean; error?: string }>;
    onRemove: (id: string)    => Promise<{ success: boolean; error?: string }>;
    onRename: (id: string, newLabel: string) => Promise<{ success: boolean; error?: string }>;
}

export const EditableCatalogField: React.FC<Props> = ({
    label, value, onChange, items, onAdd, onRemove, onRename,
}) => {
    const [showManager, setShowManager] = useState(false);
    const [newValue,    setNewValue]    = useState('');
    const [editingId,   setEditingId]   = useState<string | null>(null);
    const [editingVal,  setEditingVal]  = useState('');
    const [busy,        setBusy]        = useState(false);

    const handleAdd = async () => {
        if (!newValue.trim()) return;
        setBusy(true);
        await onAdd(newValue.trim());
        setNewValue('');
        setBusy(false);
    };

    const handleRemove = async (id: string, itemLabel: string) => {
        if (!confirm(`¿Eliminar "${itemLabel}" del catálogo?`)) return;
        setBusy(true);
        await onRemove(id);
        if (value === itemLabel) onChange('');
        setBusy(false);
    };

    const handleRename = async (id: string) => {
        if (!editingVal.trim()) return;
        setBusy(true);
        await onRename(id, editingVal.trim());
        if (value === items.find(i => i.id === id)?.label) onChange(editingVal.trim());
        setEditingId(null);
        setEditingVal('');
        setBusy(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">{label}</label>
                <button type="button" onClick={() => setShowManager(v => !v)}
                    className="text-[9px] font-black uppercase tracking-wider text-info/60 hover:text-info transition-colors flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    {showManager ? 'Cerrar' : 'Editar opciones'}
                </button>
            </div>
            <select
                className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none appearance-none"
                value={value}
                onChange={e => onChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {items.map(i => <option key={i.id} value={i.label}>{i.label}</option>)}
            </select>
            {showManager && (
                <div className="border border-info/20 rounded-xl bg-info/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[9px] font-black uppercase tracking-widest text-info/60">Gestionar opciones</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                                {editingId === item.id ? (
                                    <>
                                        <input autoFocus
                                            className="flex-1 bg-brand-surface border border-info/30 rounded-lg px-2 py-1 text-xs text-brand-text outline-none"
                                            value={editingVal}
                                            onChange={e => setEditingVal(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleRename(item.id);
                                                if (e.key === 'Escape') { setEditingId(null); setEditingVal(''); }
                                            }} />
                                        <button type="button" onClick={() => handleRename(item.id)} disabled={busy}
                                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10">
                                            <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" onClick={() => { setEditingId(null); setEditingVal(''); }}
                                            className="p-1 rounded text-brand-text/30">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 text-xs text-brand-text/80 truncate">{item.label}</span>
                                        <button type="button" onClick={() => { setEditingId(item.id); setEditingVal(item.label); }}
                                            className="p-1 rounded text-brand-text/20 hover:text-info hover:bg-info/10">
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button type="button" onClick={() => handleRemove(item.id, item.label)} disabled={busy}
                                            className="p-1 rounded text-brand-text/20 hover:text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {items.length === 0 && <p className="text-[10px] text-brand-text/30 text-center py-2">Sin opciones.</p>}
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-info/10">
                        <input type="text" placeholder="Nueva opción..."
                            className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
                        <button type="button" onClick={handleAdd} disabled={busy || !newValue.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-[10px] font-black uppercase hover:bg-info/20 disabled:opacity-40">
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Agregar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
