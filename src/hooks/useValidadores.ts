import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de VALIDADORES (professionals.es_validador). La Dirección marca qué
// radiólogos son validadores: solo ellos reciben consultas del médico externo y
// muestran su nombre hacia afuera. Escribe SOLO es_validador (jamás
// public_name_allowed, que es otra cosa). La escritura la autoriza soy_jefatura()
// vía RLS; el cliente autenticado del admin/dirección cumple.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfesionalValidador {
    id: string;
    name: string;
    last_name: string | null;
    email: string | null;
    specialty: string | null;
    clinical_role: string | null;
    es_validador: boolean;
}

export const useValidadores = () => {
    const [profesionales, setProfesionales] = useState<ProfesionalValidador[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('professionals')
                .select('id, name, last_name, email, specialty, clinical_role, es_validador')
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (err) throw err;
            setProfesionales((data || []).map((p: any) => ({
                id: p.id,
                name: p.name || '',
                last_name: p.last_name ?? null,
                email: p.email ?? null,
                specialty: p.specialty ?? null,
                clinical_role: p.clinical_role ?? null,
                es_validador: p.es_validador === true,
            })));
        } catch (e: any) {
            console.error('Error cargando validadores:', e);
            setError(e?.message || 'No se pudo cargar la lista de profesionales.');
            setProfesionales([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    // Marca/desmarca UNO. Update optimista con reversión si falla.
    const marcarValidador = useCallback(async (id: string, valor: boolean): Promise<boolean> => {
        const previo = profesionales;
        setProfesionales(prev => prev.map(p => (p.id === id ? { ...p, es_validador: valor } : p)));
        const { error: err } = await supabase
            .from('professionals')
            .update({ es_validador: valor })
            .eq('id', id);
        if (err) {
            console.error('Error al guardar validador:', err);
            setProfesionales(previo); // revierte
            setError('No se pudo guardar el cambio. Intenta de nuevo.');
            return false;
        }
        return true;
    }, [profesionales]);

    // Marca/desmarca VARIOS de una. Update optimista con reversión si falla.
    const marcarMasivo = useCallback(async (ids: string[], valor: boolean): Promise<boolean> => {
        if (ids.length === 0) return true;
        const set = new Set(ids);
        const previo = profesionales;
        setProfesionales(prev => prev.map(p => (set.has(p.id) ? { ...p, es_validador: valor } : p)));
        const { error: err } = await supabase
            .from('professionals')
            .update({ es_validador: valor })
            .in('id', ids);
        if (err) {
            console.error('Error al guardar validadores (masivo):', err);
            setProfesionales(previo); // revierte
            setError('No se pudieron guardar los cambios. Intenta de nuevo.');
            return false;
        }
        return true;
    }, [profesionales]);

    return { profesionales, loading, error, recargar: cargar, marcarValidador, marcarMasivo };
};
