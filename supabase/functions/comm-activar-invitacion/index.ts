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
    const { token, device_info } = await req.json();
    if (!token) return json({ error: 'Falta el token de invitación' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validar invitación
    const { data: inv, error: invErr } = await supabase
      .from('comm_invitaciones')
      .select('id, tenant_id, external_doctor_id, institution_id, estado, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!inv) return json({ error: 'Invitación no encontrada' }, 404);
    if (inv.estado !== 'pendiente') return json({ error: 'Esta invitación ya fue usada o revocada' }, 409);
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) return json({ error: 'La invitación expiró' }, 410);

    // 2. Marcar invitación como usada
    const { error: updErr } = await supabase
      .from('comm_invitaciones')
      .update({ estado: 'usada', usada_at: new Date().toISOString() })
      .eq('id', inv.id);
    if (updErr) throw updErr;

    // 3. Crear sesión persistente
    const { data: sesion, error: sesErr } = await supabase
      .from('comm_sesiones')
      .insert({
        tenant_id: inv.tenant_id,
        external_doctor_id: inv.external_doctor_id,
        institution_id: inv.institution_id,
        device_info: device_info ?? null,
      })
      .select('token_sesion')
      .single();
    if (sesErr) throw sesErr;

    // 4. Registrar evento (log inmutable)
    await supabase.from('comm_eventos').insert({
      tenant_id: inv.tenant_id,
      tipo: 'medico_activado',
      actor: inv.external_doctor_id,
      payload: { institution_id: inv.institution_id },
    });

    // 5. Datos básicos para la app (sin datos de paciente)
    const { data: medico } = await supabase
      .from('external_doctors').select('name, last_name').eq('id', inv.external_doctor_id).maybeSingle();
    const { data: centro } = await supabase
      .from('institutions').select('legal_name, commercial_name').eq('id', inv.institution_id).maybeSingle();

    return json({
      token_sesion: sesion.token_sesion,
      medico: medico ? `${medico.name} ${medico.last_name ?? ''}`.trim() : null,
      centro: centro?.commercial_name || centro?.legal_name || null,
    });
  } catch (e) {
    return json({ error: 'Error interno', detail: String(e) }, 500);
  }
});
