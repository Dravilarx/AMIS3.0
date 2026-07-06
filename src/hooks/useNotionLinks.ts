import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isRlsError } from './useDocuments';

// Módulo "Proyectos": páginas de Notion embebidas dentro de AMIS. La tabla
// notion_links ya existe (RLS: SELECT nivel<=2, escritura nivel<=1) — este
// hook solo lee/escribe, no reimplementa esas reglas.
export interface NotionLink {
    id: string;
    nombre: string;
    url: string;
    orden: number;
    createdAt: string;
}

type Resultado = { success: boolean; error?: string; rls?: boolean };

const mapRow = (r: any): NotionLink => ({
    id: r.id,
    nombre: r.nombre,
    url: r.url,
    orden: r.orden,
    createdAt: r.created_at,
});

export const useNotionLinks = () => {
    const [links, setLinks] = useState<NotionLink[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLinks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notion_links')
                .select('id, nombre, url, orden, created_at')
                .order('orden', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            setLinks((data || []).map(mapRow));
        } catch (err) {
            console.error('Error cargando páginas de Notion:', err);
            setLinks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLinks(); }, [fetchLinks]);

    const crearLink = async (nombre: string, url: string): Promise<Resultado> => {
        try {
            const maxOrden = links.reduce((max, l) => Math.max(max, l.orden), 0);
            const { error } = await supabase
                .from('notion_links')
                .insert({ nombre: nombre.trim(), url: url.trim(), orden: maxOrden + 1 });
            if (error) throw error;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error creando página de Notion:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    const actualizarLink = async (id: string, cambios: { nombre?: string; url?: string }): Promise<Resultado> => {
        try {
            const { error } = await supabase.from('notion_links').update(cambios).eq('id', id);
            if (error) throw error;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error actualizando página de Notion:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    const eliminarLink = async (id: string): Promise<Resultado> => {
        try {
            const { error } = await supabase.from('notion_links').delete().eq('id', id);
            if (error) throw error;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error eliminando página de Notion:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    // Reordenar simple: intercambia el valor "orden" con el vecino anterior/siguiente.
    const moverLink = async (id: string, direccion: 'subir' | 'bajar'): Promise<Resultado> => {
        const ordenados = [...links].sort((a, b) => a.orden - b.orden);
        const idx = ordenados.findIndex(l => l.id === id);
        if (idx === -1) return { success: false, error: 'No encontrado' };
        const vecinoIdx = direccion === 'subir' ? idx - 1 : idx + 1;
        if (vecinoIdx < 0 || vecinoIdx >= ordenados.length) return { success: true }; // ya está en el extremo, no-op silencioso

        const actual = ordenados[idx];
        const vecino = ordenados[vecinoIdx];
        try {
            const { error: e1 } = await supabase.from('notion_links').update({ orden: vecino.orden }).eq('id', actual.id);
            if (e1) throw e1;
            const { error: e2 } = await supabase.from('notion_links').update({ orden: actual.orden }).eq('id', vecino.id);
            if (e2) throw e2;
            await fetchLinks();
            return { success: true };
        } catch (err: any) {
            console.error('Error reordenando páginas de Notion:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    return { links, loading, refresh: fetchLinks, crearLink, actualizarLink, eliminarLink, moverLink };
};
