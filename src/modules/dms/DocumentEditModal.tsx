import React, { useState } from 'react';
import { X, Pencil, Loader2, Trash2, Globe, Users, Lock, User, CalendarClock, FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SmartCombobox } from '../../components/ui/SmartCombobox';
import { useProfessionalsLite } from '../../hooks/useProfessionalsLite';
import type { Document } from '../../types/communication';
import type { DocumentFolder } from '../../hooks/useFolders';

interface DocumentEditModalProps {
    doc: Document;
    uploadableFolders: DocumentFolder[];
    onClose: () => void;
    onSave: (id: string, updates: {
        title?: string;
        category?: Document['category'];
        visibility?: Document['visibility'];
        expiryDate?: string | null;
        folderId?: string | null;
        notas?: string | null;
        professionalId?: string | null;
    }) => Promise<{ success: boolean; error?: string; rls?: boolean }>;
    notify: (msg: string, ok: boolean) => void;
}

const VISIBILIDAD_OPCIONES = [
    { id: 'interna',      label: 'Interna',      hint: 'Visible según carpeta', icon: Globe },
    { id: 'restringida',  label: 'Restringida',  hint: 'Solo Jefatura y Dirección', icon: Users },
    { id: 'confidencial', label: 'Confidencial', hint: 'Solo Dirección y firmantes designados', icon: Lock },
    { id: 'personal',     label: 'Personal',     hint: 'Solo yo y Dirección', icon: User },
];

const CATEGORIA_OPCIONES = [
    { id: 'General', label: 'General' },
    { id: 'Clínico / Médico', label: 'Clínico / Médico' },
    { id: 'Legal / Contrato', label: 'Legal / Contrato' },
    { id: 'Logística / Operativo', label: 'Logística / Operativo' },
    { id: 'Comercial', label: 'Comercial' },
];

// Edición consolidada de un documento ya subido: título, carpeta, categoría,
// visibilidad, vencimiento y notas — reemplaza el botón suelto "Vencimiento".
export const DocumentEditModal: React.FC<DocumentEditModalProps> = ({ doc, uploadableFolders, onClose, onSave, notify }) => {
    const [title, setTitle] = useState(doc.title);
    const [category, setCategory] = useState<Document['category']>(doc.category);
    const [visibility, setVisibility] = useState<Document['visibility']>(doc.visibility);
    const [folderId, setFolderId] = useState(doc.folderId || '');
    const [expiryDate, setExpiryDate] = useState(doc.expiryDate || '');
    const [notas, setNotas] = useState(doc.notas || '');
    const [professionalId, setProfessionalId] = useState(doc.professionalId || '');
    const [saving, setSaving] = useState(false);

    // Lista liviana de profesionales (activos e inactivos) para el vínculo a persona.
    const { profesionales } = useProfessionalsLite();

    const handleSave = async () => {
        if (!title.trim()) { notify('El título no puede quedar vacío', false); return; }
        setSaving(true);
        const res = await onSave(doc.id, {
            title: title.trim(),
            category,
            visibility,
            folderId: folderId || null,
            expiryDate: expiryDate || null,
            notas: notas.trim() || null,
            professionalId: professionalId || null,
        });
        setSaving(false);
        if (res.success) {
            notify('Documento actualizado', true);
            onClose();
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo guardar'), false);
        }
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-lg max-h-[90vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <Pencil className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Editar documento</h3>
                            <p className="text-[10px] text-brand-text/40 truncate">{doc.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1 flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> Carpeta
                            </label>
                            <select
                                value={folderId}
                                onChange={(e) => setFolderId(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40 appearance-none"
                            >
                                <option value="">Sin carpeta</option>
                                {uploadableFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Categoría</label>
                            <SmartCombobox
                                options={CATEGORIA_OPCIONES}
                                value={category}
                                onChange={(val) => setCategory(val as any)}
                                placeholder="Seleccionar o escribir nueva..."
                                storageKey="dms.recentCategories"
                                allowCustomText={true}
                                className="!py-2.5 !border !border-brand-border !rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Vínculo a persona (professionals.id) — opcional, buscable por nombre */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> Vincular a Persona
                        </label>
                        <SmartCombobox
                            options={[
                                { id: '', label: 'Sin persona' },
                                ...profesionales.map(p => ({ id: p.id, label: p.nombre, sublabel: p.activo ? undefined : 'Inactivo' })),
                            ]}
                            value={professionalId}
                            onChange={setProfessionalId}
                            placeholder="Buscar profesional por nombre..."
                            storageKey="dms.recentProfessionals"
                            className="!py-2.5 !border !border-brand-border !rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Visibilidad</label>
                        <div className="grid grid-cols-1 gap-2">
                            {VISIBILIDAD_OPCIONES.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setVisibility(opt.id as any)}
                                    className={cn(
                                        "p-3 rounded-xl border flex items-center gap-3 text-left transition-all",
                                        visibility === opt.id
                                            ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                                            : "bg-brand-bg border-brand-border text-brand-text/40 hover:bg-brand-primary/10"
                                    )}
                                >
                                    <opt.icon className="w-4 h-4 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase">{opt.label}</p>
                                        <p className="text-[9px] font-bold text-brand-text/30">{opt.hint}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" /> Fecha de vencimiento
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                        />
                        <div className="flex items-center justify-between ml-1">
                            <p className="text-[9px] text-brand-text/30 font-bold">Opcional — genera alertas 30 y 7 días antes</p>
                            {expiryDate && (
                                <button
                                    type="button"
                                    onClick={() => setExpiryDate('')}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Quitar vencimiento
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Notas</label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={4}
                            placeholder="Resumen breve del documento: de qué se trata, puntos importantes..."
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/40 resize-none"
                        />
                        <p className="text-[9px] text-brand-text/30 font-bold ml-1">Se muestra en la tarjeta del documento</p>
                    </div>
                </div>

                <div className="flex gap-3 p-6 pt-4 border-t border-brand-border shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-bg transition-all text-brand-text"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
