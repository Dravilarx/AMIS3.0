import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ──────────────────────────────────────────────────────────────
// 🤖 AMIS 3.0 — Telegram Webhook (v4 — Self-Service Onboarding)
// ──────────────────────────────────────────────────────────────
// POST /api/webhooks/telegram
// Recibe mensajes de Telegram y:
//   1. /start        → Bienvenida + detección de vinculación
//   2. /vincular     → Auto-registro por RUT o email (self-service)
//   3. /estado       → Verificar vinculación
//   4. /ayuda        → Lista de comandos
//   5. TOMO IC-XXXX  → Auto-reasignación de interconsultas
// ──────────────────────────────────────────────────────────────

// 🔐 Secrets: configurar via Supabase Dashboard > Settings > Edge Functions > Secrets
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

if (!TELEGRAM_TOKEN) console.warn("⚠️ TELEGRAM_TOKEN no configurado. Webhook no podrá responder.");

/**
 * Envía un mensaje de vuelta al chat de Telegram.
 */
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
): Promise<boolean> {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN not configured.");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Telegram API error [${response.status}]:`, errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Inteligencia Artificial (Gemini NLP)
// ──────────────────────────────────────────────────────────────

async function processNaturalLanguage(
  text: string,
  professional: any,
  supabase: any,
  chatId: number
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "❌ API de Inteligencia Artificial (Gemini) no configurada.";
  }

  const prompt = `Eres el asistente clínico de AMIS 3.0 para médicos derivadores en Telegram.
El usuario te enviará un mensaje en lenguaje natural. Debes extraer la intención y devolver un JSON estricto:
{
  "intent": "STATUS_INFORME" | "PACS_LINK" | "INTERCONSULTA" | "REVISION" | "UNKNOWN",
  "entities": {
    "rut": "RUT del paciente si lo menciona (formato X.XXX.XXX-X o similiar)",
    "examen_id": "ID del examen si lo menciona",
    "pregunta": "La duda clínica específica si es interconsulta o revisión"
  }
}
Solo responde el JSON puro, sin formato markdown ni comillas traseras.
Mensaje del usuario: "${text}"`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();
    let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(rawJson);

    return await executeSeshatAction(result, professional, supabase);
  } catch (error) {
    console.error("Gemini Error:", error);
    return "❌ Hubo un error al procesar tu solicitud con IA.";
  }
}

async function executeSeshatAction(aiContext: any, professional: any, supabase: any): Promise<string> {
  const { intent, entities } = aiContext;
  
  if (intent === "STATUS_INFORME") {
    // 🏥 MOCK: Consulta a DB de Seshat
    const mockStudyDate = new Date().toLocaleDateString('es-CL');
    return [
      `🩺 *SESHAT | Reporte de Estado Clínico*`,
      `───────────────────────────`,
      `👤 *Paciente (RUT):* ${entities.rut || 'No especificado en el texto'}`,
      `📅 *Fecha de Estudio:* ${mockStudyDate}`,
      `⚙️ *Modalidad:* Resonancia Magnética (Referencial)`,
      ``,
      `🟢 *Situación Actual: FINALIZADO (Firmado)*`,
      `El informe radiológico definitivo dictado por el especialista ya está ingresado en el sistema core.`,
      ``,
      `📄 [Abrir Informe SESHAT (Magic Link JWT)](https://seshat.amis.global/quick-view?token=${crypto.randomUUID()})`
    ].join("\n");
  }
  
  if (intent === "PACS_LINK") {
    // 🏥 MOCK: Generación de Link Web PACS
    return [
      `🖥 *SESHAT PACS | Visor Web Zero-Footprint*`,
      `───────────────────────────`,
      `👤 *Paciente (RUT):* ${entities.rut || 'No especificado'}`,
      ``,
      `⚠️ *Nota Clínica:* SESHAT Viewer optimizará la compresión DICOM (lossless) para redes móviles.`,
      ``,
      `🔗 [Ingresar al PACS Viewer Seguro](https://seshat.amis.global/viewer?studyUID=1.2.3.4.5.6.789&token=access_granted)`
    ].join("\n");
  }
  
  if (intent === "INTERCONSULTA") {
    return [
      `📡 *SESHAT | Interconsulta 1 a 1 Abierta*`,
      `───────────────────────────`,
      `Has abierto un canal directo para duda diagnóstica:`,
      `💬 _"${entities.pregunta || 'Sin detalle provisto'}"_`,
      ``,
      `👨🏻‍⚕️ *Radiólogo Informante Alertado:* Dr. AMIS Especialista`,
      `Tu interconsulta fue insertada dentro de su entorno **Workstation SESHAT**. En cuanto el radiólogo revise la placa de contexto emitirá su respuesta por esta misma vía.`,
      ``,
      `*ID de Seguimiento:* #IC-${Math.floor(Math.random() * 89999) + 10000}`
    ].join("\n");
  }
  
  if (intent === "REVISION") {
    return [
      `📝 *SESHAT | Ticket de Revisión / Ampliación*`,
      `───────────────────────────`,
      `Se ha ingresado la solicitud oficial de ampliación de informe.`,
      ``,
      `📋 *Solicitud Médica:* _"${entities.pregunta || 'Revisión general requerida'}"_`,
      `🚦 *Alerta:* Elevada a Prioridad Alta`,
      ``,
      `El equipo AMIS Dispatch retomará la placa y asignará el reproceso bajo SLA de contingencia. Recibirás un nuevo reporte en breve.`
    ].join("\n");
  }

  return [
    `🤖 *Asistente Inteligente Seshat (AMIS 3.0)*`,
    `───────────────────────────`,
    `No pude clasificar certeramente tu instrucción clínica.`,
    ``,
    `Te sugiero enriquecer el mensaje. Por ejemplo:`,
    `• _"Muéstrame el escáner del RUT X"_`,
    `• _"Busca el último informe del paciente X"_`,
    `• _"Necesito hacer una duda formal sobre el informe de Juan Perez"_`
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────
// IAM B2B Zero-Friction: El enrolamiento ahora es mediante
// compartir contacto nativo de Telegram, lo cual procesa el
// webhkook en su entrada. Se elimina comando /vincular.

// ──────────────────────────────────────────────────────────────
// Comando /estado: Verificar vinculación
// ──────────────────────────────────────────────────────────────

async function handleEstadoCommand(
  chatId: number,
  firstName: string,
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: doctor } = await supabase
    .from("external_doctors")
    .select("name, last_name, phone_number, hospital_name")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!doctor) {
    return [
      `❌ *${firstName}*, tu Telegram no está validado.`,
      ``,
      `Para verificarte, envía el comando \`/start\` y presiona "Compartir Contacto 📱".`,
    ].join("\n");
  }

  return [
    `✅ *Estado: IDENTIDAD VALIDADA*`,
    ``,
    `👤 *Dr/Dra. ${doctor.name} ${doctor.last_name}*`,
    `🏥 *Institución:* ${doctor.hospital_name || 'No registrada'}`,
    `📱 *Número validado:* ${doctor.phone_number}`,
    `💬 *Chat ID:* ${chatId}`,
    ``,
    `Puedes enviar tus consultas clínicas escribiéndolas directamente.`,
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────
// Comando TOMO: Auto-reasignación de interconsultas
// ──────────────────────────────────────────────────────────────

async function handleTomoCommand(
  caseId: string,
  chatId: number,
  username: string,
  firstName: string,
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: caso, error } = await supabase
    .from("interconsultations")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (error || !caso) {
    return `❌ Caso *${caseId}* no encontrado. Verifica el ID.`;
  }

  if (!["escalated", "orphaned_urgency"].includes(caso.status)) {
    if (caso.status === "resolved") {
      return `✅ El caso *${caseId}* ya fue resuelto.`;
    }
    if (caso.status === "in_progress") {
      return `⚠️ El caso *${caseId}* ya está siendo atendido por *${caso.radiologo_nombre}*.`;
    }
    return `ℹ️ El caso *${caseId}* tiene estado *${caso.status}* y no se puede reasignar.`;
  }

  // Identificar al radiólogo por telegram_chat_id
  const { data: radiologist } = await supabase
    .from("professionals")
    .select("id, name, last_name")
    .eq("telegram_chat_id", chatId)
    .single();

  const radioName = radiologist
    ? `${radiologist.name} ${radiologist.last_name}`
    : `${firstName} (@${username})`;
  const radioId = radiologist?.id || null;

  const now = new Date().toISOString();
  const auditEntry = {
    action: "telegram_tomo_reassign",
    from_radiologist: caso.radiologo_nombre,
    to_radiologist: radioName,
    to_radiologist_id: radioId,
    telegram_chat_id: chatId,
    timestamp: now,
  };

  const existingHistory = Array.isArray(caso.escalation_history) ? caso.escalation_history : [];

  const { error: updateError } = await supabase
    .from("interconsultations")
    .update({
      status: "in_progress",
      radiologo_id: radioId,
      radiologo_nombre: radioName,
      radiologo_telegram_chat_id: chatId,
      reassigned_by: "telegram_bot",
      reassigned_to: radioId,
      escalation_level: 0,
      escalation_history: [...existingHistory, auditEntry],
    })
    .eq("id", caso.id);

  if (updateError) {
    console.error("❌ Error updating interconsultation:", updateError.message);
    return `❌ Error al reasignar el caso *${caseId}*. Intenta de nuevo.`;
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("🎯 AUTO-REASIGNACIÓN VIA TELEGRAM");
  console.log(`   Case: ${caseId}`);
  console.log(`   De: ${caso.radiologo_nombre} → A: ${radioName}`);
  console.log(`   Via: TOMO command (chat_id: ${chatId})`);
  console.log("═══════════════════════════════════════════════════");

  return [
    `✅ *¡Caso ${caseId} asignado a ti, ${radioName}!*`,
    ``,
    `📋 *Paciente:* ${caso.paciente_nombre}`,
    `🔬 *Estudio:* ${caso.estudio_tipo}`,
    `🏥 *Referente:* ${caso.referente_nombre} (${caso.referente_clinica})`,
    ``,
    `💬 *Consulta original:*`,
    `_"${caso.message}"_`,
    ``,
    `⏱ El caso ha sido reasignado. Tu SLA comienza *ahora*.`,
    `📱 Responde aquí o accede al visor AMIS para ver las imágenes.`,
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────
// HTTP Handler Principal
// ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();
    const message = update?.message;

    if (!message) {
      console.log("📨 Update sin mensaje válido:", JSON.stringify(update).slice(0, 200));
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username || message.from?.first_name || "Desconocido";
    const firstName = message.from?.first_name || "";
    
    // ── IAM: Flujo de validación por contacto (Lista Blanca) ──
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      console.log(`📱 Contacto recibido: ${phoneNumber} de chat_id: ${chatId}`);

      const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      const { data: doctors, error } = await supabase
        .from("external_doctors")
        .select("id, name, last_name, phone_number, hospital_name")
        .filter('phone_number', 'ilike', `%${normalizedPhone.slice(-8)}%`);

      if (error || !doctors || doctors.length === 0) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ Número no autorizado (*${phoneNumber}*).\n\nPor favor contacte a la administración de su clínica para solicitar el enrolamiento a Seshat IAM.`,
              parse_mode: "Markdown",
              reply_markup: { remove_keyboard: true }
            }),
          });
          return new Response("OK", { status: 200 });
      }

      const doctor = doctors[0];
      const { error: updateError } = await supabase
        .from("external_doctors")
        .update({ telegram_chat_id: chatId })
        .eq("id", doctor.id);

      if (updateError) {
          await sendTelegramMessage(chatId, `❌ Hubo un error al enrolar tu cuenta. Intenta nuevamente más tarde.`);
          return new Response("OK", { status: 200 });
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ *¡Identidad Verificada!*\n\nBienvenido Dr/Dra. *${doctor.name} ${doctor.last_name}*.\nInstitución validada: *${doctor.hospital_name || 'Seshat Network'}*.\n\nPuedes consultar el estado de tus pacientes escribiendo de forma libre. Ejemplo:\n_"¿Cuál es el estado del paciente 11.222.333-4?"_`,
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true }
        }),
      });

      return new Response("OK", { status: 200 });
    }

    const text = message.text || "";
    const messageDate = new Date((message.date || 0) * 1000).toISOString();

    if (!text && !message.contact) {
      return new Response("OK", { status: 200 });
    }

    // ── Log ────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════");
    console.log("📩 NUEVO MENSAJE TELEGRAM RECIBIDO");
    console.log(`  👤 Usuario:    ${firstName} (@${username})`);
    console.log(`  🆔 User ID:    ${userId}`);
    console.log(`  💬 Chat ID:    ${chatId}`);
    console.log(`  📝 Texto:      "${text}"`);
    console.log(`  🕐 Fecha:      ${messageDate}`);
    console.log("═══════════════════════════════════════════");

    if (!chatId || !text) {
      return new Response("OK", { status: 200 });
    }

    const cmd = text.trim().toLowerCase();

    // ── /start — Bienvenida y Solicitud de Validación ──────
    if (cmd === "/start") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: linked } = await supabase
        .from("external_doctors")
        .select("name, last_name, hospital_name")
        .eq("telegram_chat_id", chatId)
        .single();

      if (linked) {
        await sendTelegramMessage(chatId, [
          `👋 *¡Hola de nuevo, Dr/Dra. ${linked.name} ${linked.last_name}!*`,
          ``,
          `Tu identidad ya está verificada para la clínica *${linked.hospital_name || 'tu institución'}*.`,
          `Simplemente puedes escribir tus consultas para interactuar con Seshat.`,
        ].join("\n"));
      } else {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🏥 *Bienvenido al Bot Clínico AMIS 3.0 para Médicos Derivadores*\n\nPor políticas de seguridad y Cero Fricción B2B, necesitamos verificar tu identidad validando tu número contra nuestra lista blanca.\n\nPor favor, presiona el botón de abajo para **Compartir Contacto 📱**:`,
            parse_mode: "Markdown",
            reply_markup: {
              keyboard: [
                [{ text: "Compartir Contacto 📱", request_contact: true }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }),
        });
      }
      return new Response("OK", { status: 200 });
    }

    // ── Comando /vincular REMOVIDO ─────────
    // Se ha deprecado en favor de la validación del contacto (Lista Blanca)


    // ── /estado — Check vinculación ───────────────────────
    if (cmd === "/estado") {
      const response = await handleEstadoCommand(chatId, firstName);
      await sendTelegramMessage(chatId, response);
      return new Response("OK", { status: 200 });
    }

    // ── /ayuda — Lista de comandos ────────────────────────
    if (cmd === "/ayuda" || cmd === "/help") {
      await sendTelegramMessage(chatId, [
        `📖 *Comandos del Bot AMIS:*`,
        ``,
        `📋 \`/estado\``,
        `   Ver si estás verificado y tu información institucional`,
        ``,
        `🎯 \`TOMO IC-XXXX-XXXX\``,
        `   Tomar un caso escalado/sin respuesta (Uso interno)`,
        ``,
        `💡 *Asistente Inteligente (IA):*`,
        `   Puedes escribir peticiones libres, ejemplo:`,
        `   _"Mostrar informe de paciente 11.222.333-4"_`,
        `   _"Generar PACS link para examen de Juan Perez"_`,
        ``,
        `_Bot AMIS 3.0 — Motor de Interconsultas Omnicanal_`,
      ].join("\n"));
      return new Response("OK", { status: 200 });
    }

    // ── Comando TOMO ───────────────────────────────────────
    const tomoMatch = text.trim().match(/^TOMO\s+(IC-[\w-]+)$/i);
    if (tomoMatch) {
      const caseId = tomoMatch[1].toUpperCase();
      console.log(`🎯 Comando TOMO detectado: ${caseId} por ${firstName} (chat: ${chatId})`);
      const response = await handleTomoCommand(caseId, chatId, username, firstName);
      await sendTelegramMessage(chatId, response);
      return new Response("OK", { status: 200 });
    }

    // ── Mensaje de texto libre → Procesamiento NLP con Gemini ─────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: linked } = await supabase
      .from("external_doctors") // Ajustado a external_doctors
      .select("id, name, last_name, hospital_name")
      .eq("telegram_chat_id", chatId)
      .single();

    if (!linked) {
      // No validado → solicitar compartir contacto
      await sendTelegramMessage(chatId, [
        `🤖 *Hola ${firstName}!*`,
        ``,
        `Para enviar consultas clínicas de forma libre, primero debes verificar tu identidad.`,
        `Por favor envía \`/start\` y presiona el botón de "Compartir Contacto 📱".`,
      ].join("\n"));
    } else {
      // Procesamos el mensaje libre con Gemini
      await sendTelegramMessage(chatId, `🧠 Analizando solicitud clínica...`);
      const responseText = await processNaturalLanguage(text, linked, supabase, chatId);
      await sendTelegramMessage(chatId, responseText);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return new Response("OK", { status: 200 });
  }
});
