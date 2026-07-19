import { createClient } from 'jsr:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

// AMIS 3.0 - Buzon de subida externa v2 (sin login, SUBIDA DIRECTA)

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
const MAX_ARCHIVO_BYTES = 200 * 1024 * 1024;
const MAX_ARCHIVOS_LOTE = 10;
const PIN_REGEX = /^\d{4,6}$/;
const BUCKET = 'documents';

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

function sanitizarTexto(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const sinHtml = input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const colapsado = sinHtml.replace(/\s+/g, ' ').trim();
  return colapsado.slice(0, maxLen);
}

function slugify(s: string): string {
  const base = s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'buzon';
}

function tituloDesdeArchivo(filename: string): string {
  const sinExtension = String(filename || '').replace(/\.[^./\\]+$/, '');
  const limpio = sanitizarTexto(sinExtension, 120);
  return limpio || 'Documento recibido por buzon';
}

type BuzonInfo = { id: string; etiqueta: string; folderId: string; folderSlug: string; uploadsCount: number; remitenteFijo: string | null };
type ResultadoPin =
  | { estado: 'ok'; buzon: BuzonInfo }
  | { estado: 'invalido' }
  | { estado: 'bloqueado' }
  | { estado: 'pin_incorrecto' };

async function verificarBuzonYPin(
  supabase: ReturnType<typeof createClient>,
  token: string,
  pin: string,
): Promise<ResultadoPin> {
  const { data: buzon, error } = await supabase
    .from('upload_links')
    .select('id, etiqueta, folder_id, pin_hash, activo, intentos_fallidos, bloqueado_hasta, revoked_at, uploads_count, remitente_fijo, document_folders(name)')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[buzon-subir] Error consultando upload_links:', error);
    return { estado: 'invalido' };
  }
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
    console.error('[buzon-subir] Error comparando PIN:', e);
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
      remitenteFijo: (buzon.remitente_fijo as string | null) || null,
    },
  };
}

const MOTIVO_POR_ESTADO: Record<Exclude<ResultadoPin['estado'], 'ok'>, string> = {
  invalido: 'Enlace no valido.',
  bloqueado: 'Demasiados intentos. Intenta mas tarde.',
  pin_incorrecto: 'Clave incorrecta.',
};

async function handleValidar(supabase: ReturnType<typeof createClient>, body: any) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  if (!token || !PIN_REGEX.test(pin)) return json({ ok: false, motivo: MOTIVO_POR_ESTADO.invalido });

  const r = await verificarBuzonYPin(supabase, token, pin);
  if (r.estado !== 'ok') return json({ ok: false, motivo: MOTIVO_POR_ESTADO[r.estado] });
  return json({ ok: true, etiqueta: r.buzon.etiqueta, remitenteFijo: r.buzon.remitenteFijo });
}

async function handlePreparar(supabase: ReturnType<typeof createClient>, body: any) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  if (!token || !PIN_REGEX.test(pin)) return json({ ok: false, motivo: MOTIVO_POR_ESTADO.invalido });

  const archivos = Array.isArray(body.archivos) ? body.archivos : null;
  if (!archivos || archivos.length === 0) return json({ ok: false, motivo: 'No enviaste ningun archivo.' });
  if (archivos.length > MAX_ARCHIVOS_LOTE) return json({ ok: false, motivo: `Maximo ${MAX_ARCHIVOS_LOTE} archivos por envio.` });

  for (let i = 0; i < archivos.length; i++) {
    const a = archivos[i] || {};
    const nombre = sanitizarTexto(a.nombre_original, 200) || `archivo ${i + 1}`;
    const mimetype = typeof a.mimetype === 'string' ? a.mimetype : '';
    const tamano = Number(a.tamano);
    if (!MIME_A_EXTENSION[mimetype]) {
      return json({ ok: false, motivo: `"${nombre}" tiene un tipo de archivo no permitido.` });
    }
    if (!Number.isFinite(tamano) || tamano <= 0) {
      return json({ ok: false, motivo: `"${nombre}" esta vacio o su tamano es invalido.` });
    }
    if (tamano > MAX_ARCHIVO_BYTES) {
      return json({ ok: false, motivo: `"${nombre}" supera el limite de 200MB.` });
    }
  }

  const r = await verificarBuzonYPin(supabase, token, pin);
  if (r.estado !== 'ok') return json({ ok: false, motivo: MOTIVO_POR_ESTADO[r.estado] });
  const buzon = r.buzon;

  const subidas: { idx: number; ruta: string; signedUrl: string; token: string }[] = [];
  for (let i = 0; i < archivos.length; i++) {
    const extension = MIME_A_EXTENSION[archivos[i].mimetype];
    const ruta = `${buzon.folderSlug}/buzon-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(ruta);
    if (error || !data) {
      console.error('[buzon-subir] Error creando signed upload URL:', error);
      return json({ ok: false, motivo: 'No se pudo preparar la subida. Intenta nuevamente.' });
    }
    subidas.push({ idx: i, ruta: data.path, signedUrl: data.signedUrl, token: data.token });
  }

  return json({ ok: true, subidas });
}

async function handleConfirmar(supabase: ReturnType<typeof createClient>, body: any) {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  const nombre = sanitizarTexto(body.nombre, 120);
  const nota = sanitizarTexto(body.nota, 500);
  const envios = Array.isArray(body.envios) ? body.envios : null;

  if (!token || !PIN_REGEX.test(pin)) return json({ ok: false, motivo: MOTIVO_POR_ESTADO.invalido });
  if (!nombre) return json({ ok: false, motivo: 'Falta tu nombre.' });
  // La descripcion (nota) es OPCIONAL: puede venir vacia.
  if (!envios || envios.length === 0) return json({ ok: false, motivo: 'No hay archivos para registrar.' });
  if (envios.length > MAX_ARCHIVOS_LOTE) return json({ ok: false, motivo: `Maximo ${MAX_ARCHIVOS_LOTE} archivos por envio.` });

  const r = await verificarBuzonYPin(supabase, token, pin);
  if (r.estado !== 'ok') return json({ ok: false, motivo: MOTIVO_POR_ESTADO[r.estado] });
  const buzon = r.buzon;

  const idsCreados: string[] = [];

  for (const envio of envios) {
    const ruta = typeof envio?.ruta === 'string' ? envio.ruta : '';
    if (!ruta || !ruta.startsWith(`${buzon.folderSlug}/buzon-`) || ruta.includes('..')) {
      console.error('[buzon-subir] Ruta fuera de patron esperado, se omite:', ruta);
      continue;
    }

    const barra = ruta.lastIndexOf('/');
    const prefijo = ruta.slice(0, barra);
    const nombreObjeto = ruta.slice(barra + 1);

    const { data: lista, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(prefijo, { search: nombreObjeto, limit: 1 });
    if (listErr) {
      console.error('[buzon-subir] Error verificando objeto en Storage:', listErr);
      continue;
    }
    const obj = (lista || []).find((o: any) => o.name === nombreObjeto);
    if (!obj) {
      console.error('[buzon-subir] Objeto no encontrado en Storage, se omite:', ruta);
      continue;
    }
    const tamanoReal = Number(obj.metadata?.size ?? 0);
    if (tamanoReal <= 0 || tamanoReal > MAX_ARCHIVO_BYTES) {
      console.error('[buzon-subir] Objeto con tamano invalido, se omite:', ruta, tamanoReal);
      continue;
    }

    const titulo = tituloDesdeArchivo(envio.nombre_original || nombreObjeto);
    // Nota opcional: si viene vacia, solo "Enviado por {nombre}" (sin el "· ").
    const notasDoc = nota ? `Enviado por ${nombre} · ${nota}` : `Enviado por ${nombre}`;
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        title: titulo,
        url: ruta,
        folder_id: buzon.folderId,
        visibility: 'interna',
        created_by: null,
        notas: notasDoc,
        category: 'other',
        status: 'draft',
      })
      .select('id, title')
      .single();

    if (docErr || !doc) {
      console.error('[buzon-subir] Error insertando documento:', docErr);
      continue;
    }
    idsCreados.push(doc.id as string);

    try {
      const { data: niveles } = await supabase.from('role_levels').select('role').lte('nivel', 2);
      const roles = (niveles || []).map((x: any) => x.role);
      if (roles.length > 0) {
        const { data: dest } = await supabase.from('profiles').select('id').eq('is_deleted', false).in('role', roles);
        if (dest && dest.length > 0) {
          const filas = dest.map((p: any) => ({
            user_id: p.id,
            tipo: 'buzon_subida',
            titulo: `Documento recibido: ${doc.title}`,
            cuerpo: `Enviado por ${nombre} via buzon ${buzon.etiqueta}`,
            modulo: 'archivo_digital',
            ref_id: doc.id,
          }));
          await supabase.from('notificaciones').upsert(filas, { onConflict: 'user_id,tipo,ref_id', ignoreDuplicates: true });
        }
      }
    } catch (notifErr) {
      console.error('[buzon-subir] Error creando notificaciones (no bloqueante):', notifErr);
    }
  }

  if (idsCreados.length > 0) {
    const { error: contErr } = await supabase
      .from('upload_links')
      .update({ uploads_count: buzon.uploadsCount + idsCreados.length, last_used_at: new Date().toISOString() })
      .eq('id', buzon.id);
    if (contErr) console.error('[buzon-subir] Error actualizando contador (no bloqueante):', contErr);
  }

  return json({ ok: true, registrados: idsCreados.length });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, motivo: 'Metodo no permitido.' }, 405);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case 'validar': return await handleValidar(supabase, body);
      case 'preparar-subida': return await handlePreparar(supabase, body);
      case 'confirmar': return await handleConfirmar(supabase, body);
      default: return json({ ok: false, motivo: 'Solicitud invalida.' }, 400);
    }
  } catch (e) {
    console.error('[buzon-subir] Error no controlado:', e);
    return json({ ok: false, motivo: 'Error interno. Intenta nuevamente.' }, 500);
  }
});