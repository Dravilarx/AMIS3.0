import React, { useState } from 'react';
import { X, Building2, UserCircle, Tag, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useInstitutions } from '../../hooks/useInstitutions';
import type { Institution, InstitutionContact, InstitutionType, Criticality } from '../../types/institutions';

interface InstitutionModalProps {
    institution?: Institution | null;
    onClose: () => void;
    onSuccess: () => void;
}

const EMPTY_CONTACT: Partial<InstitutionContact> = {
    fullName: '',
    position: '',
    email: '',
    phone: '',
    isPrimary: false,
    hierarchyLevel: 1,
};

export const InstitutionModal: React.FC<InstitutionModalProps> = ({ institution, onClose, onSuccess }) => {
    const { addInstitution, updateInstitution } = useInstitutions();
    const isEditing = !!institution;
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'datos' | 'contactos' | 'clasificacion'>('datos');

    // ── Form State ──
    const [form, setForm] = useState({
        legalName: institution?.legalName || '',
        commercialName: institution?.commercialName || '',
        rut: institution?.rut || '',
        address: institution?.address || '',
        city: institution?.city || '',
        region: institution?.region || '',
        sector: institution?.sector || 'salud',
        institutionType: (institution?.institutionType || 'privado') as InstitutionType,
        criticality: (institution?.criticality || 'media') as Criticality,
        notes: institution?.notes || '',
    });

    const [contacts, setContacts] = useState<Partial<InstitutionContact>[]>(
        institution?.contacts?.length
            ? institution.contacts.map(c => ({ ...c }))
            : [{ ...EMPTY_CONTACT }]
    );

    const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleContactChange = (index: number, field: string, value: any) => {
        setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const addEmptyContact = () => {
        setContacts(prev => [...prev, { ...EMPTY_CONTACT }]);
    };

    const removeContactRow = (index: number) => {
        setContacts(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!form.legalName.trim()) return;
        setSaving(true);

        try {
            if (isEditing && institution) {
                await updateInstitution(institution.id, form);
            } else {
                const result = await addInstitution(form);
                // Save contacts if new institution was created successfully
                if (result.success) {
                    // We need a small delay to get the new institution ID
                    // For now, contacts will be added via the detail panel
                }
            }
            onSuccess();
        } catch (err) {
            console.error('Error saving institution:', err);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'datos' as const, label: 'Datos Legales', icon: Building2 },
        { id: 'contactos' as const, label: 'Contactos', icon: UserCircle },
        { id: 'clasificacion' as const, label: 'Clasificación', icon: Tag },
    ];

    const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all";
    const labelCls = "text-[9px] uppercase font-black text-white/20 tracking-widest mb-1.5 block";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                            {isEditing ? 'Editar' : 'Nueva'} Institución
                        </span>
                        <h3 className="text-lg font-black text-white tracking-tight">
                            {isEditing ? institution?.legalName : 'Registrar Cliente Institucional'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4 text-white/40" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 pb-2">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                                activeTab === id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-3 max-h-[60vh] overflow-y-auto space-y-0">
                    {/* Tab: Datos Legales */}
                    {activeTab === 'datos' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={labelCls}>Razón Social *</label>
                                    <input
                                        className={inputCls}
                                        value={form.legalName}
                                        onChange={(e) => setField('legalName', e.target.value)}
                                        placeholder="Nombre legal de la institución"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Nombre Comercial</label>
                                    <input
                                        className={inputCls}
                                        value={form.commercialName}
                                        onChange={(e) => setField('commercialName', e.target.value)}
                                        placeholder="Nombre de fantasía"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>RUT</label>
                                    <input
                                        className={inputCls}
                                        value={form.rut}
                                        onChange={(e) => setField('rut', e.target.value)}
                                        placeholder="76.XXX.XXX-X"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Dirección</label>
                                <input
                                    className={inputCls}
                                    value={form.address}
                                    onChange={(e) => setField('address', e.target.value)}
                                    placeholder="Calle y número"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Ciudad</label>
                                    <input
                                        className={inputCls}
                                        value={form.city}
                                        onChange={(e) => setField('city', e.target.value)}
                                        placeholder="Ciudad"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Región</label>
                                    <input
                                        className={inputCls}
                                        value={form.region}
                                        onChange={(e) => setField('region', e.target.value)}
                                        placeholder="Región"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Notas</label>
                                <textarea
                                    className={cn(inputCls, 'min-h-[80px] resize-none')}
                                    value={form.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    placeholder="Observaciones generales..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Contactos */}
                    {activeTab === 'contactos' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/30 italic">Los contactos se pueden gestionar en detalle una vez creada la institución.</p>
                            {contacts.map((contact, idx) => (
                                <div key={idx} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-3 relative group">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Contacto #{idx + 1}</span>
                                        {contacts.length > 1 && (
                                            <button onClick={() => removeContactRow(idx)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Nombre Completo</label>
                                            <input
                                                className={inputCls}
                                                value={contact.fullName || ''}
                                                onChange={(e) => handleContactChange(idx, 'fullName', e.target.value)}
                                                placeholder="Nombre y apellido"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Cargo</label>
                                            <input
                                                className={inputCls}
                                                value={contact.position || ''}
                                                onChange={(e) => handleContactChange(idx, 'position', e.target.value)}
                                                placeholder="Director, Jefe de área..."
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Email</label>
                                            <input
                                                className={inputCls}
                                                type="email"
                                                value={contact.email || ''}
                                                onChange={(e) => handleContactChange(idx, 'email', e.target.value)}
                                                placeholder="contacto@institucion.cl"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Teléfono</label>
                                            <input
                                                className={inputCls}
                                                value={contact.phone || ''}
                                                onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                                                placeholder="+56 9 XXXX XXXX"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addEmptyContact}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar contacto
                            </button>
                        </div>
                    )}

                    {/* Tab: Clasificación */}
                    {activeTab === 'clasificacion' && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Sector</label>
                                <select
                                    className={inputCls}
                                    value={form.sector}
                                    onChange={(e) => setField('sector', e.target.value)}
                                >
                                    <option value="salud" className="bg-[#0a0a0a]">Salud</option>
                                    <option value="mineria" className="bg-[#0a0a0a]">Minería</option>
                                    <option value="educacion" className="bg-[#0a0a0a]">Educación</option>
                                    <option value="gobierno" className="bg-[#0a0a0a]">Gobierno</option>
                                    <option value="industria" className="bg-[#0a0a0a]">Industria</option>
                                    <option value="otro" className="bg-[#0a0a0a]">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Tipo de Institución</label>
                                <div className="flex gap-2">
                                    {(['publico', 'privado', 'mixto'] as InstitutionType[]).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setField('institutionType', t)}
                                            className={cn(
                                                'flex-1 py-3 rounded-xl text-xs font-bold border transition-all uppercase',
                                                form.institutionType === t
                                                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                                    : 'bg-white/[0.03] text-white/30 border-white/5 hover:border-white/20'
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Nivel de Criticidad</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {([
                                        { v: 'baja' as Criticality, label: 'Baja', color: 'border-white/20 text-white/40' },
                                        { v: 'media' as Criticality, label: 'Media', color: 'border-blue-500/30 text-blue-400' },
                                        { v: 'alta' as Criticality, label: 'Alta', color: 'border-amber-500/30 text-amber-400' },
                                        { v: 'critica' as Criticality, label: 'Crítica', color: 'border-red-500/30 text-red-400' },
                                    ]).map(({ v, label, color }) => (
                                        <button
                                            key={v}
                                            onClick={() => setField('criticality', v)}
                                            className={cn(
                                                'py-3 rounded-xl text-xs font-bold border transition-all',
                                                form.criticality === v
                                                    ? cn('bg-white/[0.08]', color)
                                                    : 'bg-white/[0.02] text-white/20 border-white/5 hover:border-white/15'
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-white/40 hover:text-white/60 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.legalName.trim()}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all',
                            saving || !form.legalName.trim()
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 border border-blue-400/30'
                        )}
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isEditing ? 'Guardar Cambios' : 'Crear Institución'}
                    </button>
                </div>
            </div>
        </div>
    );
};
