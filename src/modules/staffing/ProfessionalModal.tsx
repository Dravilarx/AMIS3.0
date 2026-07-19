import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Layers, Loader2, FolderSearch, Archive, UploadCloud, NotebookPen } from 'lucide-react';
import { useBatteries } from '../dms/useBatteries';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentUploadModal } from '../dms/DocumentUploadModal';
import { useHRManagers } from '../../hooks/useHRManagers';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Professional } from '../../types/core';
import type { Document } from '../../types/communication';

// ─── Tabs extraídos ───────────────────────────────────────────────────────────
import { TabPersonal }    from './tabs/TabPersonal';
import { TabAcademico }   from './tabs/TabAcademico';
import { TabContratos }   from './tabs/TabContratos';
import { TabInduccion }   from './tabs/TabInduccion';
import { TabExpediente }  from './tabs/TabExpediente';
import { HojaVidaPanel }  from '../rrhh-hoja-vida/HojaVidaPanel';
import type { TabId }     from './tabs/types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProfessionalModalProps {
    isOpen:                boolean;
    onClose:               () => void;
    onSave:                (professional: Omit<Professional, 'id'>) => Promise<{ success: boolean; error?: string }>;
    onDelete?:             (id: string) => Promise<{ success: boolean; error?: string }>;
    initialData?:          Professional | null;
    existingProfessionals?: Professional[];
}

// ─── Estado inicial ───────────────────────────────────────────────────────────
const emptyForm = (): Omit<Professional, 'id'> => ({
    name: '', lastName: '', email: '', nationalId: '',
    nationality: 'Chilena', birthDate: '', joiningDate: '',
    phone: '', role: 'Médico', status: 'active', isActive: true,
    residence: { city: '', region: '', country: 'Chile' },
    university: '', registrationNumber: '', specialty: '', subSpecialty: '',
    team: '', username: '', signatureType: undefined, associatedWith: '',
    competencies: [], contracts: [], photoUrl: '',
    infoStatus: 'incomplete', isVerified: false,
    induction: { enabled: false, hasReadAndAccepted: false, status: 'pending' },
});

// ─── Componente principal ─────────────────────────────────────────────────────
export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({
    isOpen, onClose, onSave, onDelete, initialData, existingProfessionals,
}) => {
    const { canPerform } = useAuth();
    // Hoja de Vida (RRHH): solo con permiso rrhh_hoja_vida.read (SUPER_ADMIN lo cubre
    // canPerform) y solo para profesionales ya existentes (persona_id = professionals.id).
    const puedeVerHojaVida = canPerform('rrhh_hoja_vida' as any, 'read');

    const [formData, setFormData]               = useState<Omit<Professional, 'id'>>(emptyForm());
    const [activeTab, setActiveTab]             = useState<TabId>('info');
    const [isSubmitting, setIsSubmitting]       = useState(false);
    const [submitError, setSubmitError]         = useState<string | null>(null);
    const [rutError, setRutError]               = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting]           = useState(false);

    // Expediente
    const [selectedBatteryId, setSelectedBatteryId] = useState('');
    const [uploadingReq, setUploadingReq]           = useState<any | null>(null);

    const { managers }                          = useHRManagers();
    const { batteries }                         = useBatteries();
    const { documents: allDocuments, uploadDocument, deleteDocument } = useDocuments();

    // Precargar datos
    useEffect(() => {
        if (initialData) {
            setFormData({
                name:               initialData.name,
                lastName:           initialData.lastName           || '',
                email:              initialData.email,
                nationalId:         initialData.nationalId,
                nationality:        initialData.nationality        || 'Chilena',
                birthDate:          initialData.birthDate          || '',
                joiningDate:        initialData.joiningDate        || '',
                phone:              initialData.phone              || '',
                role:               initialData.role,
                status:             initialData.status,
                isActive:           initialData.isActive           ?? true,
                residence:          initialData.residence,
                university:         initialData.university         || '',
                registrationNumber: initialData.registrationNumber || '',
                specialty:          initialData.specialty          || '',
                subSpecialty:       initialData.subSpecialty       || '',
                team:               initialData.team               || '',
                username:           initialData.username           || '',
                signatureType:      initialData.signatureType      || undefined,
                associatedWith:     initialData.associatedWith     || '',
                competencies:       initialData.competencies,
                contracts:          initialData.contracts,
                photoUrl:           initialData.photoUrl           || '',
                infoStatus:         initialData.infoStatus         || 'incomplete',
                isVerified:         initialData.isVerified         || false,
                induction:          initialData.induction || { enabled: false, hasReadAndAccepted: false, status: 'pending' },
            });
        } else {
            setFormData(emptyForm());
        }
        setActiveTab('info');
        setRutError(null);
        setSubmitError(null);
        setShowDeleteConfirm(false);
    }, [initialData, isOpen]);

    // ── Foto ──────────────────────────────────────────────────────────────────
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const ext      = file.name.split('.').pop();
            const filePath = `photos/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
            setFormData(p => ({ ...p, photoUrl: publicUrl }));
        } catch (err: any) {
            console.error('Error subiendo foto:', err.message);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rutError) { setSubmitError('Corrige el RUT antes de guardar.'); return; }
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const result = await onSave(formData);
            if (result.success) {
                onClose();
            } else {
                setSubmitError(result.error || 'Error al guardar.');
            }
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Expediente ────────────────────────────────────────────────────────────
    // Vínculo persona por la columna limpia professional_id (FK a professionals),
    // no por el genérico target_id. El matching por requirement_id y el % de
    // cumplimiento quedan idénticos.
    const selectedBattery    = batteries.find(b => b.id === selectedBatteryId);
    const professionalDocs   = allDocuments.filter(d => d.professionalId === initialData?.id);
    const batteryProgress    = selectedBattery
        ? Math.round(
            (selectedBattery.requirements.filter(r => professionalDocs.find(d => d.requirementId === r.id)).length
            / selectedBattery.requirements.length) * 100
          )
        : 0;

    const handleRequirementUpload = (req: any) => setUploadingReq(req);

    // Borra la fila de documents de un requerimiento (Expediente). Respeta isLocked
    // y RLS (si el borrado falla, se loguea sin romper la UI).
    const handleRequirementDelete = async (doc: Document) => {
        if (doc.isLocked) return;
        const res = await deleteDocument(doc.id, doc.url);
        if (!res.success) console.error('No se pudo eliminar el documento del expediente:', res.error);
    };

    // ── Tabs config ───────────────────────────────────────────────────────────
    const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'info',       label: 'Personal',   icon: <span className="text-xs">👤</span> },
        { id: 'academic',   label: 'Académico',  icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { id: 'contracts',  label: 'Contratos',  icon: <Layers className="w-3.5 h-3.5" /> },
        { id: 'induction',  label: 'Inducción',  icon: <span className="text-xs">🛡️</span> },
        { id: 'expediente', label: 'Expediente', icon: <FolderSearch className="w-3.5 h-3.5" /> },
        // Solo para profesionales existentes y con permiso: la hoja de vida es
        // sobre alguien ya creado (necesita professionals.id).
        ...(initialData?.id && puedeVerHojaVida
            ? [{ id: 'hoja_vida' as TabId, label: 'Hoja de Vida', icon: <NotebookPen className="w-3.5 h-3.5" /> }]
            : []),
    ];

    if (!isOpen) return null;

    const isEditing = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-brand-text">
                            {isEditing ? `${initialData?.name} ${initialData?.lastName || ''}` : 'Nuevo Profesional'}
                        </h2>
                        <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold mt-0.5">
                            Matriz Única del Holding Portezuelo
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface transition-colors text-brand-text/40 hover:text-brand-text">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-brand-border flex-shrink-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button key={tab.id} type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'bg-brand-surface border-brand-primary text-brand-text'
                                    : 'border-transparent text-brand-text/40 hover:text-brand-text/70 hover:bg-brand-surface/50'
                            )}>
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5">

                        {activeTab === 'info' && (
                            <TabPersonal
                                formData={formData} setFormData={setFormData}
                                initialData={initialData} isEditing={isEditing}
                                existingProfessionals={existingProfessionals}
                                rutError={rutError} setRutError={setRutError}
                                onPhotoUpload={handlePhotoUpload}
                            />
                        )}

                        {activeTab === 'academic' && (
                            <TabAcademico
                                formData={formData} setFormData={setFormData}
                                initialData={initialData} isEditing={isEditing}
                            />
                        )}

                        {activeTab === 'contracts' && (
                            <TabContratos
                                formData={formData} setFormData={setFormData}
                                initialData={initialData} isEditing={isEditing}
                            />
                        )}

                        {activeTab === 'induction' && (
                            <TabInduccion
                                formData={formData} setFormData={setFormData}
                                initialData={initialData} isEditing={isEditing}
                                managers={managers}
                            />
                        )}

                        {activeTab === 'expediente' && (
                            <TabExpediente
                                formData={formData} setFormData={setFormData}
                                initialData={initialData} isEditing={isEditing}
                                batteries={batteries}
                                selectedBatteryId={selectedBatteryId}
                                setSelectedBatteryId={setSelectedBatteryId}
                                professionalDocuments={professionalDocs}
                                batteryProgress={batteryProgress}
                                onRequirementUpload={handleRequirementUpload}
                                onRequirementDelete={handleRequirementDelete}
                            />
                        )}

                        {activeTab === 'hoja_vida' && initialData?.id && puedeVerHojaVida && (
                            <HojaVidaPanel personaId={initialData.id} />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-brand-border space-y-3 flex-shrink-0">

                        {/* Confirmación de archivado (reversible, no borra nada) */}
                        {showDeleteConfirm && (
                            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <Archive className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <p className="text-xs text-amber-200 flex-1">
                                    ¿Archivar a <strong>{initialData?.name} {initialData?.lastName}</strong>? Dejará de aparecer en la lista activa, pero podrás restaurarlo después.
                                </p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 text-xs font-bold border border-brand-border rounded-lg hover:bg-brand-surface transition-all text-brand-text">
                                        Cancelar
                                    </button>
                                    <button type="button" disabled={isDeleting}
                                        onClick={async () => {
                                            if (!onDelete || !initialData) return;
                                            setIsDeleting(true);
                                            const result = await onDelete(initialData.id);
                                            setIsDeleting(false);
                                            if (result.success) { setShowDeleteConfirm(false); onClose(); }
                                            else alert('Error al archivar: ' + result.error);
                                        }}
                                        className="px-3 py-1.5 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5">
                                        {isDeleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Archivando...</> : <><Archive className="w-3 h-3" /> Sí, archivar</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {submitError && (
                            <p className="text-xs text-red-400 text-center">{submitError}</p>
                        )}

                        <div className="flex items-center justify-between gap-3">
                            {isEditing && onDelete ? (
                                <button type="button" onClick={() => setShowDeleteConfirm(true)}
                                    title="Archivar (reversible): deja de aparecer en la lista activa"
                                    className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-brand-text/40 hover:text-amber-400 transition-colors">
                                    <Archive className="w-3.5 h-3.5" /> Archivar profesional
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-3">
                                <button type="button" onClick={onClose}
                                    className="px-4 py-2.5 border border-brand-border rounded-xl text-sm font-bold text-brand-text hover:bg-brand-surface transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting || !!rutError}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-sm rounded-xl shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                        : <><UploadCloud className="w-4 h-4" /> Guardar Cambios</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Modal de upload de requerimiento */}
            {uploadingReq && initialData && (
                <DocumentUploadModal
                    onClose={() => setUploadingReq(null)}
                    prefill={{
                        targetId: initialData.id,
                        professionalId: initialData.id,
                        folderId: 'd64a61bb-0e8a-4370-bfe5-97aac2b45220', // carpeta RRHH
                        requirementId: uploadingReq.id,
                        category: uploadingReq.category,
                        title: uploadingReq.label
                    }}
                    onUpload={uploadDocument}
                />
            )}
        </div>
    );
};
