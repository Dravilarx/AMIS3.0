import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * AMIS 3.0 — request-archived-study
 *
 * Motor de recuperación de paquete IRAD completo.
 * Gestiona el semáforo de 3 estados:
 *   - NOT_REQUESTED (Gris)  → estado inicial
 *   - PENDING_IRAD  (Azul)  → solicitud enviada, esperando
 *   - READY         (Verde) → paquete disponible para descarga
 *
 * Paquete completo incluye:
 *   - Imágenes DICOM
 *   - Órdenes Médicas
 *   - Antecedentes PDF
 *
 * Modos de operación (via `action` en el payload):
 *   - 'REQUEST'  → Inicia solicitud (NOT_REQUESTED → PENDING_IRAD)
 *   - 'CONFIRM'  → IRAD notifica que está listo (PENDING_IRAD → READY)
 *   - 'STATUS'   → Consulta el estado actual
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IRAD_API_URL = Deno.env.get('IRAD_API_URL') || null
const IRAD_API_KEY = Deno.env.get('IRAD_API_KEY') || null

interface IRADPayload {
  action: 'REQUEST' | 'CONFIRM' | 'STATUS'
  report_id: string
  // Para REQUEST
  patient_id?: string           // RUT o ID externo según el centro
  patient_id_source?: 'RUT' | 'NUM_COBRE' | 'EXTERNAL_ID'
  accession_number?: string
  center_aetitle?: string
  package_types?: ('DICOM' | 'ORDEN' | 'ANTECEDENTES')[]
  // Para CONFIRM (llamado por IRAD webhook)
  package_url?: string
  confirmed_package_types?: string[]
}

type IradStatus = 'NOT_REQUESTED' | 'PENDING_IRAD' | 'READY'

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    // Health check
    return new Response(JSON.stringify({ service: 'request-archived-study', status: 'ok' }))
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const payload: IRADPayload = await req.json()
    console.log(`📦 IRAD ${payload.action} | Estudio: ${payload.report_id}`)

    switch (payload.action) {
      case 'REQUEST':
        return await handleRequest(supabase, payload)
      case 'CONFIRM':
        return await handleConfirm(supabase, payload)
      case 'STATUS':
        return await handleStatus(supabase, payload)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('💥 request-archived-study fatal:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// ACTION: REQUEST — Inicia recuperación IRAD
// ═══════════════════════════════════════════════════════════════
async function handleRequest(supabase: ReturnType<typeof createClient>, payload: IRADPayload) {
  // 1. Verificar estado actual
  const { data: current } = await supabase
    .from('multiris_production')
    .select('irad_status, accession_number, paciente_id, external_patient_id, patient_id_source, aetitle')
    .eq('id', payload.report_id)
    .maybeSingle()

  if (!current) {
    return new Response(JSON.stringify({ error: 'Estudio no encontrado' }), { status: 404 })
  }

  // No re-solicitar si ya está pendiente o listo
  if (current.irad_status === 'PENDING_IRAD') {
    return new Response(JSON.stringify({
      ok: false,
      irad_status: 'PENDING_IRAD',
      message: 'Ya existe una solicitud pendiente para este estudio',
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (current.irad_status === 'READY') {
    return new Response(JSON.stringify({
      ok: false,
      irad_status: 'READY',
      message: 'El paquete IRAD ya está disponible',
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  // 2. Resolver la llave de identidad correcta para IRAD
  const idSource = payload.patient_id_source || current.patient_id_source || 'RUT'
  const patientKey = resolveIRADKey(
    current.paciente_id,
    current.external_patient_id,
    idSource
  )

  const requestedTypes = payload.package_types || ['DICOM', 'ORDEN', 'ANTECEDENTES']

  // 3. Enviar solicitud a IRAD (o simular si no hay API configurada)
  let iradRequestId: string | null = null
  if (IRAD_API_URL && IRAD_API_KEY) {
    try {
      const iradRes = await fetch(`${IRAD_API_URL}/request-study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': IRAD_API_KEY,
        },
        body: JSON.stringify({
          patient_id: patientKey,
          patient_id_type: idSource,
          accession_number: payload.accession_number || current.accession_number,
          center_aetitle: payload.center_aetitle || current.aetitle,
          package_types: requestedTypes,
          callback_url: `${SUPABASE_URL}/functions/v1/request-archived-study`,
        })
      })
      if (iradRes.ok) {
        const iradData = await iradRes.json()
        iradRequestId = iradData.request_id || null
        console.log(`✅ IRAD API respondió con request_id: ${iradRequestId}`)
      }
    } catch (e: unknown) {
      console.warn('⚠️ IRAD API no disponible, operando en modo simulado:', e instanceof Error ? e.message : String(e))
    }
  } else {
    console.log('ℹ️ IRAD_API_URL no configurada — modo simulado activo')
    iradRequestId = `SIMULATED-${Date.now()}`
  }

  // 4. Actualizar estado a PENDING_IRAD
  const { error: updateError } = await supabase
    .from('multiris_production')
    .update({
      irad_status: 'PENDING_IRAD' as IradStatus,
      irad_requested_at: new Date().toISOString(),
      irad_package_type: requestedTypes,
    })
    .eq('id', payload.report_id)

  if (updateError) throw updateError

  console.log(`🔵 Estudio ${payload.report_id} → PENDING_IRAD | Llave: ${patientKey} [${idSource}]`)

  return new Response(JSON.stringify({
    ok: true,
    irad_status: 'PENDING_IRAD',
    irad_request_id: iradRequestId,
    patient_key_used: patientKey,
    patient_id_source: idSource,
    package_types: requestedTypes,
    message: 'Solicitud enviada a IRAD. El paquete estará disponible en breve.',
  }), { headers: { 'Content-Type': 'application/json' } })
}

// ═══════════════════════════════════════════════════════════════
// ACTION: CONFIRM — IRAD notifica que el paquete está listo
// ═══════════════════════════════════════════════════════════════
async function handleConfirm(supabase: ReturnType<typeof createClient>, payload: IRADPayload) {
  if (!payload.package_url) {
    return new Response(JSON.stringify({ error: 'package_url requerida para CONFIRM' }), { status: 400 })
  }

  const { error } = await supabase
    .from('multiris_production')
    .update({
      irad_status: 'READY' as IradStatus,
      irad_ready_at: new Date().toISOString(),
      irad_package_url: payload.package_url,
      irad_package_type: payload.confirmed_package_types || ['DICOM', 'ORDEN', 'ANTECEDENTES'],
    })
    .eq('id', payload.report_id)

  if (error) throw error

  console.log(`✅ Estudio ${payload.report_id} → READY | URL: ${payload.package_url}`)

  return new Response(JSON.stringify({
    ok: true,
    irad_status: 'READY',
    package_url: payload.package_url,
    message: 'Paquete IRAD confirmado como disponible.',
  }), { headers: { 'Content-Type': 'application/json' } })
}

// ═══════════════════════════════════════════════════════════════
// ACTION: STATUS — Consulta estado actual
// ═══════════════════════════════════════════════════════════════
async function handleStatus(supabase: ReturnType<typeof createClient>, payload: IRADPayload) {
  const { data, error } = await supabase
    .from('multiris_production')
    .select('irad_status, irad_requested_at, irad_ready_at, irad_package_url, irad_package_type')
    .eq('id', payload.report_id)
    .maybeSingle()

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Estudio no encontrado' }), { status: 404 })
  }

  return new Response(JSON.stringify({
    ok: true,
    irad_status: data.irad_status,
    irad_requested_at: data.irad_requested_at,
    irad_ready_at: data.irad_ready_at,
    irad_package_url: data.irad_package_url,
    irad_package_type: data.irad_package_type,
  }), { headers: { 'Content-Type': 'application/json' } })
}

// ═══════════════════════════════════════════════════════════════
// RESOLVER DE LLAVE IRAD (Identidad Adaptativa)
// ═══════════════════════════════════════════════════════════════
function resolveIRADKey(
  rutValue: string | null,
  externalId: string | null,
  source: string
): string {
  switch (source) {
    case 'NUM_COBRE':
    case 'EXTERNAL_ID':
      return externalId || rutValue || 'UNKNOWN'
    case 'RUT':
    default:
      return rutValue || 'UNKNOWN'
  }
}
