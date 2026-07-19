import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Lista liviana de profesionales (id + nombre) para los selectores/filtro del
// Archivo Digital y para resolver el nombre del profesional vinculado a un
// documento (documents.professional_id → professionals.id). NO carga contratos
// ni el resto del expediente (a diferencia de useProfessionals): solo lo justo.
// Incluye activos e inactivos (todo el listado), excluye archivados (is_deleted).

export interface ProfesionalLite {
    id: string;
    nombre: string;      // "name last_name"
    activo: boolean;
}

export const useProfessionalsLite = () => {
    const [profesionales, setProfesionales] = useState<ProfesionalLite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('professionals')
                    .select('id, name, last_name, is_active, is_deleted')
                    .or('is_deleted.is.null,is_deleted.eq.false')
                    .order('name', { ascending: true });
                if (error) throw error;
                if (cancelado) return;
                setProfesionales((data || []).map((p: any) => ({
                    id: p.id,
                    nombre: `${p.name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
                    activo: p.is_active !== false,
                })));
            } catch (err) {
                console.error('Error cargando lista de profesionales:', err);
                if (!cancelado) setProfesionales([]);
            } finally {
                if (!cancelado) setLoading(false);
            }
        })();
        return () => { cancelado = true; };
    }, []);

    return { profesionales, loading };
};
