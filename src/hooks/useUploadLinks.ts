import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isRlsError } from './useDocuments';

// Administración de "Buzones de subida externa" (upload_links). Solo lectura/
// gestión desde acá — el INSERT real lo hace exclusivamente el RPC
// fn_crear_buzon (ya aplicado en la BD, valida nivel, PIN y hashea con
// bcrypt). Este hook nunca inserta en upload_links directamente.
export interface UploadLink {
    id: string;
    etiqueta: string;
    folderId: string;
    folderName: string;
    activo: boolean;
    revokedAt: string | null;
    uploadsCount: number;
    lastUsedAt: string | null;
    createdBy: string | null;
    createdByName?: string;
    createdAt: string;
}

type Resultado = { success: boolean; error?: string; rls?: boolean };

const mapRow = (r: any, nombresPorId: Map<string, string>): UploadLink => ({
    id: r.id,
    etiqueta: r.etiqueta,
    folderId: r.folder_id,
    folderName: r.document_folders?.name || '—',
    activo: r.activo,
    revokedAt: r.revoked_at,
    uploadsCount: r.uploads_count ?? 0,
    lastUsedAt: r.last_used_at,
    createdBy: r.created_by,
    createdByName: r.created_by ? (nombresPorId.get(r.created_by) || 'Usuario desconocido') : undefined,
    createdAt: r.created_at,
});

export const useUploadLinks = () => {
    const [links, setLinks] = useState<UploadLink[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLinks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('upload_links')
                .select('id, etiqueta, folder_id, activo, revoked_at, uploads_count, last_used_at, created_by, created_at, document_folders(name)')
                .order('created_at', { ascending: false });
            if (error) throw error;

            const ids = Array.from(new Set((data || []).map((r: any) => r.created_by).filter(Boolean)));
            let nombresPorId = new Map<string, string>();
            if (ids.length > 0) {
                const { data: perfiles } = await supabase.from('profiles_publicos').select('id, full_name').in('id', ids);
                nombresPorId = new Map((perfiles || []).map((p: any) => [p.id, p.full_name]));
            }

            setLinks((data || []).map((r: any) => mapRow(r, nombresPorId)));
        } catch (err) {
            console.error('Error cargando buzones de subida externa:', err);
            setLinks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLinks(); }, [fetchLinks]);

    // Único camino de creación: el RPC valida nivel<=2, formato del PIN (4-6
    // dígitos) y lo hashea con bcrypt server-side. Devuelve el token del link.
    const crearBuzon = async (etiqueta: string, folderId: string, pin: string): Promise<Resultado & { token?: string }> => {
        try {
            const { data, error } = await supabase.rpc('fn_crear_buzon', {
                p_etiqueta: etiqueta.trim(),
                p_folder_id: folderId,
                p_pin: pin,
            });
            if (error) throw error;
            await fetchLinks();
            return { success: true, token: data as string };
        } catch (err: any) {
            console.error('Error creando buzón:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    const revocarBuzon = async (id: string): Promise<Resultado> => {
        try {
            const { error } = await supabase
                .from('upload_links')
                .update({ activo: false, revoked_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error revocando buzón:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    // El PIN sigue siendo irrecuperable (hasheado). Esto solo recupera el TOKEN
    // para poder volver a mostrar el link — vía RPC (nivel<=2), no se lee el
    // token por SELECT directo.
    const obtenerToken = async (id: string): Promise<{ success: boolean; token?: string; error?: string; rls?: boolean }> => {
        try {
            const { data, error } = await supabase.rpc('fn_token_buzon', { p_id: id });
            if (error) throw error;
            return { success: true, token: data as string };
        } catch (err: any) {
            console.error('Error obteniendo token del buzón:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    const eliminarBuzon = async (id: string): Promise<Resultado> => {
        try {
            const { error } = await supabase.rpc('fn_eliminar_buzon', { p_id: id });
            if (error) throw error;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error eliminando buzón:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    return { links, loading, refresh: fetchLinks, crearBuzon, revocarBuzon, obtenerToken, eliminarBuzon };
};
