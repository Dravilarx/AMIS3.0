import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Validar Token de Telegram
    if (!TELEGRAM_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN')

    const update = await req.json()
    console.log('Update recibido:', update)

    const chatId = update.message?.chat?.id
    const text = update.message?.text
    const from = update.message?.from
    const username = from?.username || from?.first_name || 'Anónimo'

    if (!chatId || !text) {
      return new Response('No message context', { status: 200 })
    }

    // Manejo de comandos básicos
    if (text === '/start') {
      await sendTelegramMessage(chatId, "👋 *Bienvenido al Servicio de Addendums AMIS 3.0*\n\nEscriba el motivo de su addendum o consulta médica directamente aquí. Nuestro equipo de Triage lo procesará y le informaremos el resultado.");
      return new Response('ok')
    }

    // Inserción en AMIS 3.0
    const { error } = await supabase
      .from('addendum_requests')
      .insert({
        patient_rut: 'PENDIENTE-BOT',
        study_uid: 'ORIGEN-TELEGRAM',
        requester_name: `Telegram: @${username}`,
        request_text: text,
        status: 'TRIAGE_PENDING',
        triage_notes: `ChatID: ${chatId} | User: ${username}`
      })

    if (error) {
       console.error('DB Error:', error)
       await sendTelegramMessage(chatId, "⚠️ *Error del Sistema*\nHubo un problema al guardar su solicitud. Por favor contacte a soporte técnico.");
       throw error
    }

    // Respuesta de éxito
    await sendTelegramMessage(chatId, "✅ *Solicitud Enviada*\n\nSu requerimiento ha sido ingresado a la bandeja de Triage Administrativo. Le notificaremos por aquí cuando el radiólogo responda.");

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error('Fatal Error:', err.message)
    return new Response('internal error', { status: 200 })
  }
})

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  })
}
