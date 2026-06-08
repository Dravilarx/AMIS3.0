import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TenderProfessional {
    id:             string;
    professionalId: string;
    name:           string;
    role:           string;
    photoUrl:       string | null;
}

export interface TenderRequiredDoc {
    id:      string;
    docType: string;
    label:   string;
}

export interface ProfessionalDocStatus {
    professionalId: string;
    docType:        string;
    fileUrl:        string | null;
    fileName:       string | null;
    isPending:      boolean;
}

const DOC_OPTIONS = [
    { value: 'cv',              label: 'Currículum Vitae' },
    { value: 'titulo',          label: 'Certificado de Título' },
    { value: 'especialidad',    label: 'Certificado de Especialidad' },
    { value: 'sis',             label: 'Registro SIS' },
    { value: 'subespecialidad', label: 'Certificado Sub-especialidad' },
    { value: 'cedula',          label: 'Cédula de Identidad' },
    { value: 'seguro_civil',    label: 'Seguro de Responsabilidad Civil' },
    { value: 'fellow',          label: 'Certificado Fellow / Posgrado' },
];

export const useTenderFolder = (tenderId: string | undefined) => {
    const [professionals, setProfessionals] = useState<TenderProfessional[]>([]);
    const [requiredDocs,  setRequiredDocs]  = useState<TenderRequiredDoc[]>([]);
    const [docStatuses,   setDocStatuses]   = useState<ProfessionalDocStatus[]>([]);
    const [loading, setLoading]             = useState(false);

    const fetchAll = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            // 1. Médicos de la licitación
            const { data: profData } = await supabase
                .from('tender_professionals')
                .select(`
                    id,
                    professional_id,
                    professionals (
                        name, last_name, role, photo_url
                    )
                `)
                .eq('tender_id', tenderId);

            setProfessionals((profData || []).map((r: any) => ({
                id:             r.id,
                professionalId: r.professional_id,
                name:           `${r.professionals?.name || ''} ${r.professionals?.last_name || ''}`.trim(),
                role:           r.professionals?.role || '—',
                photoUrl:       r.professionals?.photo_url || null,
            })));

            // 2. Documentos requeridos
            const { data: docData } = await supabase
                .from('tender_required_docs')
                .select('id, doc_type, label')
                .eq('tender_id', tenderId)
                .order('created_at');

            setRequiredDocs((docData || []).map((d: any) => ({
                id:      d.id,
                docType: d.doc_type,
                label:   d.label,
            })));

            // 3. Estado de docs académicos de cada médico
            if (profData && profData.length > 0) {
                const profIds = profData.map((r: any) => r.professional_id);
                const { data: statusData } = await supabase
                    .from('professional_academic_docs')
                    .select('professional_id, doc_type, file_url, file_name, is_pending')
                    .in('professional_id', profIds);

                setDocStatuses((statusData || []).map((s: any) => ({
                    professionalId: s.professional_id,
                    docType:        s.doc_type,
                    fileUrl:        s.file_url || null,
                    fileName:       s.file_name || null,
                    isPending:      s.is_pending,
                })));
            }
        } finally {
            setLoading(false);
        }
    }, [tenderId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const addProfessional = async (professionalId: string) => {
        if (!tenderId) return { success: false };
        const { error } = await supabase
            .from('tender_professionals')
            .insert({ tender_id: tenderId, professional_id: professionalId });
        if (!error) await fetchAll();
        return { success: !error, error: error?.message };
    };

    const removeProfessional = async (id: string) => {
        const { error } = await supabase
            .from('tender_professionals')
            .delete()
            .eq('id', id);
        if (!error) await fetchAll();
        return { success: !error };
    };

    const addRequiredDoc = async (docType: string) => {
        if (!tenderId) return { success: false };
        const label = DOC_OPTIONS.find(d => d.value === docType)?.label || docType;
        const { error } = await supabase
            .from('tender_required_docs')
            .insert({ tender_id: tenderId, doc_type: docType, label });
        if (!error) await fetchAll();
        return { success: !error, error: error?.message };
    };

    const removeRequiredDoc = async (id: string) => {
        const { error } = await supabase
            .from('tender_required_docs')
            .delete()
            .eq('id', id);
        if (!error) await fetchAll();
        return { success: !error };
    };

    const getDocStatus = (professionalId: string, docType: string) =>
        docStatuses.find(s => s.professionalId === professionalId && s.docType === docType);

    return {
        professionals,
        requiredDocs,
        loading,
        addProfessional,
        removeProfessional,
        addRequiredDoc,
        removeRequiredDoc,
        getDocStatus,
        refresh: fetchAll,
        DOC_OPTIONS,
    };
};
