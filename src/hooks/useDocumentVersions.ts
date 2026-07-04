import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE, isRlsError } from './useDocuments';
import type { Document } from '../types/communication';

export interface DocumentVersion {
    id: string;
    documentId: string;
    version: number;
    title: string | null;
    url: string;
    signed: boolean;
    signedAt: string | null;
    signerName: string | null;
    replacedBy: string | null;
    replacedByName: string | null; // resuelto vía profiles, client-side
    replacedAt: string;
}

// El frontend SOLO LEE document_versions: un trigger en `documents` la escribe
// automáticamente cada vez que cambia `url` (y limpia la firma si el documento
// estaba firmado). Nunca se hace INSERT/UPDATE a document_versions desde acá.
export const useDocumentVersions = () => {
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchVersions = useCallback(async (documentId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('document_versions')
                .select('*')
                .eq('document_id', documentId)
                .order('version', { ascending: false });

            if (error) throw error;

            const rows = data || [];
            const replacerIds = Array.from(new Set(rows.map((r: any) => r.replaced_by).filter(Boolean)));
            let namesById = new Map<string, string>();
            if (replacerIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', replacerIds);
                namesById = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
            }

            setVersions(rows.map((r: any) => ({
                id: r.id,
                documentId: r.document_id,
                version: r.version,
                title: r.title,
                url: r.url,
                signed: !!r.signed,
                signedAt: r.signed_at,
                signerName: r.signer_name,
                replacedBy: r.replaced_by,
                replacedByName: r.replaced_by ? (namesById.get(r.replaced_by) || 'Usuario desconocido') : null,
                replacedAt: r.replaced_at,
            })));
        } catch (err) {
            console.error('Error cargando historial de versiones:', err);
            setVersions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sube un archivo nuevo y actualiza documents.url. El trigger de la BD
    // archiva automáticamente la versión anterior (y limpia la firma si aplica).
    const uploadNewVersion = async (doc: Document, file: File) => {
        try {
            if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
                return { success: false, error: `Tipo de archivo no permitido: ${file.type}` };
            }
            if (file.size > MAX_DOCUMENT_SIZE) {
                return { success: false, error: 'El archivo excede el límite de 50 MB' };
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `${doc.category || 'other'}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
                .from('documents')
                .update({ url: filePath })
                .eq('id', doc.id);
            if (dbError) throw dbError;

            return { success: true };
        } catch (err: any) {
            console.error('Error subiendo nueva versión:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    // Restaura una versión anterior: solo actualiza documents.url. El trigger
    // archiva la versión ACTUAL (la que se está reemplazando) automáticamente.
    const restoreVersion = async (documentId: string, versionUrl: string) => {
        try {
            const { error } = await supabase
                .from('documents')
                .update({ url: versionUrl })
                .eq('id', documentId);
            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            console.error('Error restaurando versión:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    return { versions, loading, fetchVersions, uploadNewVersion, restoreVersion };
};
