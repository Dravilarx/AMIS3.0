import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { MensajeRow, EstadoMensaje, RespuestaRow } from './useBandeja';

// ─────────────────────────────────────────────────────────────────────────────
// "Mi bandeja" — bandeja del RADIÓLOGO. Es una VISTA FILTRADA para él (no la
// torre de control de la secretaria: esa la maneja useBandeja y ve TODO). Aquí
// solo se ven sus casos asignados y la fila general que puede tomar.
//
// Solo aplica a usuarios cuyo profiles.professional_id NO es null. Si es null,
// elegible=false y el dashboard no muestra la pestaña.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 30_000;

// Estados que cuentan como "asignados a mí" (grupo A).
const ESTADOS_ASIGNADOS: EstadoMensaje[] = ['nuevo', 'tomado', 'respondido', 'reabierto'];

const SELECT_CASO = `
    id, tenant_id, institution_id, origen, direccion, external_doctor_id, tipo,
    referencia_paciente, radiologo_caso, radiologo_sugerido, dirigido_a, urgente, texto, estado,
    tomado_por, tomado_at, creado_at, actualizado_at,
    medico:external_doctors(name, last_name, specialty, hospital_name),
    centro:institutions(legal_name, commercial_name),
    respuestas:comm_respuestas(id, creado_at, autor_mostrado, respondido_por, texto)
`;

// Mapea una fila cruda al MensajeRow (mismo shape que la bandeja de secretaria).
const mapRow = (r: any, nombresPorId: Map<string, string>): MensajeRow => ({
    id: r.id,
    tenantId: r.tenant_id,
    institutionId: r.institution_id,
    origen: r.origen,
    direccion: r.direccion,
    externalDoctorId: r.external_doctor_id,
    tipo: r.tipo,
    referenciaPaciente: r.referencia_paciente,
    radiologoCaso: r.radiologo_caso,
    radiologoSugerido: r.radiologo_sugerido,
    dirigidoA: r.dirigido_a,
    urgente: r.urgente,
    texto: r.texto,
    estado: r.estado,
    tomadoPor: r.tomado_por,
    tomadoAt: r.tomado_at,
    creadoAt: r.creado_at,
    actualizadoAt: r.actualizado_at,
    medico: r.medico ? {
        name: r.medico.name,
        lastName: r.medico.last_name,
        specialty: r.medico.specialty,
        hospitalName: r.medico.hospital_name,
    } : null,
    centro: r.centro ? {
        legalName: r.centro.legal_name,
        commercialName: r.centro.commercial_name,
    } : null,
    respuestas: (r.respuestas || [])
        .map((x: any): RespuestaRow => ({
            id: x.id,
            creadaAt: x.creado_at,
            autorMostrado: x.autor_mostrado,
            respondidoPor: x.respondido_por,
            respondidoPorNombre: x.respondido_por ? (nombresPorId.get(x.respondido_por) || 'Usuario desconocido') : null,
            texto: x.texto,
        }))
        .sort((a: RespuestaRow, b: RespuestaRow) => a.creadaAt.localeCompare(b.creadaAt)),
});

// Resuelve respondido_por → nombre (profiles_publicos), batched para ambos grupos.
const resolverNombres = async (rows: any[]): Promise<Map<string, string>> => {
    const ids = Array.from(new Set(
        rows.flatMap((r: any) => (r.respuestas || []).map((x: any) => x.respondido_por)).filter(Boolean)
    ));
    if (ids.length === 0) return new Map();
    const { data: profs } = await supabase
        .from('profiles_publicos')
        .select('id, full_name')
        .in('id', ids);
    return new Map((profs || []).map((p: any) => [p.id, p.full_name]));
};

export const useMiBandeja = () => {
    const [miProfessionalId, setMiProfessionalId] = useState<string | null>(null);
    const [elegible, setElegible] = useState<boolean | null>(null); // null = aún cargando el perfil
    const [asignados, setAsignados] = useState<MensajeRow[]>([]);
    const [filaGeneral, setFilaGeneral] = useState<MensajeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // professional_id del perfil actual (por auth.uid()).
    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { if (!cancelado) { setElegible(false); setLoading(false); } return; }
                const { data: perfil, error: perfilErr } = await supabase
                    .from('profiles')
                    .select('professional_id')
                    .eq('id', user.id)
                    .maybeSingle();
                if (perfilErr) throw perfilErr;
                const pid = perfil?.professional_id ?? null;
                if (cancelado) return;
                setMiProfessionalId(pid);
                setElegible(!!pid);
                if (!pid) setLoading(false);
            } catch (err: any) {
                console.error('Error leyendo professional_id del perfil:', err);
                if (!cancelado) { setElegible(false); setLoading(false); }
            }
        })();
        return () => { cancelado = true; };
    }, []);

    const fetchMisCasos = useCallback(async () => {
        if (!miProfessionalId) return;
        try {
            setError(null);

            // A) Asignados a mí: dirigido_a = yo OR radiologo_caso = yo, en estados vivos.
            const { data: dataA, error: errA } = await supabase
                .from('comm_mensajes')
                .select(SELECT_CASO)
                .or(`dirigido_a.eq.${miProfessionalId},radiologo_caso.eq.${miProfessionalId}`)
                .in('estado', ESTADOS_ASIGNADOS)
                .order('urgente', { ascending: false })
                .order('creado_at', { ascending: false })
                .limit(100);
            if (errA) throw errA;

            // B) Fila general: nuevos sin dueño ni asignación, disponibles para tomar.
            const { data: dataB, error: errB } = await supabase
                .from('comm_mensajes')
                .select(SELECT_CASO)
                .eq('estado', 'nuevo')
                .is('dirigido_a', null)
                .is('radiologo_caso', null)
                .is('tomado_por', null)
                .order('urgente', { ascending: false })
                .order('creado_at', { ascending: false })
                .limit(100);
            if (errB) throw errB;

            const rowsA = dataA || [];
            const rowsB = dataB || [];
            const nombresPorId = await resolverNombres([...rowsA, ...rowsB]);

            setAsignados(rowsA.map((r: any) => mapRow(r, nombresPorId)));
            setFilaGeneral(rowsB.map((r: any) => mapRow(r, nombresPorId)));
        } catch (err: any) {
            console.error('Error cargando mi bandeja:', err);
            setError(err.message || 'Error cargando tu bandeja');
        } finally {
            setLoading(false);
        }
    }, [miProfessionalId]);

    // Polling 30s (sin realtime), con cleanup. Solo si el usuario es elegible.
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!miProfessionalId) return;
        fetchMisCasos();
        pollRef.current = setInterval(fetchMisCasos, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [miProfessionalId, fetchMisCasos]);

    // Tomar un caso de la fila general. El WHERE por estado evita colisiones: si
    // no matchea ninguna fila, otro radiólogo/secretaria se adelantó.
    const tomarCaso = async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error: updErr } = await supabase
                .from('comm_mensajes')
                .update({
                    estado: 'tomado',
                    tomado_por: user?.id ?? null,
                    tomado_at: new Date().toISOString(),
                    radiologo_caso: miProfessionalId,
                })
                .eq('id', id)
                .in('estado', ['nuevo', 'reabierto'])
                .select('id, tenant_id');
            if (updErr) throw updErr;

            if (!data || data.length === 0) {
                await fetchMisCasos();
                return { success: false, otroUsuario: true, error: 'Otro ya lo tomó' };
            }

            await supabase.from('comm_eventos').insert({
                tenant_id: data[0].tenant_id,
                mensaje_id: id,
                tipo: 'radiologo_tomo',
                actor: user?.id ?? null,
                payload: { radiologo_caso: miProfessionalId },
            });

            await fetchMisCasos();
            return { success: true };
        } catch (err: any) {
            console.error('Error tomando caso:', err);
            return { success: false, error: err.message || 'No se pudo tomar el caso' };
        }
    };

    // Responder. El autor_mostrado es SIEMPRE genérico por ahora ('Equipo
    // Radiología <centro>'), aunque el radiólogo sea validador — la exposición
    // del nombre real se activará en otra tarea.
    const responderCaso = async (id: string, texto: string) => {
        try {
            const t = texto.trim();
            if (!t) return { success: false, error: 'El texto de la respuesta no puede estar vacío' };

            const { data: msg, error: msgErr } = await supabase
                .from('comm_mensajes')
                .select('tenant_id, centro:institutions(legal_name, commercial_name)')
                .eq('id', id)
                .single();
            if (msgErr) throw msgErr;

            const centro: any = msg.centro;
            const nombreCentro = centro?.commercial_name || centro?.legal_name || '';
            const autorMostrado = `Equipo Radiología ${nombreCentro}`.trim();

            const { data: { user } } = await supabase.auth.getUser();

            const { error: respErr } = await supabase
                .from('comm_respuestas')
                .insert({
                    mensaje_id: id,
                    tenant_id: msg.tenant_id,
                    respondido_por: user?.id ?? null,
                    texto: t,
                    autor_mostrado: autorMostrado,
                });
            if (respErr) throw respErr;

            const { error: updErr } = await supabase
                .from('comm_mensajes')
                .update({ estado: 'respondido', actualizado_at: new Date().toISOString() })
                .eq('id', id);
            if (updErr) throw updErr;

            await supabase.from('comm_eventos').insert({
                tenant_id: msg.tenant_id,
                mensaje_id: id,
                tipo: 'mensaje_respondido',
                actor: user?.id ?? null,
                payload: {},
            });

            await fetchMisCasos();
            return { success: true };
        } catch (err: any) {
            console.error('Error respondiendo caso:', err);
            return { success: false, error: err.message || 'Error al responder' };
        }
    };

    const cambiarEstado = async (id: string, nuevoEstado: 'cerrado' | 'reabierto', tipoEvento: string) => {
        try {
            const { data: msg, error: updErr } = await supabase
                .from('comm_mensajes')
                .update({ estado: nuevoEstado, actualizado_at: new Date().toISOString() })
                .eq('id', id)
                .select('tenant_id')
                .single();
            if (updErr) throw updErr;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('comm_eventos').insert({
                tenant_id: msg.tenant_id,
                mensaje_id: id,
                tipo: tipoEvento,
                actor: user?.id ?? null,
                payload: {},
            });

            await fetchMisCasos();
            return { success: true };
        } catch (err: any) {
            console.error(`Error cambiando estado a ${nuevoEstado}:`, err);
            return { success: false, error: err.message || 'Error al actualizar el estado' };
        }
    };

    const cerrarCaso = (id: string) => cambiarEstado(id, 'cerrado', 'mensaje_cerrado');
    const reabrirCaso = (id: string) => cambiarEstado(id, 'reabierto', 'mensaje_reabierto');

    return {
        miProfessionalId,
        elegible,
        asignados,
        filaGeneral,
        loading,
        error,
        tomarCaso,
        responderCaso,
        cerrarCaso,
        reabrirCaso,
        refresh: fetchMisCasos,
    };
};
