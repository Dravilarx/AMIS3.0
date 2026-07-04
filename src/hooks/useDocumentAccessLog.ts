import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { DocumentAccessAction } from './useDocuments';

export interface DocumentAccessEntry {
    id: string;
    documentId: string;
    userId: string;
    userName: string; // resuelto vía profiles, client-side (mismo patrón batched)
    accion: DocumentAccessAction;
    createdAt: string;
}

// RLS: SELECT solo para useMyLevel() <= 2. Si la consulta falla (RLS u otro
// motivo), `unavailable` queda true y el componente debe ocultar la sección
// sin mostrar error — nunca es un fallo del flujo principal.
export const useDocumentAccessLog = () => {
    const [entries, setEntries] = useState<DocumentAccessEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    const fetchLog = useCallback(async (documentId: string) => {
        setLoading(true);
        setUnavailable(false);
        try {
            const { data, error } = await supabase
                .from('document_access_log')
                .select('*')
                .eq('document_id', documentId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const rows = data || [];
            const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
            let namesById = new Map<string, string>();
            if (userIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', userIds);
                namesById = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
            }

            setEntries(rows.map((r: any) => ({
                id: r.id,
                documentId: r.document_id,
                userId: r.user_id,
                userName: namesById.get(r.user_id) || 'Usuario desconocido',
                accion: r.accion,
                createdAt: r.created_at,
            })));
        } catch (err) {
            // No es un error de UI: la sección se oculta silenciosamente.
            console.warn('No se pudo cargar el historial de accesos:', err);
            setEntries([]);
            setUnavailable(true);
        } finally {
            setLoading(false);
        }
    }, []);

    return { entries, loading, unavailable, fetchLog };
};
