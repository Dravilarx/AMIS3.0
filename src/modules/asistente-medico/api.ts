// ─────────────────────────────────────────────────────────────────────────────
// Cliente aislado del "Asistente AMIS" (PWA del médico externo, /m/:token).
// Habla SOLO con las Edge Functions comm-* por fetch(), enviando el anon key de
// AMIS en apikey + Authorization (mismo patrón que el Buzón externo). NO importa
// el cliente supabase autenticado ni accede a tablas directamente. Todo el filtro
// de datos internos lo hacen las funciones del backend.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function invocar<T>(fn: string, body: unknown): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(body),
        });
    } catch {
        throw new ApiError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.', 0);
    }
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || (data && data.error)) {
        throw new ApiError((data && data.error) || 'Ocurrió un error. Intenta de nuevo.', res.status);
    }
    return data as T;
}

// ── Tipos de respuesta (lo que exponen las funciones) ────────────────────────
export interface Sesion {
    token_sesion: string;
    medico: string | null;
    centro: string | null;
}

export interface ValidacionSesion {
    valida: boolean;
    external_doctor_id?: string;
    institution_id?: string;
    medico?: string | null;
    centro?: string | null;
    error?: string;
}

export interface RespuestaMensaje {
    texto: string;
    autor: string;   // autor_mostrado (respeta doble firma)
    fecha: string;
}

export interface MensajeMedico {
    id: string;
    tipo: string;
    episodio: string | null;
    urgente: boolean;
    texto: string;
    estado: string;
    respondido: boolean;
    fecha: string;
    respuestas: RespuestaMensaje[];
}

export interface Bandeja {
    total: number;
    respondidos: number;
    pendientes: number;
    mensajes: MensajeMedico[];
}

export interface EnvioResultado {
    enviado: boolean;
    mensaje_id: string;
    creado_at: string;
    fuera_horario: boolean;
    aviso: string | null;
}

// ── Llamadas ─────────────────────────────────────────────────────────────────
export const activarInvitacion = (token: string): Promise<Sesion> =>
    invocar('comm-activar-invitacion', { token, device_info: navigator.userAgent });

export const validarSesion = (token_sesion: string): Promise<ValidacionSesion> =>
    invocar('comm-validar-sesion', { token_sesion });

export const leerMensajes = (token_sesion: string): Promise<Bandeja> =>
    invocar('comm-leer-mensajes', { token_sesion });

export const enviarMensaje = (payload: {
    token_sesion: string;
    tipo: string;
    referencia_paciente: string | null;
    texto: string;
    urgente: boolean;
}): Promise<EnvioResultado> => invocar('comm-enviar-mensaje', payload);
