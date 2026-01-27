import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Document } from '../types/communication';

export const useDocuments = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const { data, error: supabaseError } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            // Mapeo de snake_case (DB) a camelCase (UI Types)
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
            console.error('Error fetching documents:', err);
            setError(err.message);
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
