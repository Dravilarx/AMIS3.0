import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Alta masiva de cuentas (Admin). Lee los profesionales ELEGIBLES para crearles
// cuenta e invoca la Edge Function `bulk-onboard` (que hace TODO el trabajo
// pesado: clave, cargo, forzado de cambio). El frontend NUNCA crea cuentas ni
// toca el service role: solo elige a quién y muestra los resultados.
//
// Elegible = professionals con is_active=true AND is_deleted!=true AND email de
// formato válido AND SIN cuenta (no existe perfil con ese email).
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Elegible {
    id: string;          // professionals.id
    nombre: string;      // "name last_name"
    email: string;
    rol: string;         // professionals.role (crudo)
}

export interface ResultadoOnboard {
    professionalId: string;
    nombre: string;
    email: string;
    estado: 'creada' | 'omitida' | 'error';
    motivo?: string;
    password?: string;   // solo en las creadas
}

export interface ResumenOnboard {
    creadas: number;
    omitidas: number;
    errores: number;
}

export const useBulkOnboard = () => {
    const [elegibles, setElegibles] = useState<Elegible[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Profesionales activos, no archivados.
            const { data: profs, error: profErr } = await supabase
                .from('professionals')
                .select('id, name, last_name, email, role, is_active, is_deleted')
                .eq('is_active', true)
                .or('is_deleted.is.null,is_deleted.eq.false')
                .order('name', { ascending: true });
            if (profErr) throw profErr;

            // 2. Emails que YA tienen cuenta (perfil). Se descartan.
            const { data: perfiles, error: perfErr } = await supabase
                .from('profiles')
                .select('email');
            if (perfErr) throw perfErr;
            const emailsConCuenta = new Set(
                (perfiles || [])
                    .map((p: any) => (p.email || '').trim().toLowerCase())
                    .filter(Boolean)
            );

            const lista: Elegible[] = (profs || [])
                .map((p: any) => ({
                    id: p.id,
                    nombre: `${p.name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
                    email: (p.email || '').trim(),
                    rol: p.role || '',
                }))
                .filter((e: Elegible) =>
                    EMAIL_RE.test(e.email) &&
                    !emailsConCuenta.has(e.email.toLowerCase())
                );

            setElegibles(lista);
        } catch (err: any) {
            console.error('Error cargando elegibles para alta masiva:', err);
            setError(err?.message || 'No se pudo cargar la lista de profesionales.');
            setElegibles([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    // Invoca la Edge Function con la sesión actual (viaja el JWT del admin).
    const crearTanda = useCallback(async (professionalIds: string[]): Promise<{
        resumen: ResumenOnboard;
        resultados: ResultadoOnboard[];
    }> => {
        const { data, error: fnErr } = await supabase.functions.invoke('bulk-onboard', {
            body: { professionalIds },
        });
        if (fnErr) {
            // El cuerpo de error de la función (403/400/500) suele traer { error }.
            let msg = fnErr.message || 'No se pudo completar el alta masiva.';
            try {
                const ctx = (fnErr as any)?.context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    if (body?.error) msg = body.error;
                }
            } catch { /* se queda con el mensaje genérico */ }
            throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        return {
            resumen: data?.resumen || { creadas: 0, omitidas: 0, errores: 0 },
            resultados: Array.isArray(data?.resultados) ? data.resultados : [],
        };
    }, []);

    // Quita del listado a los profesionales que ya quedaron con cuenta (creada).
    const quitarElegibles = useCallback((ids: string[]) => {
        const set = new Set(ids);
        setElegibles(prev => prev.filter(e => !set.has(e.id)));
    }, []);

    return { elegibles, loading, error, recargar: cargar, crearTanda, quitarElegibles };
};
