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

    const { data: ses, error: sesErr } = await supabase
      .from('comm_sesiones')
      .select('id, tenant_id, external_doctor_id, institution_id, activa, expires_at')
      .eq('token_sesion', token_sesion)
      .maybeSingle();
    if (sesErr) throw sesErr;
    if (!ses) return json({ valida: false, error: 'Sesión no encontrada' }, 404);
    if (!ses.activa) return json({ valida: false, error: 'Sesión revocada' }, 403);
    if (ses.expires_at && new Date(ses.expires_at) < new Date()) return json({ valida: false, error: 'Sesión expirada' }, 403);

    await supabase.from('comm_sesiones').update({ ultimo_acceso: new Date().toISOString() }).eq('id', ses.id);

    const { data: medico } = await supabase
      .from('external_doctors').select('name, last_name').eq('id', ses.external_doctor_id).maybeSingle();
    const { data: centro } = await supabase
      .from('institutions').select('legal_name, commercial_name').eq('id', ses.institution_id).maybeSingle();

    return json({
      valida: true,
      external_doctor_id: ses.external_doctor_id,
      institution_id: ses.institution_id,
      medico: medico ? `${medico.name} ${medico.last_name ?? ''}`.trim() : null,
      centro: centro?.commercial_name || centro?.legal_name || null,
    });
  } catch (e) {
    return json({ error: 'Error interno', detail: String(e) }, 500);
  }
});
