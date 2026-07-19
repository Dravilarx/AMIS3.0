import React from 'react';
import { GraduationCap, BookOpen, ShieldCheck, AlertOctagon, AlertCircle, CheckCircle2, UploadCloud, Loader2, Trash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { getSignedDocumentUrl } from '../../../lib/storageUrls';
import type { TabProps } from './types';

// Abre un documento del bucket privado firmando la ruta (o URL heredada).
const abrirDocumentoFirmado = async (input: string) => {
    const signed = await getSignedDocumentUrl(input);
    if (signed) window.open(signed, '_blank');
};

// Carpeta "RRHH" del Archivo Digital (document_folders). Los documentos
// académicos del profesional se guardan aquí, pegados a la persona por
// professional_id. Reemplaza la tabla aparte professional_academic_docs.
const RRHH_FOLDER_ID = 'd64a61bb-0e8a-4370-bfe5-97aac2b45220';

// ─── AcademicDocRow (movido aquí desde ProfessionalModal) ─────────────────────
interface AcademicDocRowProps {
    docType:        string;
    label:          string;
    hint:           string;
    required:       boolean;
    professionalId: string | undefined;
}

const AcademicDocRow: React.FC<AcademicDocRowProps> = ({ docType, label, hint, required, professionalId }) => {
    const [uploading,   setUploading]   = useState(false);
    const [docId,       setDocId]       = useState<string | null>(null);
    const [docUrl,      setDocUrl]      = useState<string | null>(null);
    const [fileName,    setFileName]    = useState<string | null>(null);
    const [docLocked,   setDocLocked]   = useState(false);
    const [loadingDoc,  setLoadingDoc]  = useState(false);

    // El documento vive en documents (Archivo Digital), filtrado por la persona
    // y el tipo (category = clave del catálogo). Si no hay fila → pendiente.
    useEffect(() => {
        if (!professionalId) return;
        const fetchDoc = async () => {
            setLoadingDoc(true);
            try {
                const { data } = await supabase
                    .from('documents')
                    .select('id, url, title, is_locked')
                    .eq('professional_id', professionalId)
                    .eq('category', docType)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (data) {
                    setDocId(data.id);
                    setDocUrl(data.url || null);
                    setFileName(data.title || null);
                    setDocLocked(!!data.is_locked);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDoc(false);
            }
        };
        fetchDoc();
    }, [professionalId, docType]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !professionalId) return;
        setUploading(true);
        try {
            const ext      = file.name.split('.').pop();
            const filePath = `academic/${professionalId}/${docType}-${Date.now()}.${ext}`;
            const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
            if (storageError) throw storageError;

            // Bucket privado: se guarda la RUTA; la URL firmada se resuelve al abrir.
            const { data: { user } } = await supabase.auth.getUser();
            const tipoArchivo = file.type.includes('image') ? 'image' : file.type.includes('video') ? 'video' : 'pdf';

            if (docId) {
                // Reemplazo: se actualiza la fila existente (una por tipo/persona).
                const { error } = await supabase.from('documents')
                    .update({ url: filePath, title: file.name, type: tipoArchivo })
                    .eq('id', docId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('documents').insert({
                    title: file.name,
                    type: tipoArchivo,
                    category: docType,               // clave del catálogo: titulo, especialidad, sis, ...
                    url: filePath,                   // RUTA en el bucket documents
                    folder_id: RRHH_FOLDER_ID,       // carpeta RRHH
                    professional_id: professionalId, // pegado a la persona
                    visibility: 'interna',
                    signed: false,
                    created_by: user?.id,
                    status: 'draft',
                }).select('id').single();
                if (error) throw error;
                setDocId(data.id);
            }
            setDocUrl(filePath); setFileName(file.name);
        } catch (err: any) {
            console.error(`Error subiendo ${docType}:`, err.message);
        } finally {
            setUploading(false);
        }
    };

    // Quita el documento (la fila vuelve a pendiente/ámbar). No hay "marcar
    // pendiente" a mano: pendiente = simplemente no tener documento. Respeta
    // isLocked (documentos bloqueados por Auditoría no se borran) y pide
    // confirmación, como en Expediente.
    const handleRemove = async () => {
        if (!docId || docLocked) return;
        if (!window.confirm(`¿Eliminar el documento de "${label}"? Esta acción no se puede deshacer.`)) return;
        const { error } = await supabase.from('documents').delete().eq('id', docId);
        if (error) { console.error(`Error eliminando ${docType}:`, error.message); return; }
        setDocId(null); setDocUrl(null); setFileName(null); setDocLocked(false);
    };

    return (
        <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl border transition-all',
            docUrl ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
        )}>
            <div className="flex-shrink-0">
                {loadingDoc ? <Loader2 className="w-5 h-5 text-brand-text/20 animate-spin" />
                    : docUrl ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    : <AlertCircle className="w-5 h-5 text-amber-400" />
                }
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-text/90 truncate">{label}</p>
                    {required && <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Obligatorio</span>}
                    {!docUrl && !loadingDoc && <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Pendiente</span>}
                </div>
                <p className="text-[10px] text-brand-text/30 truncate">{fileName || hint}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {docUrl && (
                    <button type="button" onClick={() => abrirDocumentoFirmado(docUrl)}
                        className="px-2.5 py-1 bg-brand-surface border border-brand-border rounded-lg text-[10px] font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all">
                        Ver
                    </button>
                )}
                {docUrl && (
                    <button type="button" onClick={handleRemove} disabled={docLocked}
                        title={docLocked ? 'Bloqueado por Auditoría' : 'Eliminar'}
                        className={cn('p-1.5 rounded-lg transition-all',
                            docLocked ? 'text-brand-text/10 cursor-not-allowed' : 'text-brand-text/20 hover:bg-red-500/10 hover:text-red-400')}>
                        <Trash className="w-3.5 h-3.5" />
                    </button>
                )}
                <label className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all',
                    uploading ? 'bg-brand-surface text-brand-text/30 cursor-not-allowed'
                        : 'bg-info/10 border border-info/20 text-info hover:bg-info/20'
                )}>
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                    {docUrl ? 'Reemplazar' : 'Subir'}
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                        disabled={uploading || !professionalId} onChange={handleUpload} />
                </label>
            </div>
        </div>
    );
};

// ─── Tab principal ────────────────────────────────────────────────────────────
export const TabAcademico: React.FC<TabProps> = ({ formData, setFormData, initialData }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Documentos Obligatorios */}
        <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Documentos Obligatorios</h3>
                <span className="ml-auto text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Todos requeridos</span>
            </div>
            {[
                { key: 'titulo',       label: 'Certificado de Título',       hint: 'PDF emitido por la universidad' },
                { key: 'especialidad', label: 'Certificado de Especialidad', hint: 'Acreditado por la institución formadora' },
                { key: 'sis',          label: 'Registro SIS / Colegio',      hint: 'Número de registro vigente' },
            ].map(doc => (
                <AcademicDocRow key={doc.key} docType={doc.key} label={doc.label} hint={doc.hint} required professionalId={initialData?.id} />
            ))}
        </div>

        {/* Documentos Opcionales */}
        <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Documentos Opcionales</h3>
            </div>
            {[
                { key: 'subespecialidad', label: 'Certificado Sub-especialidad / Fellow', hint: 'Si aplica' },
                { key: 'cv',              label: 'Currículum Vitae',                      hint: 'PDF o Word' },
            ].map(doc => (
                <AcademicDocRow key={doc.key} docType={doc.key} label={doc.label} hint={doc.hint} required={false} professionalId={initialData?.id} />
            ))}
        </div>

        {/* Otros Documentos */}
        <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Otros Documentos</h3>
            </div>
            {[
                { key: 'seguro_civil', label: 'Seguro de Responsabilidad Civil', hint: 'Vigente' },
                { key: 'cedula',       label: 'Cédula de Identidad',              hint: 'Ambos lados en un PDF' },
            ].map(doc => (
                <AcademicDocRow key={doc.key} docType={doc.key} label={doc.label} hint={doc.hint} required={false} professionalId={initialData?.id} />
            ))}
        </div>

        {/* Datos de Referencia */}
        <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="w-4 h-4 text-brand-text/30" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/40">Datos de Referencia</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { label: 'Universidad',      key: 'university',          list: 'universities-list' },
                    { label: 'N° Registro SIS',  key: 'registrationNumber',  list: undefined },
                    { label: 'Especialidad',     key: 'specialty',           list: 'specialties-list' },
                    { label: 'Sub-especialidad', key: 'subSpecialty',        list: 'subspecialties-list' },
                ].map(f => (
                    <div key={f.key} className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">{f.label}</label>
                        <input list={f.list}
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={(formData as any)[f.key] || ''}
                            onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);
