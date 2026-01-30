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
            // Validación de tipo de archivo
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                return {
                    success: false,
                    error: `Tipo de archivo no permitido. Solo se aceptan: PDF, DOC, DOCX, TXT`
                };
            }

            // Validación de tamaño (50 MB)
            const maxSize = 50 * 1024 * 1024; // 50 MB en bytes
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: `El archivo excede el límite de 50 MB (tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB)`
                };
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `expedientes/${fileName}`;

            // 1. Subir a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Error al subir archivo: ${uploadError.message}`);
            }

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

            if (dbError) {
                console.error('Database insert error:', dbError);
                throw new Error(`Error al registrar documento: ${dbError.message}`);
            }

            await fetchDocuments();
            return { success: true };
        } catch (err: any) {
            console.error('Upload error:', err);
            return {
                success: false,
                error: err.message || 'Error desconocido al subir el documento'
            };
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    return { documents, loading, error, refresh: fetchDocuments, uploadDocument };
};
