import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isRlsError } from './useDocuments';

// Hoja de Vida (RRHH): bitácora de anotaciones por persona. persona_id es un
// professionals.id (los 177 profesionales), NO una cuenta de login de profiles.
// El nombre de la persona llega por props desde el módulo — este hook nunca lo
// busca en profiles. autor_id / anulada_por / anulada_at los fija el servidor
// (triggers); autor y anulador se resuelven por profiles_publicos (cuentas de
// AMIS). Reglas impuestas por la BD, el frontend solo las refleja: el texto es
// INMUTABLE (no hay edición), no hay borrado. Corregir = nota aclaratoria nueva;
// invalidar = anular con motivo.

export type TipoNota = 'positiva' | 'negativa' | 'neutra';

export interface HojaVidaNota {
    id: string;
    personaId: string;
    autorId: string;
    autorNombre: string;
    tipo: TipoNota;
    texto: string;
    aclaraAId: string | null;
    anulada: boolean;
    anuladaPor: string | null;
    anuladaPorNombre: string | null;
    anuladaAt: string | null;
    motivoAnulacion: string | null;
    createdAt: string;
    // Aclaratorias enganchadas a esta nota (solo se rellena en las de 1er nivel).
    aclaratorias: HojaVidaNota[];
}

type Resultado = { success: boolean; error?: string; rls?: boolean };

const mapRow = (r: any, nombresPorId: Map<string, string>): HojaVidaNota => ({
    id: r.id,
    personaId: r.persona_id,
    autorId: r.autor_id,
    autorNombre: nombresPorId.get(r.autor_id) || 'Usuario desconocido',
    tipo: r.tipo,
    texto: r.texto,
    aclaraAId: r.aclara_a_id,
    anulada: r.anulada,
    anuladaPor: r.anulada_por,
    anuladaPorNombre: r.anulada_por ? (nombresPorId.get(r.anulada_por) || 'Usuario desconocido') : null,
    anuladaAt: r.anulada_at,
    motivoAnulacion: r.motivo_anulacion,
    createdAt: r.created_at,
    aclaratorias: [],
});

// Resuelve id → full_name vía profiles_publicos (sin exponer rut/email de
// terceros). Mismo patrón que useFirma.resolverNombres.
const resolverNombres = async (ids: string[]): Promise<Map<string, string>> => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return new Map();
    const { data } = await supabase.from('profiles_publicos').select('id, full_name').in('id', unique);
    return new Map((data || []).map((p: any) => [p.id, p.full_name]));
};

export const useHojaVida = (personaId: string | null) => {
    const [notas, setNotas] = useState<HojaVidaNota[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotas = useCallback(async () => {
        if (!personaId) { setNotas([]); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('rrhh_hoja_vida_notas')
                .select('*')
                .eq('persona_id', personaId)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const filas = data || [];
            const nombresPorId = await resolverNombres(filas.flatMap((r: any) => [r.autor_id, r.anulada_por]));
            const mapeadas = filas.map((r: any) => mapRow(r, nombresPorId));

            // Enganchar aclaratorias bajo su nota de primer nivel. Las aclaratorias
            // se muestran de la más antigua a la más nueva (orden cronológico de lectura).
            const porId = new Map(mapeadas.map(n => [n.id, n]));
            const primerNivel: HojaVidaNota[] = [];
            for (const n of mapeadas) {
                if (n.aclaraAId && porId.has(n.aclaraAId)) {
                    porId.get(n.aclaraAId)!.aclaratorias.push(n);
                } else if (!n.aclaraAId) {
                    primerNivel.push(n);
                }
                // Si aclara_a_id apunta a una nota fuera de este set (no debería pasar
                // dentro de la misma persona), se ignora para no perderla como suelta.
            }
            primerNivel.forEach(n => n.aclaratorias.reverse());
            setNotas(primerNivel);
        } catch (err: any) {
            console.error('Error cargando hoja de vida:', err);
            setError(err.message || 'No se pudo cargar la hoja de vida');
            setNotas([]);
        } finally {
            setLoading(false);
        }
    }, [personaId]);

    useEffect(() => { fetchNotas(); }, [fetchNotas]);

    // INSERT — nunca se envía autor_id (lo fija un trigger con el usuario actual).
    const crearNota = async (params: { personaId: string; tipo: TipoNota; texto: string; aclaraAId?: string | null }): Promise<Resultado> => {
        try {
            if (!params.texto.trim()) return { success: false, error: 'El texto es obligatorio' };
            const { error } = await supabase.from('rrhh_hoja_vida_notas').insert({
                persona_id: params.personaId,
                tipo: params.tipo,
                texto: params.texto.trim(),
                aclara_a_id: params.aclaraAId ?? null,
            });
            if (error) throw error;
            await fetchNotas();
            return { success: true };
        } catch (err: any) {
            console.error('Error creando nota de hoja de vida:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    // ANULAR — UPDATE anulada=true + motivo. anulada_por/anulada_at los fija el
    // servidor. El texto no se toca (inmutable).
    const anularNota = async (id: string, motivo: string): Promise<Resultado> => {
        try {
            if (!motivo.trim()) return { success: false, error: 'El motivo es obligatorio' };
            const { error } = await supabase
                .from('rrhh_hoja_vida_notas')
                .update({ anulada: true, motivo_anulacion: motivo.trim() })
                .eq('id', id);
            if (error) throw error;
            await fetchNotas();
            return { success: true };
        } catch (err: any) {
            console.error('Error anulando nota de hoja de vida:', err);
            return { success: false, error: err.message, rls: isRlsError(err) };
        }
    };

    return { notas, loading, error, refresh: fetchNotas, crearNota, anularNota };
};
