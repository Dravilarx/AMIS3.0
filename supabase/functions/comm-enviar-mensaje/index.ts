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
    const { token_sesion, texto, referencia_paciente, urgente, tipo, dirigido_a } = await req.json();
    if (!token_sesion) return json({ error: 'Falta el token de sesión' }, 400);
    if (!texto || typeof texto !== 'string' || texto.trim().length === 0)
      return json({ error: 'Falta el texto del mensaje' }, 400);
    if (texto.length > 4000) return json({ error: 'El mensaje es demasiado largo (máx 4000 caracteres)' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validar sesión
    const { data: ses, error: sesErr } = await supabase
      .from('comm_sesiones')
      .select('id, tenant_id, external_doctor_id, institution_id, activa, expires_at')
      .eq('token_sesion', token_sesion)
      .maybeSingle();
    if (sesErr) throw sesErr;
    if (!ses || !ses.activa) return json({ error: 'Sesión inválida o revocada' }, 403);
    if (ses.expires_at && new Date(ses.expires_at) < new Date()) return json({ error: 'Sesión expirada' }, 403);

    // 2. Verificar autorización vigente del médico en el centro
    const { data: aut } = await supabase
      .from('comm_medico_centro')
      .select('estado')
      .eq('external_doctor_id', ses.external_doctor_id)
      .eq('institution_id', ses.institution_id)
      .maybeSingle();
    if (!aut || aut.estado !== 'autorizado') return json({ error: 'Autorización revocada para este centro' }, 403);

    // 3. Crear el mensaje
    const tipoValido = ['consulta','adendum','doble_opinion','correccion','examen_pendiente'].includes(tipo) ? tipo : 'consulta';
    const { data: msg, error: msgErr } = await supabase
      .from('comm_mensajes')
      .insert({
        tenant_id: ses.tenant_id,
        institution_id: ses.institution_id,
        origen: 'medico',
        direccion: 'entrante',
        external_doctor_id: ses.external_doctor_id,
        tipo: tipoValido,
        referencia_paciente: referencia_paciente ?? null,  // número de episodio / accession (definición Marcos)
        dirigido_a: dirigido_a ?? null,
        urgente: urgente === true,
        texto: texto.trim(),
      })
      .select('id, creado_at')
      .single();
    if (msgErr) throw msgErr;

    // 4. Log inmutable
    await supabase.from('comm_eventos').insert({
      tenant_id: ses.tenant_id,
      mensaje_id: msg.id,
      tipo: 'mensaje_entrante',
      actor: ses.external_doctor_id,
      payload: { institution_id: ses.institution_id, urgente: urgente === true, tipo: tipoValido },
    });

    // 5. Horario: si está fuera del rango configurado, avisar expectativa
    const { data: cfg } = await supabase
      .from('comm_config')
      .select('horario_inicio, horario_fin, mensaje_fuera_horario')
      .eq('tenant_id', ses.tenant_id)
      .maybeSingle();
    let fuera_horario = false;
    let aviso: string | null = null;
    if (cfg) {
      const ahora = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'America/Santiago' });
      if (ahora < cfg.horario_inicio || ahora > cfg.horario_fin) {
        fuera_horario = true;
        aviso = cfg.mensaje_fuera_horario;
      }
    }

    return json({ enviado: true, mensaje_id: msg.id, creado_at: msg.creado_at, fuera_horario, aviso });
  } catch (e) {
    return json({ error: 'Error interno', detail: String(e) }, 500);
  }
});
