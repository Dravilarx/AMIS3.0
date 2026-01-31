import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Document } from '../types/communication';

export const useDocuments = (_options?: { limit?: number }) => {
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
                signed: d.signed,
                visibility: d.visibility || 'community',
                targetId: d.target_id,
                projectId: d.project_id,
                taskId: d.task_id,
                requirementId: d.requirement_id,
                isLocked: d.is_locked,
                isValidated: d.is_validated,
                aiObservation: d.ai_observation,
                expiryDate: d.expiry_date
            }));

            setDocuments(mappedData);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            setError(err.message);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const uploadDocument = async (file: File, metadata: Partial<Document>) => {
        try {
            // Validación de tipos extendida
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
                'text/markdown',
                'text/plain',
                'image/jpeg',
                'image/png',
                'video/mp4',
                'video/quicktime'
            ];

            if (!allowedTypes.includes(file.type)) {
                return {
                    success: false,
                    error: `Tipo de archivo no permitido: ${file.type}. Formatos aceptados: PDF, Word, Excel, Markdown, Imágenes (JPG/PNG) y Vídeos (MP4/MOV)`
                };
            }

            const maxSize = 100 * 1024 * 1024; // Aumentado a 100 MB para vídeos
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: `El archivo excede el límite de 100 MB`
                };
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `expedientes/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // Validación por IA si es un requerimiento de batería
            let aiValidation = null;
            if (metadata.requirementId) {
                const { validateInductionDocument } = await import('../modules/hr/inductionAI');
                // Intentamos obtener el nombre del profesional si es posible desde los metadatos o contexto
                aiValidation = await validateInductionDocument(
                    file,
                    metadata.title || 'Documento',
                    'Identidad en Verificación', // Placeholder si no viene
                    metadata.targetId || 'N/A'
                );
            }

            const { error: dbError } = await supabase
                .from('documents')
                .insert([{
                    title: metadata.title || file.name,
                    type: metadata.type || (file.type.includes('image') ? 'image' : file.type.includes('video') ? 'video' : 'pdf'),
                    category: metadata.category || 'other',
                    content_summary: aiValidation?.observation || 'Procesando por Agrawall AI...',
                    url: publicUrl,
                    signed: false,
                    visibility: metadata.visibility || 'community',
                    target_id: metadata.targetId,
                    project_id: metadata.projectId,
                    task_id: metadata.taskId,
                    requirement_id: metadata.requirementId,
                    is_locked: !!metadata.requirementId, // Bloqueo automático para acreditación
                    is_validated: aiValidation?.isValid || false,
                    ai_observation: aiValidation?.observation,
                    expiry_date: aiValidation?.extractedExpiryDate
                }]);

            if (dbError) throw new Error(`Error al registrar documento: ${dbError.message}`);

            await fetchDocuments();
            return { success: true };
        } catch (err: any) {
            console.error('Upload error:', err);
            return {
                success: false,
                error: err.message || 'Error desconocido'
            };
        }
    };


    useEffect(() => {
        fetchDocuments();
    }, []);

    return { documents, loading, error, refresh: fetchDocuments, uploadDocument };
};
