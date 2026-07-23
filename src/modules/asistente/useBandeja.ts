import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type EstadoMensaje = 'nuevo' | 'tomado' | 'respondido' | 'cerrado' | 'reabierto';
export type TipoMensaje = 'consulta' | 'adendum' | 'doble_opinion' | 'correccion' | 'examen_pendiente';

export interface RespuestaRow {
    id: string;
    creadaAt: string;
    autorMostrado: string | null;
    respondidoPor: string | null;
    respondidoPorNombre: string | null; // resuelto vía profiles_publicos, client-side
    texto: string;
}

export interface MensajeRow {
    id: string;
    tenantId: string;
    institutionId: string;
    origen: string;
    direccion: string;
    externalDoctorId: string | null;
    tipo: TipoMensaje;
    referenciaPaciente: string | null;
    radiologoCaso: string | null;
    radiologoSugerido: string | null;
    dirigidoA: string | null;
    urgente: boolean;
    texto: string;
    estado: EstadoMensaje;
    tomadoPor: string | null;
    tomadoAt: string | null;
    creadoAt: string;
    actualizadoAt: string;
    medico: { name: string; lastName: string; specialty: string | null; hospitalName: string | null } | null;
    centro: { legalName: string; commercialName: string | null } | null;
    respuestas: RespuestaRow[];
}

const POLL_MS = 30_000;

// Resuelve el nombre a mostrar como autor de una respuesta interna.
const resolverAutorMostrado = async (mensajeId: string): Promise<string> => {
    const { data: msg } = await supabase
        .from('comm_mensajes')
        .select('radiologo_caso, centro:institutions(legal_name, commercial_name)')
        .eq('id', mensajeId)
        .maybeSingle();

    if (!msg) return 'Equipo Radiología';

    if (msg.radiologo_caso) {
        const { data: prof } = await supabase
            .from('professionals')
            .select('name, last_name, public_name_allowed, supervisor_id')
            .eq('id', msg.radiologo_caso)
            .maybeSingle();

        if (prof?.public_name_allowed) {
            return `${prof.name} ${prof.last_name}`.trim();
        }
        if (prof?.supervisor_id) {
            const { data: sup } = await supabase
                .from('professionals')
                .select('name, last_name')
                .eq('id', prof.supervisor_id)
                .maybeSingle();
            if (sup) return `${sup.name} ${sup.last_name}`.trim();
        }
        return 'Equipo Radiología';
    }

    const centro: any = msg.centro;
    const nombreCentro = centro?.commercial_name || centro?.legal_name || '';
    return `Equipo Radiología ${nombreCentro}`.trim();
};

export const useBandeja = () => {
    const [mensajes, setMensajes] = useState<MensajeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMensajes = useCallback(async () => {
        try {
            setError(null);
            const { data, error: fetchErr } = await supabase
                .from('comm_mensajes')
                .select(`
                    id, tenant_id, institution_id, origen, direccion, external_doctor_id, tipo,
                    referencia_paciente, radiologo_caso, radiologo_sugerido, dirigido_a, urgente, texto, estado,
                    tomado_por, tomado_at, creado_at, actualizado_at,
                    medico:external_doctors(name, last_name, specialty, hospital_name),
                    centro:institutions(legal_name, commercial_name),
                    respuestas:comm_respuestas(id, creado_at, autor_mostrado, respondido_por, texto)
                `)
                .order('urgente', { ascending: false })
                .order('creado_at', { ascending: false })
                .limit(100);

            if (fetchErr) throw fetchErr;

            const rows = data || [];

            // Resuelve respondido_por → nombre en un solo query batched (mismo
            // patrón que el resto del proyecto: profiles_publicos, sin datos sensibles).
            const responderIds = Array.from(new Set(
                rows.flatMap((r: any) => (r.respuestas || []).map((x: any) => x.respondido_por)).filter(Boolean)
            ));
            let nombresPorId = new Map<string, string>();
            if (responderIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles_publicos')
                    .select('id, full_name')
                    .in('id', responderIds);
                nombresPorId = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
            }

            setMensajes(rows.map((r: any) => ({
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
                    .map((x: any) => ({
                        id: x.id,
                        creadaAt: x.creado_at,
                        autorMostrado: x.autor_mostrado,
                        respondidoPor: x.respondido_por,
                        respondidoPorNombre: x.respondido_por ? (nombresPorId.get(x.respondido_por) || 'Usuario desconocido') : null,
                        texto: x.texto,
                    }))
                    .sort((a: RespuestaRow, b: RespuestaRow) => a.creadaAt.localeCompare(b.creadaAt)),
            })));
        } catch (err: any) {
            console.error('Error cargando bandeja de mensajes:', err);
            setError(err.message || 'Error cargando la bandeja de mensajes');
        } finally {
            setLoading(false);
        }
    }, []);

    // Realtime (si el proyecto lo tiene habilitado para comm_mensajes) + polling
    // cada 30s como respaldo, con cleanup de ambos al desmontar.
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        fetchMensajes();

        const channel = supabase
            .channel('comm_mensajes_bandeja')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comm_mensajes' }, () => fetchMensajes())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comm_mensajes' }, () => fetchMensajes())
            .subscribe();

        pollRef.current = setInterval(fetchMensajes, POLL_MS);

        return () => {
            supabase.removeChannel(channel);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchMensajes]);

    // Toma un mensaje 'nuevo' (o 'reabierto'). La condición de estado en el WHERE
    // evita que dos personas lo tomen a la vez; si no matchea ninguna fila,
    // significa que otro usuario ya se adelantó.
    const tomarMensaje = async (id: string, estadoActual: EstadoMensaje) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error: updErr } = await supabase
                .from('comm_mensajes')
                .update({ estado: 'tomado', tomado_por: user?.id ?? null, tomado_at: new Date().toISOString() })
                .eq('id', id)
                .eq('estado', estadoActual)
                .select('id, tenant_id');

            if (updErr) throw updErr;

            if (!data || data.length === 0) {
                await fetchMensajes();
                return { success: false, otroUsuario: true, error: 'Otro usuario ya lo tomó' };
            }

            await supabase.from('comm_eventos').insert({
                tenant_id: data[0].tenant_id,
                mensaje_id: id,
                tipo: 'mensaje_tomado',
                actor: user?.id ?? null,
                payload: {},
            });

            await fetchMensajes();
            return { success: true };
        } catch (err: any) {
            console.error('Error tomando mensaje:', err);
            return { success: false, error: err.message || 'Error al tomar el mensaje' };
        }
    };

    const responderMensaje = async (id: string, texto: string) => {
        try {
            const t = texto.trim();
            if (!t) return { success: false, error: 'El texto de la respuesta no puede estar vacío' };

            const { data: msg, error: msgErr } = await supabase
                .from('comm_mensajes')
                .select('tenant_id')
                .eq('id', id)
                .single();
            if (msgErr) throw msgErr;

            const { data: { user } } = await supabase.auth.getUser();
            const autorMostrado = await resolverAutorMostrado(id);

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

            await fetchMensajes();
            return { success: true };
        } catch (err: any) {
            console.error('Error respondiendo mensaje:', err);
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

            await fetchMensajes();
            return { success: true };
        } catch (err: any) {
            console.error(`Error cambiando estado a ${nuevoEstado}:`, err);
            return { success: false, error: err.message || 'Error al actualizar el estado' };
        }
    };

    const cerrarMensaje = (id: string) => cambiarEstado(id, 'cerrado', 'mensaje_cerrado');
    const reabrirMensaje = (id: string) => cambiarEstado(id, 'reabierto', 'mensaje_reabierto');

    // ── Asignación de radiólogo (torre de control de la secretaria) ────────────
    // Helper genérico: escribe un campo de asignación, registra evento y refresca.
    // NUNCA toca el estado del caso: la secretaria conserva el control y puede
    // seguir respondiendo aunque haya "pasado la pelota".
    const asignarCampo = async (
        id: string,
        campo: 'radiologo_caso' | 'radiologo_sugerido',
        radiologoId: string | null,
        tipoEvento: string,
    ) => {
        try {
            const { data: msg, error: updErr } = await supabase
                .from('comm_mensajes')
                .update({ [campo]: radiologoId, actualizado_at: new Date().toISOString() })
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
                payload: { campo, radiologo: radiologoId },
            });

            await fetchMensajes();
            return { success: true };
        } catch (err: any) {
            console.error(`Error en asignación (${tipoEvento}):`, err);
            return { success: false, error: err.message || 'No se pudo actualizar la asignación' };
        }
    };

    // Sugerir un radiólogo como referencia (la secretaria sigue a cargo).
    const sugerirRadiologo = (id: string, radiologoId: string) =>
        asignarCampo(id, 'radiologo_sugerido', radiologoId, 'radiologo_sugerido');
    // Pasar la pelota: el radiólogo queda como responsable (aparece en su bandeja).
    const pasarPelota = (id: string, radiologoId: string) =>
        asignarCampo(id, 'radiologo_caso', radiologoId, 'pelota_pasada');
    // Quitar sugerido / responsable (vuelve a la secretaria).
    const quitarSugerido = (id: string) =>
        asignarCampo(id, 'radiologo_sugerido', null, 'asignacion_quitada');
    const quitarResponsable = (id: string) =>
        asignarCampo(id, 'radiologo_caso', null, 'asignacion_quitada');

    return {
        mensajes,
        loading,
        error,
        tomarMensaje,
        responderMensaje,
        cerrarMensaje,
        reabrirMensaje,
        sugerirRadiologo,
        pasarPelota,
        quitarSugerido,
        quitarResponsable,
        refresh: fetchMensajes,
    };
};
