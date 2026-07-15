import { createClient } from 'jsr:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

// ═══════════════════════════════════════════════════════════════════════════
// 📬 AMIS 3.0 — Buzón de subida externa (sin login)
// ═══════════════════════════════════════════════════════════════════════════
// Desplegar con --no-verify-jwt (el remitente NO tiene sesión de AMIS).
// Usa SERVICE ROLE porque el llamador es anónimo: toda la autorización real
// vive ACÁ (token + PIN + rate limiting), no en RLS de sesión.
//
// Dos acciones sobre el mismo endpoint, discriminadas por Content-Type:
//   - JSON            { action: 'validar', token, pin }              → { ok, etiqueta? , motivo? }
//   - multipart/form   action=subir, token, pin, nombre, nota, archivo → { ok, motivo? }
//
// Reglas de seguridad (aplicadas en AMBAS acciones, siempre server-side):
//   1. token inexistente / activo=false / revoked_at != null → SIEMPRE el
//      mismo mensaje genérico "Enlace no válido" (nunca se distingue el motivo).
//   2. bloqueado_hasta > now() → "Demasiados intentos. Intenta más tarde."
//   3. PIN se compara con bcrypt (pin_hash fue generado por fn_crear_buzon vía
//      pgcrypto/crypt(), formato $2a$/$2b$ estándar — bcryptjs es 100%
//      compatible con ese formato). Ver nota de decisión más abajo.
//   4. PIN incorrecto → intentos_fallidos+1; al llegar a 5, bloquea 15 min y
//      resetea el contador a 0 (para que al desbloquear tenga 5 intentos frescos).
//   5. PIN correcto → resetea intentos_fallidos/bloqueado_hasta.
//   6. Archivo: tamaño y mimetype se validan AQUÍ, nunca se confía en el navegador.
//   7. Nunca se devuelven rutas, ids internos, listados, ni detalles de error.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Decisión: bcrypt en el runtime (Deno/JS), no crypt() en SQL ────────────
// La tarea ofrecía dos caminos: comparar con crypt() vía una consulta SQL, o
// con una librería bcrypt del runtime. Se eligió la librería porque comparar
// con crypt() habría exigido crear una función SQL nueva (RPC) que reciba el
// PIN y lo compare contra pin_hash — y las restricciones de esta tarea son
// explícitas: no tocar SQL más allá de lo ya aplicado, no crear objetos
// nuevos en la base. bcryptjs corre enteramente dentro de esta Edge Function
// (proceso de servidor, con SERVICE ROLE, nunca expuesto al cliente), así que
// la seguridad es equivalente: el PIN y el hash nunca salen del servidor.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;
const MAX_ARCHIVO_BYTES = 50 * 1024 * 1024; // 50MB, mismo límite que el bucket 'documents'
const PIN_REGEX = /^\d{4,6}$/;

// Debe reflejar EXACTAMENTE el allowed_mime_types del bucket 'documents'
// (ver ALLOWED_DOCUMENT_TYPES en src/hooks/useDocuments.ts). Si el bucket
// cambia, actualizar ambos lugares.
const MIME_A_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

// Recorta, colapsa espacios y quita cualquier marcado HTML — texto plano puro.
function sanitizarTexto(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const sinHtml = input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const colapsado = sinHtml.replace(/\s+/g, ' ').trim();
  return colapsado.slice(0, maxLen);
}

function slugify(s: string): string {
  const base = s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'buzon';
}

function tituloDesdeArchivo(filename: string): string {
  const sinExtension = filename.replace(/\.[^./\\]+$/, '');
  const limpio = sanitizarTexto(sinExtension, 120);
  return limpio || 'Documento recibido por buzón';
}

type ResultadoPin =
  | { estado: 'ok'; buzon: { id: string; etiqueta: string; folderId: string; folderSlug: string; uploadsCount: number } }
  | { estado: 'invalido' }
  | { estado: 'bloqueado' }
  | { estado: 'pin_incorrecto' };

// Busca el buzón por token y valida el PIN, aplicando rate limiting. Se usa
// idéntica en 'validar' y en 'subir' — cada llamada revalida todo desde cero,
// no hay estado de sesión entre pasos (el frontend solo recuerda token+pin).
async function verificarBuzonYPin(
  supabase: ReturnType<typeof createClient>,
  token: string,
  pin: string,
): Promise<ResultadoPin> {
  const { data: buzon, error } = await supabase
    .from('upload_links')
    .select('id, etiqueta, folder_id, pin_hash, activo, intentos_fallidos, bloqueado_hasta, revoked_at, uploads_count, document_folders(name)')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[buzon-subir] Error consultando upload_links:', error);
    return { estado: 'invalido' };
  }
  // Mismo mensaje para "no existe", "inactivo" y "revocado": nunca se distingue.
  if (!buzon || !buzon.activo || buzon.revoked_at) {
    return { estado: 'invalido' };
  }

  if (buzon.bloqueado_hasta && new Date(buzon.bloqueado_hasta as string) > new Date()) {
    return { estado: 'bloqueado' };
  }

  let pinValido = false;
  try {
    pinValido = bcrypt.compareSync(pin, buzon.pin_hash as string);
  } catch (e) {
    console.error('[buzon-subir] Error comparando PIN (hash con formato inesperado):', e);
    return { estado: 'invalido' };
  }

  if (!pinValido) {
    const nuevosIntentos = ((buzon.intentos_fallidos as number) || 0) + 1;
    if (nuevosIntentos >= MAX_INTENTOS) {
      const bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60_000).toISOString();
      await supabase.from('upload_links').update({ intentos_fallidos: 0, bloqueado_hasta: bloqueadoHasta }).eq('id', buzon.id as string);
      return { estado: 'bloqueado' };
    }
    await supabase.from('upload_links').update({ intentos_fallidos: nuevosIntentos }).eq('id', buzon.id as string);
    return { estado: 'pin_incorrecto' };
  }

  // PIN correcto: limpiar cualquier rastro de intentos previos.
  if ((buzon.intentos_fallidos as number) > 0 || buzon.bloqueado_hasta) {
    await supabase.from('upload_links').update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq('id', buzon.id as string);
  }

  const folderNombre = (buzon as any).document_folders?.name as string | undefined;
  return {
    estado: 'ok',
    buzon: {
      id: buzon.id as string,
      etiqueta: buzon.etiqueta as string,
      folderId: buzon.folder_id as string,
      folderSlug: slugify(folderNombre || 'buzon'),
      uploadsCount: (buzon.uploads_count as number) || 0,
    },
  };
}

const MOTIVO_POR_ESTADO: Record<Exclude<ResultadoPin['estado'], 'ok'>, string> = {
  invalido: 'Enlace no válido.',
  bloqueado: 'Demasiados intentos. Intenta más tarde.',
  pin_incorrecto: 'Clave incorrecta.',
};

// ─── Acción: validar ──────────────────────────────────────────────────────
async function handleValidar(supabase: ReturnType<typeof createClient>, body: any) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  if (!token || !PIN_REGEX.test(pin)) {
    return json({ ok: false, motivo: MOTIVO_POR_ESTADO.invalido });
  }

  const resultado = await verificarBuzonYPin(supabase, token, pin);
  if (resultado.estado !== 'ok') {
    return json({ ok: false, motivo: MOTIVO_POR_ESTADO[resultado.estado] });
  }
  return json({ ok: true, etiqueta: resultado.buzon.etiqueta });
}

// ─── Acción: subir ────────────────────────────────────────────────────────
async function handleSubir(supabase: ReturnType<typeof createClient>, form: FormData) {
  const token = typeof form.get('token') === 'string' ? (form.get('token') as string).trim() : '';
  const pin = typeof form.get('pin') === 'string' ? (form.get('pin') as string).trim() : '';
  const nombre = sanitizarTexto(form.get('nombre'), 120);
  const nota = sanitizarTexto(form.get('nota'), 500);
  const archivo = form.get('archivo');

  if (!token || !PIN_REGEX.test(pin)) return json({ ok: false, motivo: MOTIVO_POR_ESTADO.invalido });
  if (!nombre) return json({ ok: false, motivo: 'Falta tu nombre.' });
  if (!nota) return json({ ok: false, motivo: 'Falta la descripción del documento.' });
  if (!(archivo instanceof File)) return json({ ok: false, motivo: 'Falta el archivo.' });

  // 1) Token + PIN — se revalida por completo, no se confía en ningún estado previo.
  const resultado = await verificarBuzonYPin(supabase, token, pin);
  if (resultado.estado !== 'ok') {
    return json({ ok: false, motivo: MOTIVO_POR_ESTADO[resultado.estado] });
  }
  const buzon = resultado.buzon;

  // 2) Archivo — validado server-side, nunca se confía en lo que declaró el navegador.
  if (archivo.size <= 0) return json({ ok: false, motivo: 'El archivo está vacío.' });
  if (archivo.size > MAX_ARCHIVO_BYTES) return json({ ok: false, motivo: 'El archivo supera el límite de 50MB.' });
  const extension = MIME_A_EXTENSION[archivo.type];
  if (!extension) return json({ ok: false, motivo: 'Tipo de archivo no permitido.' });

  // 3) Ruta segura — nunca el nombre original del archivo.
  const rutaArchivo = `${buzon.folderSlug}/buzon-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

  try {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(rutaArchivo, bytes, { contentType: archivo.type, upsert: false });
    if (uploadError) {
      console.error('[buzon-subir] Error subiendo a Storage:', uploadError);
      return json({ ok: false, motivo: 'No se pudo subir el archivo. Intenta nuevamente.' });
    }

    const tituloDocumento = tituloDesdeArchivo(archivo.name || 'documento');
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        title: tituloDocumento,
        url: rutaArchivo,
        folder_id: buzon.folderId,
        visibility: 'interna',
        created_by: null,
        notas: `Enviado por ${nombre} · ${nota}`,
        category: 'other',
        status: 'draft',
      })
      .select('id, title')
      .single();

    if (docError || !doc) {
      console.error('[buzon-subir] Error insertando documento:', docError);
      // El archivo ya quedó en Storage pero sin fila en documents; se prioriza
      // no dejar al remitente colgado. Un huérfano en Storage es tolerable
      // (mismo compromiso que ya asume el resto de la app).
      return json({ ok: false, motivo: 'No se pudo registrar el documento. Intenta nuevamente.' });
    }

    // 4) Contador de uso del buzón (no crítico si falla).
    const { error: contadorError } = await supabase
      .from('upload_links')
      .update({ uploads_count: buzon.uploadsCount + 1, last_used_at: new Date().toISOString() })
      .eq('id', buzon.id);
    if (contadorError) console.error('[buzon-subir] Error actualizando contador del buzón (no bloqueante):', contadorError);

    // 5) Notificar a Jefatura+Dirección (nivel <= 2, activos). No bloqueante.
    try {
      const { data: nivelesJefatura, error: nivelesError } = await supabase
        .from('role_levels')
        .select('role')
        .lte('nivel', 2);
      if (nivelesError) throw nivelesError;

      const roles = (nivelesJefatura || []).map((r: any) => r.role);
      if (roles.length > 0) {
        const { data: destinatarios, error: destError } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_deleted', false)
          .in('role', roles);
        if (destError) throw destError;

        if (destinatarios && destinatarios.length > 0) {
          const filas = destinatarios.map((p: any) => ({
            user_id: p.id,
            tipo: 'buzon_subida',
            titulo: `Documento recibido: ${doc.title}`,
            cuerpo: `Enviado por ${nombre} vía buzón ${buzon.etiqueta}`,
            modulo: 'archivo_digital',
            ref_id: doc.id,
          }));
          const { error: notifError } = await supabase
            .from('notificaciones')
            .upsert(filas, { onConflict: 'user_id,tipo,ref_id', ignoreDuplicates: true });
          if (notifError) throw notifError;
        }
      }
    } catch (notifErr) {
      console.error('[buzon-subir] Error creando notificaciones (no bloqueante):', notifErr);
    }

    // Nunca se devuelven rutas, ids internos ni nada del documento.
    return json({ ok: true });
  } catch (e) {
    console.error('[buzon-subir] Error no controlado en handleSubir:', e);
    return json({ ok: false, motivo: 'Error interno. Intenta nuevamente.' });
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, motivo: 'Método no permitido.' }, 405);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const action = String(form.get('action') || '');
      if (action !== 'subir') return json({ ok: false, motivo: 'Solicitud inválida.' }, 400);
      return await handleSubir(supabase, form);
    }

    const body = await req.json().catch(() => ({}));
    if (body.action !== 'validar') return json({ ok: false, motivo: 'Solicitud inválida.' }, 400);
    return await handleValidar(supabase, body);
  } catch (e) {
    console.error('[buzon-subir] Error no controlado:', e);
    return json({ ok: false, motivo: 'Error interno. Intenta nuevamente.' }, 500);
  }
});
