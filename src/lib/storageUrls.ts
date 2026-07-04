// ─────────────────────────────────────────────────────────────────────────────
// URLs firmadas para el bucket privado "documents".
//
// El bucket "documents" pasa a private=false → private. Todo consumo debe usar
// URLs firmadas (createSignedUrl) en vez de getPublicUrl.
//
// Acepta tanto RUTAS internas ("legal/archivo_123.pdf") como URLs completas
// heredadas (…/object/public/documents/legal/archivo_123.pdf), de modo que los
// registros antiguos siguen funcionando sin migración de datos.
//
// Los buckets "avatars" y "news-images" siguen públicos y NO usan esta utilidad.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const DOCUMENTS_BUCKET = 'documents';

// Extrae la ruta interna del bucket a partir de una URL (pública o firmada) de
// Supabase Storage. Devuelve null si la URL no corresponde al bucket documents.
export function extractDocumentPath(url: string): string | null {
    const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+?)(?:\?|$)/);
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        // Si el decode falla (secuencia inválida), devolver el valor crudo.
        return match[1];
    }
}

// Devuelve una URL firmada para un documento del bucket privado.
// `input` puede ser una ruta interna o una URL completa heredada.
// Nunca lanza: retorna null y loguea con console.warn ante cualquier error.
export async function getSignedDocumentUrl(
    input: string,
    expiresIn = 900
): Promise<string | null> {
    if (!input) return null;

    let path = input;
    if (/^https?:\/\//i.test(input)) {
        const extracted = extractDocumentPath(input);
        if (!extracted) {
            console.warn('getSignedDocumentUrl: la URL no corresponde al bucket documents:', input);
            return null;
        }
        path = extracted;
    }

    try {
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .createSignedUrl(path, expiresIn);
        if (error || !data) {
            console.warn('getSignedDocumentUrl: no se pudo firmar', path, error?.message);
            return null;
        }
        return data.signedUrl;
    } catch (err) {
        console.warn('getSignedDocumentUrl: excepción firmando', path, err);
        return null;
    }
}

// Hook que resuelve de forma asíncrona la URL firmada de un documento.
// { url: null, loading: false } si `input` es null/undefined.
export function useSignedUrl(input: string | null | undefined, expiresIn = 900) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(!!input);

    useEffect(() => {
        let cancelled = false;

        if (!input) {
            setUrl(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        getSignedDocumentUrl(input, expiresIn).then(signed => {
            if (cancelled) return;
            setUrl(signed);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [input, expiresIn]);

    return { url, loading };
}
