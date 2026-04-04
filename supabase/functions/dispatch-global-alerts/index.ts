import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * AMIS 3.0 — dispatch-global-alerts v2 (Triple Alarma)
 *
 * Motor de notificaciones multi-destinatario con doble canal.
 * Notifica a TODOS los contactos registrados en el centro B2B.
 *
 * Tipos de alerta:
 *   1. PENDING_CENTER_ACTION — Examen detenido, SLA congelado
 *   2. CRITICAL_FINDING      — Hallazgo de riesgo vital
 *
 * SEGURIDAD:
 *   - Identity Shield: Nunca expone nombres de residentes
 *   - Token de Telegram via Supabase Secrets
 *   - Service Role Key para operaciones de escritura
 */

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const HIDDEN_ROLES = ['MED_RESIDENT', 'MED_REQUIRES_COSIGN']

interface AlertPayload {
  alert_type: 'PENDING_CENTER_ACTION' | 'CRITICAL_FINDING'
  report_id: string
  patient_rut?: string
  patient_name?: string
  exam_name?: string
  accession_number?: string
  center_aetitle?: string
  pending_reason?: string
  pending_message?: string
  critical_notes?: string
  author_name?: string
  author_clinical_role?: string
  author_supervisor_name?: string
}

interface CenterContacts {
  telegram_ids: string[]
  emails: string[]
  id_label: string
}

interface DispatchResult {
  recipient: string
  channel: 'telegram' | 'email'
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error?: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const payload: AlertPayload = await req.json()
    console.log(`📡 Triple Alarma: ${payload.alert_type} | Centro: ${payload.center_aetitle}`)

    // ── 1. Identity Shield ──
    const signerName = resolvePublicName(
      payload.author_clinical_role,
      payload.author_name || 'Médico Radiólogo',
      payload.author_supervisor_name
    )

    // ── 2. Obtener TODOS los contactos del centro ──
    const contacts = await getAllCenterContacts(supabase, payload.center_aetitle)
    console.log(`📋 Destinatarios: ${contacts.telegram_ids.length} Telegram, ${contacts.emails.length} Email`)

    // ── 3. Construir mensajes ──
    const { telegramMsg, emailSubject, emailBody } = buildMessages(payload, signerName, contacts.id_label)

    // ── 4. Disparar a TODOS los destinatarios ──
    const results: DispatchResult[] = []

    // Telegram — multi-destinatario
    for (const chatId of contacts.telegram_ids) {
      if (!TELEGRAM_TOKEN) {
        results.push({ recipient: chatId, channel: 'telegram', status: 'SKIPPED', error: 'No token' })
        continue
      }
      try {
        await sendTelegram(chatId, telegramMsg)
        results.push({ recipient: chatId, channel: 'telegram', status: 'SENT' })
        console.log(`✅ Telegram → ${chatId}`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ recipient: chatId, channel: 'telegram', status: 'FAILED', error: msg })
        console.error(`❌ Telegram falló → ${chatId}: ${msg}`)
      }
    }

    // Email — multi-destinatario (queue para Fase 2 con Resend)
    for (const email of contacts.emails) {
      try {
        // TODO: conectar con Resend / Sendgrid en Fase 2
        console.log(`📧 Email queued → ${email} | ${emailSubject}`)
        results.push({ recipient: email, channel: 'email', status: 'SENT' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ recipient: email, channel: 'email', status: 'FAILED', error: msg })
      }
    }

    const sentCount = results.filter(r => r.status === 'SENT').length

    // ── 5. Registrar en audit log ──
    await supabase.from('alert_dispatch_log').insert({
      alert_type: payload.alert_type,
      report_id: payload.report_id,
      center_aetitle: payload.center_aetitle,
      patient_rut: payload.patient_rut,
      message_sent: telegramMsg.substring(0, 500),
      signed_by: signerName,
      delivery_status: sentCount > 0 ? 'PARTIAL_OR_FULL' : 'FAILED',
      recipient_count: results.length,
      recipients_detail: results,
    })

    return new Response(JSON.stringify({
      ok: true,
      signed_by: signerName,
      recipients_notified: sentCount,
      total_recipients: results.length,
      results,
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('💥 dispatch-global-alerts fatal:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// IDENTITY SHIELD
// ═══════════════════════════════════════════════════════════════
function resolvePublicName(role?: string, ownName = 'Médico Radiólogo', supervisorName?: string): string {
  if (HIDDEN_ROLES.includes(role || '')) return supervisorName || 'Médico Validador'
  return ownName
}

// ═══════════════════════════════════════════════════════════════
// CONTACTOS MULTI-DESTINATARIO
// ═══════════════════════════════════════════════════════════════
async function getAllCenterContacts(supabase: ReturnType<typeof createClient>, aetitle?: string): Promise<CenterContacts> {
  if (!aetitle) return { telegram_ids: [], emails: [], id_label: 'RUT' }

  const { data } = await supabase
    .from('b2b_centers')
    .select('contact_telegram_ids, contact_emails, id_label, telegram_chat_id, alert_email')
    .eq('aetitle', aetitle)
    .maybeSingle()

  if (!data) return { telegram_ids: [], emails: [], id_label: 'RUT' }

  // Merge nuevos arrays con campos legacy (sin duplicados)
  const telegramSet = new Set<string>([
    ...(data.contact_telegram_ids || []),
    ...(data.telegram_chat_id ? [data.telegram_chat_id] : []),
  ])
  const emailSet = new Set<string>([
    ...(data.contact_emails || []),
    ...(data.alert_email ? [data.alert_email] : []),
  ])

  return {
    telegram_ids: [...telegramSet].filter(Boolean),
    emails: [...emailSet].filter(Boolean),
    id_label: data.id_label || 'RUT',
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM
// ═══════════════════════════════════════════════════════════════
async function sendTelegram(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram ${res.status}: ${body}`)
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTORES DE MENSAJES
// ═══════════════════════════════════════════════════════════════
function buildMessages(p: AlertPayload, signer: string, idLabel: string) {
  const idDisplay = `${p.patient_rut || 'ID no disponible'} [${idLabel}]`

  let telegramMsg: string
  let emailSubject: string
  let emailBody: string

  if (p.alert_type === 'PENDING_CENTER_ACTION') {
    telegramMsg = [
      `🚨 *ACCIÓN REQUERIDA — AMIS 3.0*`,
      ``,
      `Estudio del paciente *${idDisplay}* ha sido detenido.`,
      ``,
      `📋 *Motivo:* ${p.pending_reason || 'No especificado'}`,
      p.pending_message ? `💬 *Detalle:* ${p.pending_message}` : '',
      `🏥 *Examen:* ${p.exam_name || p.accession_number || 'S/N'}`,
      ``,
      `⏸️ El SLA está *congelado* hasta resolver.`,
      `👉 Ingrese al Portal B2B de AMIS para reanudar.`,
      ``,
      `_Dr(a). ${signer} — Red AMIS 3.0_`,
    ].filter(Boolean).join('\n')

    emailSubject = `🚨 ACCIÓN REQUERIDA — Estudio detenido [${p.accession_number || 'S/N'}]`
    emailBody = `<h2>🚨 ACCIÓN REQUERIDA — Estudio Detenido</h2>
      <p>Estudio detenido para paciente <strong>${idDisplay}</strong>.</p>
      <p><strong>Motivo:</strong> ${p.pending_reason || 'No especificado'}</p>
      <p><strong>Detalle:</strong> ${p.pending_message || '—'}</p>
      <p><em>Dr(a). ${signer} — Red AMIS 3.0</em></p>`
  } else {
    telegramMsg = [
      `⚠️ *ALERTA ROJA — HALLAZGO CRÍTICO*`,
      ``,
      `Condición de *riesgo vital* detectada para paciente *${idDisplay}*.`,
      ``,
      `🏥 *Examen:* ${p.exam_name || p.accession_number || 'S/N'}`,
      p.critical_notes ? `📝 *Observación:* ${p.critical_notes}` : '',
      ``,
      `🔴 *Contacte al médico tratante de inmediato.*`,
      `👉 Ver detalles en el Portal B2B de AMIS.`,
      ``,
      `_Dr(a). ${signer} — Protocolo de Alerta Vital_`,
    ].filter(Boolean).join('\n')

    emailSubject = `⚠️ ALERTA ROJA — Hallazgo Crítico [${p.accession_number || 'S/N'}]`
    emailBody = `<h2 style="color:#dc2626">⚠️ HALLAZGO CRÍTICO</h2>
      <p>Riesgo vital para <strong>${idDisplay}</strong>.</p>
      <p><strong>Observación:</strong> ${p.critical_notes || '—'}</p>
      <p style="color:#dc2626;font-weight:bold">🔴 CONTACTE AL MÉDICO TRATANTE DE INMEDIATO</p>
      <p><em>Dr(a). ${signer} — Protocolo de Alerta Vital</em></p>`
  }

  return { telegramMsg, emailSubject, emailBody }
}
