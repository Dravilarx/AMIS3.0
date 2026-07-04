import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getSignedDocumentUrl } from '../lib/storageUrls';
import { useAuth } from './useAuth';

// Rúbrica (firma manuscrita) del usuario: PNG transparente en el bucket privado
// 'documents' (ruta 'rubricas/{userId}-{timestamp}.png'), referenciada por
// profiles.rubrica_path. Un usuario tiene UNA rúbrica vigente a la vez.
export const useRubrica = () => {
    const { user } = useAuth();
    const [rubricaPath, setRubricaPath] = useState<string | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRubrica = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('rubrica_path')
                .eq('id', user.id)
                .maybeSingle();
            if (error) throw error;
            const path = data?.rubrica_path || null;
            setRubricaPath(path);
            setSignedUrl(path ? await getSignedDocumentUrl(path) : null);
        } catch (err) {
            console.error('Error cargando rúbrica:', err);
            setRubricaPath(null);
            setSignedUrl(null);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchRubrica(); }, [fetchRubrica]);

    // Sube el PNG (recortado y transparente, generado por RubricaPad) y
    // actualiza profiles.rubrica_path.
    const guardarRubrica = async (blob: Blob): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'No hay sesión activa' };
        try {
            const path = `rubricas/${user.id}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(path, blob, { contentType: 'image/png', upsert: false });
            if (uploadError) throw uploadError;

            const { error: updError } = await supabase
                .from('profiles')
                .update({ rubrica_path: path })
                .eq('id', user.id);
            if (updError) throw updError;

            await fetchRubrica();
            return { success: true };
        } catch (err: any) {
            console.error('Error guardando rúbrica:', err);
            return { success: false, error: err.message || 'No se pudo guardar la rúbrica' };
        }
    };

    return { rubricaPath, signedUrl, loading, tieneRubrica: !!rubricaPath, guardarRubrica, refresh: fetchRubrica };
};

// Obtiene la rúbrica de CUALQUIER usuario (para estampar al firmar), no solo la propia.
export const obtenerRubricaDeUsuario = async (userId: string): Promise<{ path: string | null; bytes: ArrayBuffer | null }> => {
    const { data } = await supabase.from('profiles').select('rubrica_path').eq('id', userId).maybeSingle();
    const path = data?.rubrica_path || null;
    if (!path) return { path: null, bytes: null };
    const signed = await getSignedDocumentUrl(path);
    if (!signed) return { path, bytes: null };
    try {
        const res = await fetch(signed);
        return { path, bytes: await res.arrayBuffer() };
    } catch (err) {
        console.error('Error descargando rúbrica:', err);
        return { path, bytes: null };
    }
};
