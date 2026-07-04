import React, { useState } from 'react';
import { X, CalendarClock, Loader2, Trash2 } from 'lucide-react';
import type { Document } from '../../types/communication';

interface ExpiryDateModalProps {
    doc: Document;
    onClose: () => void;
    onSave: (id: string, expiryDate: string | null) => Promise<{ success: boolean; error?: string; rls?: boolean }>;
    notify: (msg: string, ok: boolean) => void;
}

export const ExpiryDateModal: React.FC<ExpiryDateModalProps> = ({ doc, onClose, onSave, notify }) => {
    const [date, setDate] = useState(doc.expiryDate || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async (value: string | null) => {
        setSaving(true);
        const res = await onSave(doc.id, value);
        setSaving(false);
        if (res.success) {
            notify(value ? 'Fecha de vencimiento actualizada' : 'Vencimiento quitado', true);
            onClose();
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo guardar'), false);
        }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-sm bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <CalendarClock className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Vencimiento</h3>
                            <p className="text-[10px] text-brand-text/40 truncate">{doc.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Fecha de vencimiento</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                        />
                        <p className="text-[9px] text-brand-text/30 font-bold ml-1">Genera alertas 30 y 7 días antes</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {doc.expiryDate && (
                            <button
                                type="button"
                                onClick={() => handleSave(null)}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-danger/30 text-danger rounded-xl text-xs font-black uppercase tracking-widest hover:bg-danger/10 transition-all disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Quitar vencimiento
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleSave(date || null)}
                            disabled={saving || !date}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
