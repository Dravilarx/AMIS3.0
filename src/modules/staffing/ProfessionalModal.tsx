import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, GraduationCap, Plus, Trash2, Loader2, Layers, FolderSearch, AlertCircle, CheckCircle2, UploadCloud, ShieldCheck, BookOpen, BellRing, UserCheck, Sparkles, Trash, Save, AlertOctagon, Edit3, Link as LinkIcon } from 'lucide-react';
import { validateRUT } from '../../hooks/useProfessionals';
import { useBatteries } from '../dms/useBatteries';
import { supabase } from '../../lib/supabase';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentUploadModal } from '../dms/DocumentUploadModal';
import { useHRManagers } from '../../hooks/useHRManagers';
import { useRoles, useTeams } from '../../hooks/useCatalogs';
import { useAuth } from '../../hooks/useAuth';
import { cn, formatRUT, formatPhone } from '../../lib/utils';

import type { Professional, HoldingCompany } from '../../types/core';

interface ProfessionalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (professional: Omit<Professional, 'id'>) => Promise<{ success: boolean; error?: string }>;
    onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
    initialData?: Professional | null;
    existingProfessionals?: Professional[];
}

const COMPANIES: HoldingCompany[] = ['Portezuelo', 'Boreal', 'Amis', 'Soran', 'Vitalmédica', 'Resomag', 'Ceimavan', 'Irad'];
const EMPLOYMENT_RELATIONSHIPS = [
    'Contrato indefinido',
    'Contrato a plazo',
    'Boleta honorarios personales',
    'Boleta honorarios empresa'
];

// ─── Componente de campo de catálogo editable ─────────────────────────────────
interface EditableCatalogFieldProps {
    label:     string;
    value:     string;
    onChange:  (val: string) => void;
    items:     { id: string; label: string }[];
    onAdd:     (label: string) => Promise<{ success: boolean; error?: string }>;
    onRemove:  (id: string)    => Promise<{ success: boolean; error?: string }>;
    onRename:  (id: string, newLabel: string) => Promise<{ success: boolean; error?: string }>;
}

const EditableCatalogField: React.FC<EditableCatalogFieldProps> = ({
    label, value, onChange, items, onAdd, onRemove, onRename,
}) => {
    const [showManager, setShowManager] = useState(false);
    const [newValue, setNewValue]       = useState('');
    const [editingId, setEditingId]     = useState<string | null>(null);
    const [editingVal, setEditingVal]   = useState('');
    const [busy, setBusy]               = useState(false);

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
                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setShowManager(v => !v)}
                    className="text-[9px] font-black uppercase tracking-wider text-info/60 hover:text-info transition-colors flex items-center gap-1"
                >
                    <Edit3 className="w-3 h-3" />
                    {showManager ? 'Cerrar' : 'Editar opciones'}
                </button>
            </div>

            {/* Selector principal */}
            <select
                className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none appearance-none"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                <option value="">Seleccionar...</option>
                {items.map(i => (
                    <option key={i.id} value={i.label}>{i.label}</option>
                ))}
            </select>

            {/* Panel de gestión */}
            {showManager && (
                <div className="border border-info/20 rounded-xl bg-info/5 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[9px] font-black uppercase tracking-widest text-info/60">
                        Gestionar opciones del catálogo
                    </p>

                    {/* Lista de items existentes */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                                {editingId === item.id ? (
                                    <>
                                        <input
                                            autoFocus
                                            className="flex-1 bg-brand-surface border border-info/30 rounded-lg px-2 py-1 text-xs text-brand-text outline-none focus:border-info/60"
                                            value={editingVal}
                                            onChange={e => setEditingVal(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleRename(item.id);
                                                if (e.key === 'Escape') { setEditingId(null); setEditingVal(''); }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRename(item.id)}
                                            disabled={busy}
                                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(null); setEditingVal(''); }}
                                            className="p-1 rounded text-brand-text/30 hover:text-brand-text transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 text-xs text-brand-text/80 truncate">{item.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(item.id); setEditingVal(item.label); }}
                                            className="p-1 rounded text-brand-text/20 hover:text-info hover:bg-info/10 transition-colors"
                                            title="Renombrar"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(item.id, item.label)}
                                            disabled={busy}
                                            className="p-1 rounded text-brand-text/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {items.length === 0 && (
                            <p className="text-[10px] text-brand-text/30 text-center py-2">Sin opciones. Agrega una abajo.</p>
                        )}
                    </div>

                    {/* Agregar nuevo */}
                    <div className="flex items-center gap-2 pt-1 border-t border-info/10">
                        <input
                            type="text"
                            placeholder="Nueva opción..."
                            className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={busy || !newValue.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-[10px] font-black uppercase hover:bg-info/20 transition-all disabled:opacity-40"
                        >
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Agregar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Generador de documento de inducción firmado ──────────────────────────────
interface InductionPDFGeneratorProps {
    professionalId:   string;
    professionalName: string;
    acceptedAt:       string;
}

const InductionPDFGenerator: React.FC<InductionPDFGeneratorProps> = ({
    professionalId, professionalName, acceptedAt,
}) => {
    const [generating, setGenerating] = useState(false);
    const [done, setDone]             = useState(false);
    const [docUrl, setDocUrl]         = useState<string | null>(null);

    // Verificar si ya existe el documento
    useEffect(() => {
        supabase
            .from('documents')
            .select('id, url')
            .eq('target_id', professionalId)
            .eq('category', 'induction')
            .maybeSingle()
            .then(({ data }) => {
                if (data) { setDocUrl(data.url); setDone(true); }
            });
    }, [professionalId]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const fecha = new Date(acceptedAt).toLocaleString('es-CL', {
                dateStyle: 'full', timeStyle: 'short'
            });
            const fingerprint = Array.from(
                crypto.getRandomValues(new Uint8Array(16))
            ).map(b => b.toString(16).padStart(2, '0')).join('');

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 20px; border-bottom: 2px solid #f97316; padding-bottom: 8px; color: #f97316; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-top: 28px; }
  p  { font-size: 13px; color: #333; }
  .declaracion { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0; }
  .firma { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
  .firma-nombre { font-family: 'Dancing Script', cursive; font-size: 32px; color: #3b82f6; }
  .audit { font-size: 9px; color: #aaa; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 6px 8px; border: 1px solid #eee; }
  td:first-child { font-weight: bold; background: #f9f9f9; width: 35%; }
</style>
</head>
<body>
<h1>Certificado de Inducción — AMIS 3.0</h1>
<p>El presente documento certifica que el profesional indicado ha leído y aceptado el material de bienvenida de <strong>SOCIEDAD DE RADIÓLOGOS DEL NORTE SpA</strong>.</p>

<h2>Datos del Profesional</h2>
<table>
  <tr><td>Nombre</td><td>${professionalName}</td></tr>
  <tr><td>Fecha y hora de aceptación</td><td>${fecha}</td></tr>
  <tr><td>Audit ID</td><td style="font-family:monospace">${fingerprint}</td></tr>
</table>

<h2>Material revisado</h2>
<table>
  <tr><td>Administración</td><td>✓ Leído y aceptado</td></tr>
  <tr><td>Operatividad</td><td>✓ Leído y aceptado</td></tr>
  <tr><td>Calidad</td><td>✓ Leído y aceptado</td></tr>
  <tr><td>Pacto de Integridad (Ley 19.886)</td><td>✓ Leído y aceptado</td></tr>
</table>

<div class="declaracion">
  <strong>Declaración:</strong> Declaro haber leído la información entregada por AMIS correspondiente a Administración, Operatividad, Calidad y el Pacto de Integridad. Entiendo y acepto los compromisos que esto implica.
</div>

<div class="firma">
  <div class="firma-nombre">${professionalName}</div>
  <div style="height:1px;width:220px;background:#eee;margin:10px 0;"></div>
  <p style="font-size:13px;font-weight:bold;margin:0">${professionalName}</p>
  <p style="font-size:11px;color:#888;margin:2px 0">Firmado electrónicamente vía AMIS 3.0</p>
  <div class="audit">Audit ID: ${fingerprint} | ${fecha} | AMIS Care — Holding Portezuelo</div>
</div>
</body>
</html>`;

            const { data: insertData, error } = await supabase
                .from('documents')
                .insert([{
                    title:           `Inducción — ${professionalName}`,
                    type:            'pdf',
                    category:        'induction',
                    content_summary: `Certificado de inducción firmado digitalmente. Audit ID: ${fingerprint}`,
                    url:             '',
                    signed:          true,
                    signer_name:     professionalName,
                    signature_fingerprint: fingerprint,
                    signed_at:       acceptedAt,
                    visibility:      'community',
                    target_id:       professionalId,
                    is_locked:       true,
                    is_validated:    true,
                }])
                .select('id')
                .single();

            if (error) throw error;

            // Subir HTML al storage
            const fileName = `induction-${professionalId}-${Date.now()}.html`;
            const filePath = `expedientes/${fileName}`;
            const blob = new Blob([html], { type: 'text/html' });

            const { error: storageError } = await supabase.storage
                .from('documents')
                .upload(filePath, blob, { contentType: 'text/html', upsert: true });

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // Actualizar URL en el registro
            await supabase
                .from('documents')
                .update({ url: publicUrl })
                .eq('id', insertData.id);

            setDocUrl(publicUrl);
            setDone(true);
        } catch (err: any) {
            console.error('Error generando certificado:', err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={cn(
            'flex items-center justify-between p-4 rounded-xl border transition-all',
            done
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-violet-500/5 border-violet-500/20'
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    done ? 'bg-emerald-500/10' : 'bg-violet-500/10'
                )}>
                    {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <Sparkles className="w-5 h-5 text-violet-400" />
                    }
                </div>
                <div>
                    <p className={cn('text-sm font-bold', done ? 'text-emerald-400' : 'text-violet-400')}>
                        {done ? 'Certificado de Inducción generado' : 'Generar Certificado de Inducción'}
                    </p>
                    <p className="text-[10px] text-brand-text/30">
                        {done
                            ? 'Guardado en el Expediente con firma digital y Audit ID'
                            : 'Documento firmado digitalmente con timestamp y Audit ID para acreditación'
                        }
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {docUrl && (
                    <button
                        type="button"
                        onClick={() => window.open(docUrl, '_blank')}
                        className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-[10px] font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all"
                    >
                        Ver
                    </button>
                )}
                {!done && (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-[10px] font-black uppercase hover:bg-violet-500/20 transition-all disabled:opacity-50"
                    >
                        {generating
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Save className="w-3.5 h-3.5" />
                        }
                        {generating ? 'Generando...' : 'Generar'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Componente de fila de documento académico ────────────────────────────────
interface AcademicDocRowProps {
    docType:        string;
    label:          string;
    hint:           string;
    required:       boolean;
    professionalId: string | undefined;
}

const AcademicDocRow: React.FC<AcademicDocRowProps> = ({
    docType, label, hint, required, professionalId,
}) => {
    const [uploading, setUploading]   = useState(false);
    const [docUrl, setDocUrl]         = useState<string | null>(null);
    const [fileName, setFileName]     = useState<string | null>(null);
    const [isPending, setIsPending]   = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);

    // Cargar doc existente al montar
    useEffect(() => {
        if (!professionalId) return;
        const fetchDoc = async () => {
            setLoadingDoc(true);
            try {
                const { data } = await supabase
                    .from('professional_academic_docs')
                    .select('file_url, file_name, is_pending')
                    .eq('professional_id', professionalId)
                    .eq('doc_type', docType)
                    .maybeSingle();
                if (data) {
                    setDocUrl(data.file_url);
                    setFileName(data.file_name);
                    setIsPending(data.is_pending);
                }
            } catch (err) {
                console.error('Error fetching academic doc:', err);
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

            const { error: storageError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, { upsert: true });

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            await supabase
                .from('professional_academic_docs')
                .upsert({
                    professional_id: professionalId,
                    doc_type:        docType,
                    file_name:       file.name,
                    file_url:        publicUrl,
                    is_pending:      false,
                    uploaded_at:     new Date().toISOString(),
                }, { onConflict: 'professional_id,doc_type' });

            setDocUrl(publicUrl);
            setFileName(file.name);
            setIsPending(false);
        } catch (err: any) {
            console.error(`Error subiendo ${docType}:`, err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleMarkPending = async () => {
        if (!professionalId) return;
        await supabase
            .from('professional_academic_docs')
            .upsert({
                professional_id: professionalId,
                doc_type:        docType,
                file_name:       'pendiente',
                file_url:        '',
                is_pending:      true,
                uploaded_at:     new Date().toISOString(),
            }, { onConflict: 'professional_id,doc_type' });
        setIsPending(true);
        setDocUrl(null);
        setFileName(null);
    };

    const handleRemove = async () => {
        if (!professionalId) return;
        await supabase
            .from('professional_academic_docs')
            .delete()
            .eq('professional_id', professionalId)
            .eq('doc_type', docType);
        setDocUrl(null);
        setFileName(null);
        setIsPending(false);
    };

    return (
        <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl border transition-all',
            docUrl && !isPending
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : isPending
                ? 'bg-amber-500/5 border-amber-500/20'
                : required
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-brand-bg border-brand-border'
        )}>
            {/* Ícono de estado */}
            <div className="flex-shrink-0">
                {loadingDoc ? (
                    <Loader2 className="w-5 h-5 text-brand-text/20 animate-spin" />
                ) : docUrl && !isPending ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isPending ? (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                ) : (
                    <AlertCircle className={cn('w-5 h-5', required ? 'text-red-400' : 'text-brand-text/20')} />
                )}
            </div>

            {/* Label e info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-text/90 truncate">{label}</p>
                    {required && (
                        <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                            Obligatorio
                        </span>
                    )}
                    {isPending && (
                        <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                            Pendiente
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-brand-text/30 truncate">
                    {fileName && !isPending ? fileName : hint}
                </p>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {docUrl && !isPending && (
                    <button
                        type="button"
                        onClick={() => window.open(docUrl, '_blank')}
                        className="px-2.5 py-1 bg-brand-surface border border-brand-border rounded-lg text-[10px] font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all"
                    >
                        Ver
                    </button>
                )}
                {(docUrl || isPending) && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="p-1.5 rounded-lg text-brand-text/20 hover:bg-red-500/10 hover:text-red-400 transition-all"
                        title="Eliminar"
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </button>
                )}
                {!isPending && (
                    <label className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all',
                        uploading
                            ? 'bg-brand-surface text-brand-text/30 cursor-not-allowed'
                            : 'bg-info/10 border border-info/20 text-info hover:bg-info/20'
                    )}>
                        {uploading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <UploadCloud className="w-3 h-3" />
                        }
                        {docUrl ? 'Reemplazar' : 'Subir'}
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="hidden"
                            disabled={uploading || !professionalId}
                            onChange={handleUpload}
                        />
                    </label>
                )}
                {!docUrl && !isPending && professionalId && (
                    <button
                        type="button"
                        onClick={handleMarkPending}
                        className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold uppercase hover:bg-amber-500/20 transition-all"
                        title="Marcar como pendiente"
                    >
                        Pendiente
                    </button>
                )}
            </div>
        </div>
    );
};

export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, existingProfessionals }) => {
    const [formData, setFormData] = useState<Omit<Professional, 'id'>>({
        name: '',
        lastName: '',
        email: '',
        nationalId: '',
        nationality: 'Chilena',
        birthDate: '',
        joiningDate: '',
        phone: '',
        role: 'Médico',
        status: 'active',
        isActive: true,
        residence: { city: '', region: '', country: 'Chile' },
        university: '',
        registrationNumber: '',
        specialty: '',
        subSpecialty: '',
        team: '',
        username: '',
        signatureType: undefined,
        associatedWith: '',
        competencies: [],
        contracts: [],
        photoUrl: '',
        infoStatus: 'incomplete',
        isVerified: false,
        induction: {
            enabled: false,
            hasReadAndAccepted: false,
            status: 'pending'
        }
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                lastName: initialData.lastName || '',
                email: initialData.email,
                nationalId: initialData.nationalId,
                nationality: initialData.nationality || 'Chilena',
                birthDate: initialData.birthDate || '',
                joiningDate: initialData.joiningDate || '',
                phone: initialData.phone || '',
                role: initialData.role,
                status: initialData.status,
                isActive: initialData.isActive ?? true,
                residence: initialData.residence,
                registrationNumber: initialData.registrationNumber || '',
                specialty: initialData.specialty || '',
                subSpecialty: initialData.subSpecialty || '',
                team: initialData.team || '',
                username: initialData.username || '',
                signatureType: initialData.signatureType || undefined,
                associatedWith: initialData.associatedWith || '',
                competencies: initialData.competencies,
                contracts: initialData.contracts,
                photoUrl: initialData.photoUrl || '',
                infoStatus: initialData.infoStatus || 'incomplete',
                isVerified: initialData.isVerified || false,
                induction: initialData.induction || {
                    enabled: false,
                    hasReadAndAccepted: false,
                    status: 'pending'
                }
            });
        } else {
            setFormData({
                name: '',
                lastName: '',
                email: '',
                nationalId: '',
                nationality: 'Chilena',
                birthDate: '',
                joiningDate: '',
                phone: '',
                role: 'Médico',
                status: 'active',
                isActive: true,
                residence: { city: '', region: '', country: 'Chile' },
                university: '',
                registrationNumber: '',
                specialty: '',
                subSpecialty: '',
                team: '',
                username: '',
                signatureType: undefined,
                competencies: [],
                contracts: [],
                photoUrl: '',
                infoStatus: 'incomplete',
                isVerified: false,
                induction: {
                    enabled: false,
                    hasReadAndAccepted: false,
                    status: 'pending'
                }
            });
        }
    }, [initialData, isOpen]);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rutError, setRutError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'contracts' | 'expediente' | 'induction'>('info');

    const isEditing = !!initialData;

    // Integración de Baterías
    const { batteries } = useBatteries();
    const { documents, uploadDocument } = useDocuments({ limit: 100 });
    const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadPrefill, setUploadPrefill] = useState<any>(null);
    const { managers } = useHRManagers();
    const { items: roleItems, add: addRole, remove: removeRole, rename: renameRole } = useRoles();
    const { items: teamItems, add: addTeam, remove: removeTeam, rename: renameTeam } = useTeams();
    const { user } = useAuth();

    const [generatingLink, setGeneratingLink] = useState(false);
    const [portalLink, setPortalLink]         = useState<string | null>(null);

    const handleGeneratePortalLink = async () => {
        if (!initialData?.id) return;
        setGeneratingLink(true);
        try {
            // Invalidar tokens anteriores del mismo profesional
            await supabase
                .from('portal_tokens')
                .delete()
                .eq('professional_id', initialData.id);

            // Crear token nuevo con 7 días de vigencia
            const { data, error } = await supabase
                .from('portal_tokens')
                .insert({ professional_id: initialData.id })
                .select('token')
                .single();

            if (error) throw error;

            const url = `${window.location.origin}/portal-medico?token=${data.token}`;
            setPortalLink(url);
            await navigator.clipboard.writeText(url);
        } catch (err: any) {
            console.error('Error generando link:', err.message);
        } finally {
            setGeneratingLink(false);
        }
    };

    const isAlejandra = user?.email === 'alejandra.versalovic@amis.global';

    // Filtrar documentos del profesional actual
    const professionalDocuments = (documents || []).filter(d => d.targetId === initialData?.id);
    const selectedBattery = batteries.find(b => b.id === selectedBatteryId);

    // Calcular progreso de batería
    const batteryProgress = selectedBattery ? Math.round(
        (selectedBattery.requirements.filter(req =>
            professionalDocuments.some(d => d.requirementId === req.id)
        ).length / selectedBattery.requirements.length) * 100
    ) : 0;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await onSave(formData);
        setIsSubmitting(false);
        if (result.success) {
            onClose();
        } else {
            alert('Error: ' + result.error);
        }
    };

    const handleRequirementUpload = (req: any) => {
        setUploadPrefill({
            targetId: initialData?.id,
            visibility: 'user',
            category: req.category,
            requirementId: req.id,
            title: `${req.label} - ${initialData?.name} ${initialData?.lastName}`
        });
        setShowUploadModal(true);
    };



    const addContract = () => {
        setFormData({
            ...formData,
            contracts: [...formData.contracts, { company: 'Boreal', amount: 0, type: 'Planta' }]
        });
    };

    const removeContract = (index: number) => {
        setFormData({
            ...formData,
            contracts: formData.contracts.filter((_, i) => i !== index)
        });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-brand-surface rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-brand-text/40" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-text">{initialData ? `${initialData.name} ${initialData.lastName}` : 'Nuevo Profesional'}</h2>
                    <p className="text-brand-text/40 text-sm">Matriz Única del Holding Portezuelo</p>
                </div>

                {/* Tabs de Navegación del Modal */}
                <div className="flex items-center gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl mb-8">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'info' ? "bg-brand-text text-brand-bg shadow-lg" : "text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface"
                        )}
                    >
                        <User className="w-3.5 h-3.5" />
                        Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('academic')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'academic' ? "bg-brand-text text-brand-bg shadow-lg" : "text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface"
                        )}
                    >
                        <GraduationCap className="w-3.5 h-3.5" />
                        Académico
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'contracts' ? "bg-brand-text text-brand-bg shadow-lg" : "text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Contratos
                    </button>
                    <button
                        onClick={() => setActiveTab('induction')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'induction' ? "bg-brand-text text-brand-bg shadow-lg" : "text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface"
                        )}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Inducción
                    </button>
                    <button
                        onClick={() => setActiveTab('expediente')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === 'expediente' ? "bg-brand-text text-brand-bg shadow-lg" : "text-brand-text/40 hover:text-brand-text/60 hover:bg-brand-surface"
                        )}
                    >
                        <FolderSearch className="w-3.5 h-3.5" />
                        Expediente
                    </button>
                </div>

                {/* DataLists para Autocompletado Inteligente */}
                <datalist id="nationalities-list">
                    {Array.from(new Set(['Chilena', 'Argentina', 'Colombiana', 'Venezolana', 'Española', 'Peruana', ...(existingProfessionals?.map(p => p.nationality).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="countries-list">
                    {Array.from(new Set(['Chile', 'Argentina', 'Colombia', 'Venezuela', 'España', ...(existingProfessionals?.map(p => p.residence.country).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="regions-list">
                    {Array.from(new Set(['Región Metropolitana', 'Valparaíso', 'Antofagasta', 'Biobío', 'Maule', 'Araucanía', ...(existingProfessionals?.map(p => p.residence.region).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="cities-list">
                    {Array.from(new Set(['Santiago', 'Antofagasta', 'Viña del Mar', 'Concepción', 'Valparaíso', 'Rancagua', ...(existingProfessionals?.map(p => p.residence.city).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="universities-list">
                    {Array.from(new Set(['Universidad de Chile', 'PUC', 'Universidad de Antofagasta', 'USACH', 'UNAB', ...(existingProfessionals?.map(p => p.university).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="specialties-list">
                    {Array.from(new Set(['Radiología', 'Traumatología', 'Medicina General', 'Enfermería', ...(existingProfessionals?.map(p => p.specialty).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="subspecialties-list">
                    {Array.from(new Set(['Osteopulmonar', 'Neurorradiología', 'Intervencionismo', ...(existingProfessionals?.map(p => p.subSpecialty).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>
                <datalist id="teams-list">
                    {Array.from(new Set(['Médica Antofagasta', 'Central Santiago', 'Operaciones Norte', ...(existingProfessionals?.map(p => p.team).filter(Boolean) || [])])).map(v => <option key={v} value={v} />)}
                </datalist>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* Photo Upload Profile Area */}
                            <div className="flex flex-col items-center justify-center p-6 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <label className="relative cursor-pointer group">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-brand-border group-hover:border-brand-primary/50 flex items-center justify-center bg-brand-surface/50 transition-all">
                                        {formData.photoUrl ? (
                                            <img src={formData.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <UploadCloud className="w-6 h-6 text-brand-text/20 group-hover:text-brand-primary" />
                                                <span className="text-[10px] text-brand-text/40 mt-1 uppercase tracking-widest font-bold">Foto</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    {formData.photoUrl && (
                                        <button
                                            type="button"
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                            onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, photoUrl: '' })); }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </label>
                            </div>

                            {/* Sección 1: Cargo y Rol */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Información del Cargo</h3>
                                    </div>
                                    {/* Toggle Activo/Inactivo */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 border-2",
                                            formData.isActive
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]"
                                                : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_10px_-3px_rgba(239,68,68,0.3)]"
                                        )}
                                    >
                                        <span className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-colors",
                                            formData.isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                        )} />
                                        {formData.isActive ? 'ACTIVO' : 'INACTIVO'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <EditableCatalogField
                                        label="Cargo / Rol Principal"
                                        value={formData.role}
                                        onChange={val => setFormData({ ...formData, role: val as any })}
                                        items={roleItems}
                                        onAdd={addRole}
                                        onRemove={removeRole}
                                        onRename={renameRole}
                                    />
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Estatus de Info</label>
                                        <select
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none appearance-none"
                                            value={formData.infoStatus || 'incomplete'}
                                            onChange={e => setFormData({ ...formData, infoStatus: e.target.value as any })}
                                        >
                                            <option value="incomplete">Incompleto</option>
                                            <option value="pending">Pendiente Validación</option>
                                            <option value="complete">Completo</option>
                                        </select>
                                    </div>
                                    {isAlejandra && (
                                        <div className="space-y-2 md:col-span-2 flex items-center gap-3 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                            <input
                                                type="checkbox"
                                                id="isVerified"
                                                checked={formData.isVerified}
                                                onChange={e => setFormData({ ...formData, isVerified: e.target.checked })}
                                                className="w-4 h-4 rounded border-brand-border bg-brand-surface text-emerald-500 focus:ring-emerald-500/20"
                                            />
                                            <label htmlFor="isVerified" className="text-xs uppercase font-bold text-emerald-400 tracking-widest flex items-center gap-2 cursor-pointer">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Validación Oficial por Alejandra Versalovic
                                            </label>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Email Corporativo / Uso</label>
                                        <input
                                            type="email"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Datos Personales */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Datos Personales</h3>
                                    </div>
                                    {initialData?.id && (
                                        <div className="flex items-center gap-2">
                                            {portalLink && (
                                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Copiado
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleGeneratePortalLink}
                                                disabled={generatingLink}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-[10px] font-black uppercase hover:bg-info/20 transition-all disabled:opacity-50"
                                            >
                                                {generatingLink
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <LinkIcon className="w-3 h-3" />
                                                }
                                                {portalLink ? 'Regenerar link' : 'Enviar link al médico'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {portalLink && (
                                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-info/5 border border-info/20 rounded-xl">
                                        <span className="text-[10px] text-info/70 font-mono truncate flex-1">{portalLink}</span>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(portalLink)}
                                            className="flex-shrink-0 text-[9px] font-black uppercase text-info hover:text-info/80"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Nombres</label>
                                        <input
                                            required
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Apellidos</label>
                                        <input
                                            required
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.lastName}
                                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">RUT / DNI</label>
                                        <input
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.nationalId}
                                            onChange={e => {
                                                const formatted = formatRUT(e.target.value);
                                                setFormData(p => ({ ...p, nationalId: formatted }));
                                                const clean = e.target.value.replace(/[^0-9kK]/g, '');
                                                if (clean.length >= 8) {
                                                    setRutError(validateRUT(formatted) ? null : 'RUT inválido');
                                                } else {
                                                    setRutError(null);
                                                }
                                            }}
                                        />
                                        {rutError && (
                                            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {rutError}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Nacionalidad</label>
                                        <input
                                            list="nationalities-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.nationality}
                                            onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Fecha Nacimiento</label>
                                        <input
                                            type="date"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.birthDate}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Teléfono</label>
                                        <input
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            onBlur={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Ciudad</label>
                                        <input
                                            list="cities-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.residence.city}
                                            onChange={e => setFormData({ ...formData, residence: { ...formData.residence, city: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Región</label>
                                        <input
                                            list="regions-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.residence.region}
                                            onChange={e => setFormData({ ...formData, residence: { ...formData.residence, region: e.target.value } })}
                                        />
                                    </div>
                                    <EditableCatalogField
                                        label="Equipo / Unidad"
                                        value={formData.team || ''}
                                        onChange={val => setFormData({ ...formData, team: val })}
                                        items={teamItems}
                                        onAdd={addTeam}
                                        onRemove={removeTeam}
                                        onRename={renameTeam}
                                    />
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Asociado con</label>
                                        <select
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.associatedWith || ''}
                                            onChange={e => setFormData({ ...formData, associatedWith: e.target.value })}
                                        >
                                            <option value="">Seleccionar radiólogo asociado (opcional)...</option>
                                            {existingProfessionals
                                                ?.filter(p => p.role === 'Radiólogo' && p.id !== initialData?.id && (p.team === 'AFTA PRES' || p.team === 'AMIS Chile' || p.team === 'AMIS CHILE'))
                                                .sort((a, b) => ((a.lastName || '') + '').localeCompare((b.lastName || '') + ''))
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.lastName ? `${p.lastName}, ` : ''}{p.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* ── Documentos Obligatorios ── */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <GraduationCap className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Documentos Obligatorios</h3>
                                    <span className="ml-auto text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Todos requeridos
                                    </span>
                                </div>
                                <p className="text-[11px] text-brand-text/30 -mt-1 mb-3">
                                    El profesional debe subir estos documentos antes de iniciar actividades.
                                </p>

                                {[
                                    { key: 'titulo',       label: 'Certificado de Título',        hint: 'PDF emitido por la universidad' },
                                    { key: 'especialidad', label: 'Certificado de Especialidad',  hint: 'Acreditado por la institución formadora' },
                                    { key: 'sis',          label: 'Registro SIS / Colegio',       hint: 'Número de registro vigente' },
                                ].map(doc => (
                                    <AcademicDocRow
                                        key={doc.key}
                                        docType={doc.key}
                                        label={doc.label}
                                        hint={doc.hint}
                                        required
                                        professionalId={initialData?.id}
                                    />
                                ))}
                            </div>

                            {/* ── Documentos Opcionales ── */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <BookOpen className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Documentos Opcionales</h3>
                                </div>

                                {[
                                    { key: 'subespecialidad', label: 'Certificado Sub-especialidad / Fellow', hint: 'Si aplica' },
                                    { key: 'cv',              label: 'Currículum Vitae',                      hint: 'PDF o Word' },
                                ].map(doc => (
                                    <AcademicDocRow
                                        key={doc.key}
                                        docType={doc.key}
                                        label={doc.label}
                                        hint={doc.hint}
                                        required={false}
                                        professionalId={initialData?.id}
                                    />
                                ))}
                            </div>

                            {/* ── Otros Documentos ── */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Otros Documentos</h3>
                                </div>

                                {[
                                    { key: 'seguro_civil', label: 'Seguro de Responsabilidad Civil', hint: 'Vigente' },
                                    { key: 'cedula',       label: 'Cédula de Identidad',              hint: 'Ambos lados en un PDF' },
                                ].map(doc => (
                                    <AcademicDocRow
                                        key={doc.key}
                                        docType={doc.key}
                                        label={doc.label}
                                        hint={doc.hint}
                                        required={false}
                                        professionalId={initialData?.id}
                                    />
                                ))}
                            </div>

                            {/* ── Campos de texto (se mantienen para referencia rápida) ── */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertOctagon className="w-4 h-4 text-brand-text/30" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/40">Datos de Referencia</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Universidad</label>
                                        <input
                                            list="universities-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.university}
                                            onChange={e => setFormData({ ...formData, university: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">N° Registro (SIS / Colegio)</label>
                                        <input
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.registrationNumber}
                                            onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Especialidad</label>
                                        <input
                                            list="specialties-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Sub-especialidad</label>
                                        <input
                                            list="subspecialties-list"
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                            value={formData.subSpecialty}
                                            onChange={e => setFormData({ ...formData, subSpecialty: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Sección 4: Configuración Contractual */}
                            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Configuración Contractual</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContract}
                                        className="text-[10px] uppercase font-bold text-info hover:text-info/80 transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir Contrato
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.contracts.map((contract, i) => (
                                        <div key={i} className="p-4 bg-brand-surface border border-brand-border rounded-xl space-y-4 relative group">
                                            <button
                                                type="button"
                                                onClick={() => removeContract(i)}
                                                className="absolute top-2 right-2 p-1.5 text-danger/40 hover:text-danger transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Empresa Contratante</label>
                                                    <select
                                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                                        value={contract.company}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].company = e.target.value as HoldingCompany;
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    >
                                                        {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Relación Laboral</label>
                                                    <select
                                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                                        value={contract.type}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].type = e.target.value;
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {EMPLOYMENT_RELATIONSHIPS.map(rel => <option key={rel} value={rel}>{rel}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Monto Mensual</label>
                                                    <input
                                                        type="number"
                                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                                        value={contract.amount}
                                                        onChange={e => {
                                                            const newContracts = [...formData.contracts];
                                                            newContracts[i].amount = Number(e.target.value);
                                                            setFormData({ ...formData, contracts: newContracts });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'induction' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* ── Control Master ── */}
                            <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            formData.induction?.enabled ? "bg-info/10 text-info" : "bg-brand-surface text-brand-text/20"
                                        )}>
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-brand-text/90">Gestión de Inducción</h3>
                                            <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold">Punto de Control Auditoría</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer"
                                            checked={formData.induction?.enabled}
                                            onChange={e => setFormData({ ...formData, induction: { ...formData.induction!, enabled: e.target.checked } })}
                                        />
                                        <div className="w-11 h-6 bg-brand-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-brand-text after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-text/20 after:border-brand-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                            </div>

                            {formData.induction?.enabled ? (
                                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">

                                    {/* ── Fechas ── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Inicio Inducción</label>
                                            <input type="date"
                                                className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                                value={formData.induction?.startDate || ''}
                                                onChange={e => setFormData({ ...formData, induction: { ...formData.induction!, startDate: e.target.value, status: 'in_progress' } })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Fin Inducción</label>
                                            <input type="date"
                                                className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                                                value={formData.induction?.endDate || ''}
                                                onChange={e => setFormData({ ...formData, induction: { ...formData.induction!, endDate: e.target.value } })}
                                            />
                                        </div>
                                    </div>

                                    {/* ── Encargado RRHH ── */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-2">
                                            <UserCheck className="w-3 h-3" /> Encargado RRHH Responsable
                                        </label>
                                        <select
                                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text outline-none"
                                            value={formData.induction?.assignedHRManagerId || ''}
                                            onChange={e => setFormData({ ...formData, induction: { ...formData.induction!, assignedHRManagerId: e.target.value } })}
                                        >
                                            <option value="">Seleccionar responsable...</option>
                                            {managers.map(m => <option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>)}
                                        </select>
                                    </div>

                                    {/* ── Material de Bienvenida ── */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-purple-400" />
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Material de Bienvenida AMIS</h4>
                                        </div>
                                        {([
                                            {
                                                id: 'admin', title: 'Administración',
                                                color: 'border-blue-500/20 bg-blue-500/5', headerColor: 'text-blue-400',
                                                content: `La organización está constituida por el Dr. Marcelo Ávila (Director Médico), Sr. Patricio Abella (Gerente Médico) y EU. Alejandra Versalovic (RRHH, procesos clínicos y calidad).\n\nLa Dirección Médica coordina actividades médicas y administrativas, el cumplimiento del sistema de Calidad ISO 9001-2015, la gestión de información médica y la relación con instituciones para resolución de temas clínicos y reclamos.\n\nEl Gerente Médico es responsable de asuntos comerciales, pago de remuneraciones, gestión de recursos humanos, supervisión de contabilidad y administración general.`
                                            },
                                            {
                                                id: 'operatividad', title: 'Operatividad',
                                                color: 'border-emerald-500/20 bg-emerald-500/5', headerColor: 'text-emerald-400',
                                                content: `Su ingreso al equipo ha sido aprobado. Se coordinará una reunión online de bienvenida para presentarle al equipo.\n\nComuníquese con la secretaria Karla Álvarez para coordinar la reunión y recibir sus credenciales de acceso. La Dra. Verónica de la Maza le brindará capacitación en el sistema.\n\nLas instituciones en las que prestará servicios están en proceso de acreditación. Será incorporado a ese flujo y notificado una vez finalizado.`
                                            },
                                            {
                                                id: 'calidad', title: 'Calidad',
                                                color: 'border-amber-500/20 bg-amber-500/5', headerColor: 'text-amber-400',
                                                content: `Tiempos de informe: Urgencia → 1 hora | Hospitalizado → 3 horas | Ambulatorio → 24 horas.\n\nContenidos mínimos: identificación y edad del paciente, nombre y fecha del procedimiento, descripción de hallazgos, conclusión diagnóstica, indicaciones si corresponde, nombre y firma del médico.\n\nNotificación de resultados críticos según Nota Técnica N°9. No homologar diagnósticos. Los addendum posteriores a la validación se gestionan mediante el módulo correspondiente.`
                                            },
                                            {
                                                id: 'pacto', title: 'Pacto de Integridad',
                                                color: 'border-red-500/20 bg-red-500/5', headerColor: 'text-red-400',
                                                content: `En cumplimiento con la Ley N° 19.886 y Dictamen N° E370752/23 de la CGR, la empresa SOCIEDAD DE RADIÓLOGOS DEL NORTE SpA y sus funcionarios deben cumplir los principios de transparencia, igualdad y probidad.\n\nSe debe inhibir de contratar funcionarios públicos que intervengan en procesos de compra, implementar medidas anti-corrupción y abstenerse de ejercer influencia indebida, ofrecer donativos, contactar a la comisión evaluadora durante la evaluación, distorsionar licitaciones o atentar contra la libre competencia.\n\nLos contratos celebrados con infracción al Capítulo VII serán nulos. El incumplimiento constituye contravención al principio de probidad administrativa con responsabilidad civil y penal.`
                                            },
                                        ] as const).map(section => (
                                            <div key={section.id} className={cn('border rounded-xl overflow-hidden', section.color)}>
                                                <div className="px-4 py-2.5 border-b border-current/10">
                                                    <span className={cn('text-xs font-black uppercase tracking-widest', section.headerColor)}>
                                                        {section.title}
                                                    </span>
                                                </div>
                                                <div className="px-4 py-3 max-h-36 overflow-y-auto space-y-2">
                                                    {section.content.split('\n\n').map((p, i) => (
                                                        <p key={i} className="text-xs text-brand-text/70 leading-relaxed">{p}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Declaración jurada ── */}
                                    <div className={cn(
                                        'p-4 rounded-2xl border-2 transition-all',
                                        formData.induction?.hasReadAndAccepted
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-brand-surface border-brand-border'
                                    )}>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-brand-border bg-brand-surface text-emerald-500 focus:ring-emerald-500/20 mt-0.5 flex-shrink-0"
                                                checked={formData.induction?.hasReadAndAccepted || false}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    induction: {
                                                        ...formData.induction!,
                                                        hasReadAndAccepted: e.target.checked,
                                                        acceptedAt: e.target.checked ? new Date().toISOString() : undefined,
                                                        status: e.target.checked ? 'completed' : 'in_progress'
                                                    }
                                                })}
                                            />
                                            <div>
                                                <p className={cn('text-sm font-bold transition-colors',
                                                    formData.induction?.hasReadAndAccepted ? 'text-emerald-400' : 'text-brand-text/70'
                                                )}>
                                                    Declaro haber leído y acepto la información entregada
                                                </p>
                                                <p className="text-[10px] text-brand-text/40 mt-1 leading-relaxed">
                                                    Al marcar esta casilla confirmo haber leído Administración, Operatividad, Calidad y el Pacto de Integridad. Esta declaración es legalmente vinculante para efectos de acreditación.
                                                </p>
                                                {formData.induction?.acceptedAt && (
                                                    <p className="text-[9px] text-emerald-400/60 font-mono mt-1">
                                                        Aceptado el {new Date(formData.induction.acceptedAt).toLocaleString('es-CL')}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    {/* ── Certificado firmado ── */}
                                    {formData.induction?.hasReadAndAccepted && initialData?.id && (
                                        <InductionPDFGenerator
                                            professionalId={initialData.id}
                                            professionalName={`${initialData.name} ${initialData.lastName || ''}`.trim()}
                                            acceptedAt={formData.induction.acceptedAt!}
                                        />
                                    )}

                                    {/* ── Alerta ── */}
                                    <div className="p-3 bg-warning/5 border border-warning/10 rounded-xl flex items-start gap-3">
                                        <BellRing className="w-5 h-5 text-warning mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Sistema de Alertas</p>
                                            <p className="text-[11px] text-warning/80 leading-tight">
                                                Se enviarán avisos automáticos 15 días antes del vencimiento del periodo de inducción o de cualquier documento crítico.
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <ShieldCheck className="w-12 h-12 text-brand-text/5 mx-auto mb-2" />
                                    <p className="text-xs text-brand-text/20">La inducción está desactivada para este perfil profesional.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'expediente' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Selector de Batería */}
                            <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest block mb-4">Asignar Batería Documental</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <select
                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text outline-none"
                                        value={selectedBatteryId}
                                        onChange={e => setSelectedBatteryId(e.target.value)}
                                    >
                                        <option value="">Seleccionar batería...</option>
                                        {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>

                                    {selectedBattery && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                <span className="text-brand-text/40">Cumplimiento</span>
                                                <span className="text-info">{batteryProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-info transition-all duration-500"
                                                    style={{ width: `${batteryProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lista de Requerimientos */}
                            {selectedBattery ? (
                                <div className="space-y-2">
                                    {selectedBattery.requirements.map(req => {
                                        const doc = professionalDocuments.find(d => d.requirementId === req.id);
                                        return (
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-brand-surface/50 border border-brand-border rounded-xl group hover:border-brand-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    {doc ? (
                                                        <CheckCircle2 className="w-5 h-5 text-success" />
                                                    ) : (
                                                        <AlertCircle className={cn("w-5 h-5", req.isRequired ? "text-warning" : "text-brand-text/10")} />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-bold text-brand-text/90">{req.label}</p>
                                                        <p className="text-[10px] text-brand-text/30 uppercase tracking-tighter">
                                                            {req.category} • {req.isRequired ? 'Obligatorio' : 'Opcional'}
                                                        </p>
                                                        {doc?.isValidated && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Sparkles className="w-2.5 h-2.5 text-info" />
                                                                <span className="text-[8px] font-bold text-info uppercase tracking-widest">Validado Agrawall AI</span>
                                                            </div>
                                                        )}
                                                        {doc?.expiryDate && (
                                                            <p className="text-[9px] text-warning font-bold mt-1">
                                                                Vence: {new Date(doc.expiryDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {doc ? (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => window.open(doc.url, '_blank')}
                                                                className="px-3 py-1.5 bg-brand-surface rounded-lg text-[10px] font-bold uppercase hover:bg-brand-primary/10 transition-all text-brand-text"
                                                            >
                                                                Ver
                                                            </button>
                                                            <button
                                                                type="button"
                                                                title={doc.isLocked ? "Bloqueado por Auditoría" : "Eliminar"}
                                                                disabled={doc.isLocked}
                                                                className={cn(
                                                                    "p-1.5 rounded-lg transition-colors",
                                                                    doc.isLocked ? "text-brand-text/10 cursor-not-allowed" : "text-brand-text/20 hover:bg-danger/10 hover:text-danger"
                                                                )}
                                                            >
                                                                <Trash className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequirementUpload(req)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-info/10 border border-info/20 rounded-lg text-[10px] font-bold uppercase text-info hover:bg-info/20 transition-all"
                                                        >
                                                            <UploadCloud className="w-3 h-3" />
                                                            Cargar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-dashed border-brand-border rounded-2xl">
                                    <FolderSearch className="w-8 h-8 text-brand-text/10 mx-auto mb-4" />
                                    <p className="text-sm text-brand-text/40">Selecciona una batería para visualizar los requerimientos específicos de este perfil profesional.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-6 border-t border-brand-border space-y-3">
                        {/* Confirmación de eliminación */}
                        {showDeleteConfirm && (
                            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p className="text-xs text-red-300 flex-1">¿Estás seguro de <strong>eliminar permanentemente</strong> a <strong>{initialData?.name} {initialData?.lastName}</strong>?</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 text-xs font-bold border border-brand-border rounded-lg hover:bg-brand-surface transition-all text-brand-text"
                                    >
                                        No
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!onDelete || !initialData) return;
                                            setIsDeleting(true);
                                            try {
                                                const result = await onDelete(initialData.id);
                                                setIsDeleting(false);
                                                if (result.success) {
                                                    setShowDeleteConfirm(false);
                                                    onClose();
                                                } else {
                                                    alert('Error al eliminar: ' + result.error);
                                                }
                                            } catch (err: any) {
                                                setIsDeleting(false);
                                                alert('Error al eliminar: ' + err.message);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {isDeleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Eliminando...</> : <><Trash2 className="w-3 h-3" /> Sí, Eliminar</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Botones principales */}
                        <div className="flex gap-3">
                            {/* Botón Eliminar (solo al editar) */}
                            {isEditing && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2.5 border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            )}

                            {/* Botón Cancelar */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-brand-border rounded-xl hover:bg-brand-surface transition-all text-sm font-medium text-brand-text"
                            >
                                Cancelar
                            </button>

                            {/* Botón Guardar */}
                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className={cn(
                                    "flex-[2] px-4 py-2.5 rounded-xl transition-all text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2",
                                    isEditing
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                                        : "bg-brand-text text-brand-bg hover:opacity-90"
                                )}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                ) : isEditing ? (
                                    <><Save className="w-4 h-4" /> Guardar Cambios</>
                                ) : (
                                    <><Plus className="w-4 h-4" /> Agregar Profesional</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Modal de Carga Integrado */}
                {
                    showUploadModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <DocumentUploadModal
                                prefill={uploadPrefill}
                                onClose={() => setShowUploadModal(false)}
                                onUpload={async (file, metadata) => {
                                    const res = await uploadDocument(file, metadata);
                                    if (res.success) {
                                        setShowUploadModal(false);
                                    }
                                    return res;
                                }}
                            />
                        </div>
                    )
                }
            </div >
        </div >
    );
};


