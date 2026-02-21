import React, { useState } from 'react';
import { X, Building2, UserCircle, Tag, Plus, Trash2, Save, Loader2, Hash } from 'lucide-react';
import { cn, formatRUT, formatPhone } from '../../lib/utils';
import { useInstitutions } from '../../hooks/useInstitutions';
import type { Institution, InstitutionContact, InstitutionType, InstitutionCategory, Criticality } from '../../types/institutions';
import { INSTITUTION_CATEGORIES } from '../../types/institutions';

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
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
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
        institutionCategory: (institution?.institutionCategory || 'otro') as InstitutionCategory,
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
        if (!form.legalName.trim()) {
            alert('Debes ingresar la Razón Social');
            return;
        }
        setSaving(true);

        try {
            if (isEditing && institution) {
                const result = await updateInstitution(institution.id, form);
                if (!result.success) {
                    alert('Error al guardar: ' + (result.error?.message || 'Error desconocido'));
                    return;
                }
            } else {
                const result = await addInstitution(form);
                if (!result.success) {
                    alert('Error al crear: ' + (result.error?.message || 'Error desconocido'));
                    return;
                }
                if (result.data) {
                    setGeneratedCode(result.data.institutionCode || null);
                }
            }
            if (!generatedCode) {
                onSuccess();
            }
        } catch (err: any) {
            console.error('Error saving institution:', err);
            alert('Error inesperado: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Obtener info de la categoría seleccionada
    const selectedCategory = INSTITUTION_CATEGORIES.find(c => c.value === form.institutionCategory);

    const tabs = [
        { id: 'datos' as const, label: 'Datos Legales', icon: Building2 },
        { id: 'contactos' as const, label: 'Contactos', icon: UserCircle },
        { id: 'clasificacion' as const, label: 'Clasificación', icon: Tag },
    ];

    const inputCls = "w-full bg-prevenort-surface border border-prevenort-border rounded-xl px-3 py-2.5 text-sm text-prevenort-text/80 placeholder-prevenort-text/20 focus:outline-none focus:border-info/50 focus:bg-prevenort-surface/80 transition-all";
    const labelCls = "text-[9px] uppercase font-black text-prevenort-text/20 tracking-widest mb-1.5 block";

    // ── Vista de éxito con código generado ──
    if (generatedCode) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative w-full max-w-md bg-prevenort-bg border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 p-8 text-center">
                    {/* Código generado grande */}
                    <div className="mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Hash className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Institución Registrada</p>
                        <h3 className="text-lg font-black text-prevenort-text mb-4">{form.legalName}</h3>
                    </div>

                    {/* Código grande con efecto */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 rounded-2xl blur-xl" />
                        <div className="relative bg-prevenort-surface border border-prevenort-border rounded-2xl p-6">
                            <p className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest mb-2">Código Institucional</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-[0.15em]">
                                    {generatedCode}
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <span className="text-lg">{selectedCategory?.icon}</span>
                                <span className="text-xs font-bold text-prevenort-text/40">{selectedCategory?.label}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onSuccess}
                        className="px-6 py-3 bg-prevenort-primary hover:bg-prevenort-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-prevenort-primary/20"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-prevenort-bg border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-prevenort-border">
                    <div className="flex items-center gap-3">
                        <div>
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                                {isEditing ? 'Editar' : 'Nueva'} Institución
                            </span>
                            <h3 className="text-lg font-black text-prevenort-text tracking-tight">
                                {isEditing ? institution?.legalName : 'Registrar Cliente Institucional'}
                            </h3>
                        </div>
                        {/* Mostrar código existente si está editando */}
                        {isEditing && institution?.institutionCode && (
                            <div className="ml-3 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <span className="text-xs font-black text-blue-400 tracking-widest">{institution.institutionCode}</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-prevenort-surface hover:bg-prevenort-surface/80 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4 text-prevenort-text/40" />
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
                                    : 'text-prevenort-text/30 hover:text-prevenort-text/50 hover:bg-prevenort-surface'
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
                            {/* Categoría Institucional - NUEVA */}
                            <div>
                                <label className={labelCls}>Categoría Institucional *</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {INSTITUTION_CATEGORIES.map(({ value, label, prefix, icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setField('institutionCategory', value)}
                                            className={cn(
                                                'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold border transition-all',
                                                form.institutionCategory === value
                                                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/30 shadow-lg shadow-blue-500/5'
                                                    : 'bg-prevenort-surface/30 text-prevenort-text/25 border-prevenort-border hover:border-prevenort-text/15 hover:text-prevenort-text/40'
                                            )}
                                        >
                                            <span className="text-base">{icon}</span>
                                            <span className="truncate w-full text-center leading-tight">{label}</span>
                                            <span className={cn(
                                                'text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded',
                                                form.institutionCategory === value ? 'bg-blue-500/20 text-blue-300' : 'text-prevenort-text/15'
                                            )}>{prefix}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                        onBlur={(e) => setField('rut', formatRUT(e.target.value))}
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
                            <p className="text-[10px] text-prevenort-text/30 italic">Los contactos se pueden gestionar en detalle una vez creada la institución.</p>
                            {contacts.map((contact, idx) => (
                                <div key={idx} className="p-3 bg-prevenort-surface/50 border border-prevenort-border rounded-xl space-y-3 relative group">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest">Contacto #{idx + 1}</span>
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
                                                onBlur={(e) => handleContactChange(idx, 'phone', formatPhone(e.target.value))}
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
                                    <option value="salud" className="bg-prevenort-bg">Salud</option>
                                    <option value="mineria" className="bg-prevenort-bg">Minería</option>
                                    <option value="educacion" className="bg-prevenort-bg">Educación</option>
                                    <option value="gobierno" className="bg-prevenort-bg">Gobierno</option>
                                    <option value="industria" className="bg-prevenort-bg">Industria</option>
                                    <option value="otro" className="bg-prevenort-bg">Otro</option>
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
                                                    : 'bg-prevenort-surface/50 text-prevenort-text/30 border-prevenort-border hover:border-prevenort-text/20'
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
                                        { v: 'baja' as Criticality, label: 'Baja', color: 'border-prevenort-border text-prevenort-text/40' },
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
                                                    ? cn('bg-prevenort-surface', color)
                                                    : 'bg-prevenort-surface/30 text-prevenort-text/20 border-prevenort-border hover:border-prevenort-text/15'
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-prevenort-border">
                    {/* Preview del código que se generará */}
                    <div className="flex items-center gap-2">
                        {!isEditing && selectedCategory && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-prevenort-surface/50 border border-prevenort-border rounded-xl">
                                <Hash className="w-3 h-3 text-prevenort-text/20" />
                                <span className="text-[10px] font-black text-prevenort-text/30 tracking-widest">
                                    {selectedCategory.prefix}-XXXX
                                </span>
                                <span className="text-[9px] text-prevenort-text/15">se generará automáticamente</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-prevenort-text/40 hover:text-prevenort-text/60 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !form.legalName.trim()}
                            className={cn(
                                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all',
                                saving || !form.legalName.trim()
                                    ? 'bg-prevenort-surface text-prevenort-text/20 cursor-not-allowed'
                                    : 'bg-prevenort-primary hover:bg-prevenort-primary/90 text-white shadow-xl shadow-prevenort-primary/20 border border-prevenort-primary/30'
                            )}
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {isEditing ? 'Guardar Cambios' : 'Crear Institución'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
