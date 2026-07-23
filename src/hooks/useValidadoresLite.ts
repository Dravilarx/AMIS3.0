import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Lista liviana de RADIÓLOGOS VALIDADORES (professionals.es_validador = true,
// activos) para el selector de asignación en la bandeja de la secretaria. Solo
// lectura, solo lo justo: id, nombre y especialidad. NO trae no-validadores.
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidadorLite {
    id: string;
    nombre: string;          // "name last_name"
    specialty: string | null;
}

export const useValidadoresLite = () => {
    const [validadores, setValidadores] = useState<ValidadorLite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('professionals')
                    .select('id, name, last_name, specialty')
                    .eq('es_validador', true)
                    .eq('is_active', true)
                    .order('name', { ascending: true });
                if (error) throw error;
                if (cancelado) return;
                setValidadores((data || []).map((p: any) => ({
                    id: p.id,
                    nombre: `${p.name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
                    specialty: p.specialty ?? null,
                })));
            } catch (err) {
                console.error('Error cargando radiólogos validadores:', err);
                if (!cancelado) setValidadores([]);
            } finally {
                if (!cancelado) setLoading(false);
            }
        })();
        return () => { cancelado = true; };
    }, []);

    return { validadores, loading };
};
