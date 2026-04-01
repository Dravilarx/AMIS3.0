import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Calendar, Activity, Loader2, Upload, FileCheck, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import type { MedicalProcedure } from '../../types/clinical';

interface PatientGuideData {
    procedure: MedicalProcedure;
    appointmentId?: string;
    documents?: any[]; // appointment_documents joined with requirement
}

export const PatientGuideView: React.FC = () => {
    const [data, setData] = useState<PatientGuideData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    const fetchGuideData = async () => {
        try {
            const parts = window.location.pathname.split('/');
            const id = parts[parts.length - 1];

            if (!id) throw new Error('No se encontró el identificador');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Intentar primero como ID de cita clínica
            const { data: appData, error: appError } = await supabase
                .from('clinical_appointments')
                .select(`
                    id,
                    procedure:medical_procedures_catalog(*),
                    documents:appointment_documents(
                        id, document_url, verified,
                        requirement:appointment_requirements(*)
                    )
                `)
                .eq('id', id)
                .single();

            if (!appError && appData?.procedure) {
                // Supabase might return an array if foreign key isn't explicit many-to-one in types
                const procData = Array.isArray(appData.procedure) ? appData.procedure[0] : appData.procedure;

                // Es una cita médica y encontramos todo
                setData({
                    procedure: {
                        id: procData.id,
                        code: procData.code,
                        name: procData.name,
                        description: procData.description,
                        basePrice: procData.base_price,
                        isActive: procData.is_active,
                        preparationGuide: procData.preparation_guide
                    },
                    appointmentId: appData.id,
                    documents: appData.documents
                });
            } else {
                // Fallback: Intentar como ID de procedimiento directo (links antiguos)
                const { data: procData, error: procError } = await supabase
                    .from('medical_procedures_catalog')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (procError || !procData) {
                    throw new Error('No se encontraron registros para este enlace.');
                }

                setData({
                    procedure: {
                        id: procData.id,
                        code: procData.code,
                        name: procData.name,
                        description: procData.description,
                        basePrice: procData.base_price,
                        isActive: procData.is_active,
                        preparationGuide: procData.preparation_guide
                    }
                });
            }
        } catch (err: any) {
            console.error('Error fetching guide:', err);
            setError(err.message || 'Error al cargar la guía');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuideData();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedDocId || !data?.appointmentId) return;

        setUploadingDocId(selectedDocId);
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            const fileExt = file.name.split('.').pop() || 'pdf';
            const filePath = `clinical/${selectedDocId}_patient_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('appointment_documents')
                .update({ document_url: urlData.publicUrl })
                .eq('id', selectedDocId);

            if (updateError) throw updateError;

            // Refrescar estado local para este doc
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    documents: prev.documents?.map(d =>
                        d.id === selectedDocId ? { ...d, document_url: urlData.publicUrl } : d
                    )
                };
            });

        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Hubo un error subiendo tu archivo. Por favor reintenta.');
        } finally {
            setUploadingDocId(null);
            setSelectedDocId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = (docId: string) => {
        setSelectedDocId(docId);
        fileInputRef.current?.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-brand-text">
                <Loader2 className="w-10 h-10 animate-spin text-brand-primary mb-6" />
                <p className="text-xs font-black uppercase tracking-widest text-brand-text/40">Conectando con Clínica...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-3xl flex items-center justify-center mb-6">
                    <Activity className="w-8 h-8 text-danger" />
                </div>
                <h1 className="text-2xl font-black text-brand-text uppercase tracking-tighter mb-2">Página no encontrada</h1>
                <p className="text-sm text-brand-text/40 font-medium">{error || 'El procedimiento solicitado no existe o ya no está disponible.'}</p>
            </div>
        );
    }

    const unverifiedDocs = data.documents?.filter(d => !d.verified) || [];

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-primary/20">
            {/* Header AMIS */}
            <div className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border">
                <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest leading-none">AMIS</h2>
                            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-tighter mt-1">Guía del Paciente</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-6 py-12 space-y-12 pb-32">

                {/* Oculto Input File */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                />

                {/* Title Section */}
                <div className="space-y-6 text-center md:text-left">
                    <span className="inline-block px-4 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-[10px] font-black text-brand-primary uppercase tracking-widest shadow-sm">
                        Instrucciones Clínicas
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[1.1] text-balance">
                        Preparación para <span className="text-brand-primary block mt-2">{data.procedure.name}</span>
                    </h1>
                    <p className="text-sm md:text-base text-brand-text/60 font-medium leading-relaxed max-w-2xl text-balance">
                        {data.procedure.description}
                    </p>
                </div>

                {/* Documents / Requirements Section */}
                {(data.appointmentId && unverifiedDocs.length > 0) || !data.appointmentId ? (
                    <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 text-brand-primary">
                                    <FileCheck className="w-6 h-6" />
                                    Documentos Requeridos {!data.appointmentId && <span className="text-[10px] bg-warning/20 text-warning px-2 py-1 rounded-md ml-2 tracking-widest">VISTA PREVIA</span>}
                                </h3>
                                <p className="text-xs text-brand-text/60 font-medium mt-2">
                                    Por favor sube una fotografía o documento (PDF) de los siguientes requisitos antes de asistir a nuestro centro clínico.
                                </p>
                            </div>

                            <div className="grid gap-4">
                                {/* Mapeo de documentos reales si existe la cita */}
                                {data.appointmentId && unverifiedDocs.map(doc => (
                                    <div key={doc.id} className="p-6 bg-brand-surface border border-brand-border rounded-[1.5rem] flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center">
                                                {doc.document_url ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Clock className="w-5 h-5 text-warning" />}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-tight">{doc.requirement?.name}</h4>
                                                <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-wider">{doc.requirement?.description}</p>
                                            </div>
                                        </div>

                                        <div>
                                            {uploadingDocId === doc.id ? (
                                                <div className="px-5 py-2.5 rounded-xl bg-brand-bg flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Subiendo...</span>
                                                </div>
                                            ) : doc.document_url ? (
                                                <div className="px-5 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Enviado</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => triggerFileSelect(doc.id)}
                                                    className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    Subir Archivo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Modo Vista Previa si no hay cita */}
                                {!data.appointmentId && (
                                    <div className="p-6 bg-brand-surface border border-brand-border border-dashed rounded-[1.5rem] flex items-center justify-between opacity-80">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-warning" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-tight">Ejemplo: Orden Médica</h4>
                                                <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-wider">Documento de ejemplo para previsualización</p>
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => alert('Modo Vista Previa: El paciente podrá subir su documento aquí una vez genere la cita médica.')}
                                                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 hover:scale-105"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Subir Archivo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Guide Section */}
                <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Activity className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 space-y-8">
                        <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 border-b border-brand-border pb-6">
                            <Calendar className="w-6 h-6 text-brand-primary" />
                            Paso a Paso
                        </h3>

                        <div className="prose prose-sm md:prose-base prose-invert prose-p:text-brand-text/70 prose-headings:text-brand-text prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline max-w-none">
                            {data.procedure.preparationGuide ? (
                                <div dangerouslySetInnerHTML={{ __html: data.procedure.preparationGuide.replace(/\n/g, '<br/>') }} />
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-brand-text/40 font-medium">No hay indicaciones específicas de preparación para este procedimiento. Sin embargo, por favor asiste con 15 minutos de anticipación.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Important Footer */}
                <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-[2rem] p-8 text-center space-y-4">
                    <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-widest">Aviso Importante</h4>
                    <p className="text-xs text-brand-text/60 font-medium leading-relaxed max-w-lg mx-auto">
                        Si tienes alguna duda adicional sobre tu preparación, por favor contacta a nuestro centro de atención telefónica o responde a nuestro canal oficial de WhatsApp.
                    </p>
                </div>
            </main>
        </div>
    );
};
