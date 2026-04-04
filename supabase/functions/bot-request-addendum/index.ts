import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { patient_rut, request_text, center_id } = payload

    if (!patient_rut || !request_text) {
      return new Response(
        JSON.stringify({ error: 'RUT and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Find the latest study for this RUT
    const { data: study, error: studyError } = await supabaseClient
      .from('multiris_production')
      .select('accession_number, paciente_nombre')
      .eq('paciente_id', patient_rut)
      .order('fecha_examen', { ascending: false })
      .limit(1)
      .single()

    if (studyError || !study) {
      return new Response(
        JSON.stringify({ error: 'No study found for this RUT' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Insert addendum request
    const { data: addendum, error: addendumError } = await supabaseClient
      .from('addendum_requests')
      .insert({
        study_uid: study.accession_number,
        patient_rut: patient_rut,
        request_text: request_text,
        requested_by_center: center_id || null,
        status: 'PENDING'
      })
      .select()
      .single()

    if (addendumError) throw addendumError

    return new Response(
      JSON.stringify({ 
        message: 'Addendum request created successfully', 
        addendum,
        study_info: study 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
