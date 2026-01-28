import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Document } from '../types/communication';

const MOCK_DOCUMENTS: Document[] = [
    {
        id: 'DOC-001',
        title: 'Contrato Marco Portezuelo 2026',
        type: 'pdf',
        category: 'legal',
        contentSummary: 'Condiciones generales de prestación de servicios para el Holding Portezuelo.',
        url: '#',
        createdAt: new Date().toISOString(),
        signed: true
    },
    {
        id: 'DOC-002',
        title: 'Protocolo Telemedicina v3',
        type: 'pdf',
        category: 'clinical',
        contentSummary: 'Guía clínica para la atención remota de pacientes críticos.',
        url: '#',
        createdAt: new Date().toISOString(),
        signed: false
    }
];

export const useDocuments = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: supabaseError } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            const mappedData: Document[] = (data || []).map(d => ({
                id: d.id,
                title: d.title,
                type: d.type as any,
                category: d.category as any,
                contentSummary: d.content_summary,
                url: d.url,
                createdAt: d.created_at,
                signed: d.signed
            }));

            setDocuments(mappedData);
        } catch (err: any) {
            console.error('Error fetching documents, using mock data:', err);
            setDocuments(MOCK_DOCUMENTS);
            // setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadDocument = async (file: File, metadata: Partial<Document>) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `expedientes/${fileName}`;

            // 1. Subir a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // 3. Crear registro en DB
            const { error: dbError } = await supabase
                .from('documents')
                .insert([{
                    title: metadata.title || file.name,
                    type: metadata.type || 'pdf',
                    category: metadata.category || 'legal',
                    content_summary: 'Procesando por Agrawall AI...',
                    url: publicUrl,
                    signed: false
                }]);

            if (dbError) throw dbError;

            await fetchDocuments();
            return { success: true };
        } catch (err: any) {
            console.error('Upload error:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    return { documents, loading, error, refresh: fetchDocuments, uploadDocument };
};
