import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { token_sesion } = await req.json();
    if (!token_sesion) return json({ error: 'Falta el token de sesión' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validar sesión
    const { data: ses, error: sesErr } = await supabase
      .from('comm_sesiones')
      .select('id, external_doctor_id, institution_id, activa, expires_at')
      .eq('token_sesion', token_sesion)
      .maybeSingle();
    if (sesErr) throw sesErr;
    if (!ses || !ses.activa) return json({ error: 'Sesión inválida o revocada' }, 403);
    if (ses.expires_at && new Date(ses.expires_at) < new Date()) return json({ error: 'Sesión expirada' }, 403);

    // 2. Traer SOLO los mensajes de este médico en este centro, con sus respuestas
    const { data: mensajes, error: msgErr } = await supabase
      .from('comm_mensajes')
      .select('id, tipo, referencia_paciente, urgente, texto, estado, creado_at, comm_respuestas(texto, autor_mostrado, creado_at)')
      .eq('external_doctor_id', ses.external_doctor_id)
      .eq('institution_id', ses.institution_id)
      .order('creado_at', { ascending: false })
      .limit(100);
    if (msgErr) throw msgErr;

    // 3. Formatear para la app del médico: NO exponer datos internos (tomado_por, respondido_por, etc.)
    const resultado = (mensajes ?? []).map((m: any) => {
      const respuestas = (m.comm_respuestas ?? [])
        .sort((a: any, b: any) => new Date(a.creado_at).getTime() - new Date(b.creado_at).getTime())
        .map((r: any) => ({
          texto: r.texto,
          autor: r.autor_mostrado,   // lo que el médico debe ver (respeta doble firma)
          fecha: r.creado_at,
        }));
      return {
        id: m.id,
        tipo: m.tipo,
        episodio: m.referencia_paciente,
        urgente: m.urgente,
        texto: m.texto,
        estado: m.estado,
        respondido: respuestas.length > 0,
        fecha: m.creado_at,
        respuestas,
      };
    });

    // 4. Resumen: cuántos respondidos vs pendientes
    const total = resultado.length;
    const respondidos = resultado.filter((m: any) => m.respondido).length;
    const pendientes = total - respondidos;

    return json({ total, respondidos, pendientes, mensajes: resultado });
  } catch (e) {
    return json({ error: 'Error interno', detail: String(e) }, 500);
  }
});
