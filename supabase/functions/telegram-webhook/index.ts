import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ContextManager } from "./ContextManager.ts";

// ──────────────────────────────────────────────────────────────
// 🤖 AMIS 3.0 — Telegram Webhook (v5 — Cerebro Central)
// ──────────────────────────────────────────────────────────────
// POST /api/webhooks/telegram
// Recibe mensajes de Telegram y orquesta:
//   1. /start        → Bienvenida + detección de vinculación
//   2. /estado       → Verificar vinculación
//   3. /ayuda        → Lista de comandos
//   4. TOMO IC-XXXX  → Auto-reasignación de interconsultas
//   5. Texto libre   → ContextManager (RBAC + RAG + Seshat)
// ──────────────────────────────────────────────────────────────

// 🔐 Secrets
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!TELEGRAM_TOKEN) console.warn("⚠️ TELEGRAM_TOKEN no configurado.");

// 🧠 Instancia global del Cerebro Central
const contextManager = new ContextManager();

// ── Utilidades de Telegram ────────────────────────────────────

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

async function sendTelegramMessageRaw(
  chatId: number | string,
  text: string,
  extra: Record<string, any> = {},
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        ...extra,
      }),
    },
  );
}

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
    .select("name, last_name, phone_number, hospital_name, specialty")
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
    `🏥 *Institución:* ${doctor.hospital_name || "No registrada"}`,
    `${doctor.specialty ? `🩺 *Especialidad:* ${doctor.specialty}` : ""}`,
    `📱 *Número validado:* ${doctor.phone_number}`,
    `💬 *Chat ID:* ${chatId}`,
    ``,
    `🧠 *Capacidades activas:*`,
    `• Consultas clínicas con IA contextualizada`,
    `• Acceso a protocolos y manuales (RAG)`,
    `• Interconsultas 1-a-1 con radiólogos`,
    ``,
    `Escribe tu consulta directamente para interactuar con el cerebro AMIS.`,
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

  const existingHistory = Array.isArray(caso.escalation_history)
    ? caso.escalation_history
    : [];

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
// IAM: Flujo Zero-Friction (Compartir Contacto)
// ──────────────────────────────────────────────────────────────

async function handleContactValidation(
  chatId: number,
  phoneNumber: string,
): Promise<void> {
  const normalizedPhone = phoneNumber.replace(/[^0-9]/g, "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(`📱 Contacto recibido: ${phoneNumber} de chat_id: ${chatId}`);

  const { data: doctors, error } = await supabase
    .from("external_doctors")
    .select("id, name, last_name, phone_number, hospital_name")
    .filter("phone_number", "ilike", `%${normalizedPhone.slice(-8)}%`);

  if (error || !doctors || doctors.length === 0) {
    await sendTelegramMessageRaw(
      chatId,
      `❌ Número no autorizado (*${phoneNumber}*).\n\nPor favor contacte a la administración de su clínica para solicitar el enrolamiento a Seshat IAM.`,
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  const doctor = doctors[0];
  const { error: updateError } = await supabase
    .from("external_doctors")
    .update({ telegram_chat_id: chatId })
    .eq("id", doctor.id);

  if (updateError) {
    await sendTelegramMessage(
      chatId,
      `❌ Hubo un error al enrolar tu cuenta. Intenta nuevamente más tarde.`,
    );
    return;
  }

  await sendTelegramMessageRaw(
    chatId,
    [
      `✅ *¡Identidad Verificada!*`,
      ``,
      `Bienvenido Dr/Dra. *${doctor.name} ${doctor.last_name}*.`,
      `Institución validada: *${doctor.hospital_name || "Seshat Network"}*.`,
      ``,
      `🧠 *Cerebro Central AMIS activado.* Capacidades:`,
      `• Consultar informes y estados de pacientes`,
      `• Acceder al visor PACS web`,
      `• Consultar protocolos y manuales clínicos`,
      `• Abrir interconsultas con radiólogos`,
      ``,
      `Escribe tu consulta de forma libre. Ejemplo:`,
      `_"¿Cuál es el estado del paciente 11.222.333-4?"_`,
      `_"¿Cuál es el protocolo de RM de rodilla?"_`,
    ].join("\n"),
    { reply_markup: { remove_keyboard: true } },
  );
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
      console.log(
        "📨 Update sin mensaje válido:",
        JSON.stringify(update).slice(0, 200),
      );
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat?.id;
    const username =
      message.from?.username || message.from?.first_name || "Desconocido";
    const firstName = message.from?.first_name || "";

    // ── IAM: Flujo de validación por contacto (Lista Blanca) ──
    if (message.contact) {
      await handleContactValidation(chatId, message.contact.phone_number);
      return new Response("OK", { status: 200 });
    }

    const text = message.text || "";
    const messageDate = new Date((message.date || 0) * 1000).toISOString();

    if (!text && !message.contact) {
      return new Response("OK", { status: 200 });
    }

    // ── Log ─────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════");
    console.log("📩 NUEVO MENSAJE TELEGRAM RECIBIDO");
    console.log(`  👤 Usuario:    ${firstName} (@${username})`);
    console.log(`  💬 Chat ID:    ${chatId}`);
    console.log(`  📝 Texto:      "${text}"`);
    console.log(`  🕐 Fecha:      ${messageDate}`);
    console.log("═══════════════════════════════════════════");

    if (!chatId || !text) {
      return new Response("OK", { status: 200 });
    }

    const cmd = text.trim().toLowerCase();

    // ── /start — Bienvenida ───────────────────────────────
    if (cmd === "/start") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: linked } = await supabase
        .from("external_doctors")
        .select("name, last_name, hospital_name")
        .eq("telegram_chat_id", chatId)
        .single();

      if (linked) {
        await sendTelegramMessage(
          chatId,
          [
            `👋 *¡Hola de nuevo, Dr/Dra. ${linked.name} ${linked.last_name}!*`,
            ``,
            `Tu identidad ya está verificada para *${linked.hospital_name || "tu institución"}*.`,
            ``,
            `🧠 Cerebro Central AMIS listo. Escribe tu consulta directamente.`,
          ].join("\n"),
        );
      } else {
        await sendTelegramMessageRaw(
          chatId,
          [
            `🏥 *Bienvenido al Bot Clínico AMIS 3.0 para Médicos Derivadores*`,
            ``,
            `Por políticas de seguridad y Cero Fricción B2B, necesitamos verificar tu identidad.`,
            ``,
            `Presiona el botón de abajo para *Compartir Contacto 📱*:`,
          ].join("\n"),
          {
            reply_markup: {
              keyboard: [
                [{ text: "Compartir Contacto 📱", request_contact: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          },
        );
      }
      return new Response("OK", { status: 200 });
    }

    // ── /estado ──────────────────────────────────────────────
    if (cmd === "/estado") {
      const response = await handleEstadoCommand(chatId, firstName);
      await sendTelegramMessage(chatId, response);
      return new Response("OK", { status: 200 });
    }

    // ── /ayuda ───────────────────────────────────────────────
    if (cmd === "/ayuda" || cmd === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          `📖 *Comandos del Bot AMIS:*`,
          ``,
          `📋 \`/estado\``,
          `   Ver tu verificación e información institucional`,
          ``,
          `🎯 \`TOMO IC-XXXX-XXXX\``,
          `   Tomar un caso escalado/sin respuesta (Uso interno)`,
          ``,
          `💡 *Cerebro Central AMIS (IA):*`,
          `   Puedes escribir de forma libre:`,
          `   _"Mostrar informe del paciente 11.222.333-4"_`,
          `   _"¿Cuál es el protocolo de RM lumbar?"_`,
          `   _"Abrir interconsulta sobre hallazgo incidental"_`,
          ``,
          `📚 *Base de Conocimiento (RAG):*`,
          `   Pregunta sobre manuales y protocolos clínicos.`,
          `   _"¿Cómo se prepara un paciente para TC con contraste?"_`,
          ``,
          `_Bot AMIS 3.0 — Cerebro Central de Contexto_`,
        ].join("\n"),
      );
      return new Response("OK", { status: 200 });
    }

    // ── Comando TOMO ─────────────────────────────────────────
    const tomoMatch = text.trim().match(/^TOMO\s+(IC-[\w-]+)$/i);
    if (tomoMatch) {
      const caseId = tomoMatch[1].toUpperCase();
      console.log(
        `🎯 Comando TOMO detectado: ${caseId} por ${firstName} (chat: ${chatId})`,
      );
      const response = await handleTomoCommand(
        caseId,
        chatId,
        username,
        firstName,
      );
      await sendTelegramMessage(chatId, response);
      return new Response("OK", { status: 200 });
    }

    // ──────────────────────────────────────────────────────────
    // 🧠 CEREBRO CENTRAL: Texto libre → ContextManager
    // ──────────────────────────────────────────────────────────

    // Indicador de procesamiento
    await sendTelegramMessage(chatId, `🧠 Procesando con Cerebro Central AMIS...`);

    // Ejecutar pipeline completo: RBAC → Intent → Seshat Guard → RAG → Gemini
    const responseText = await contextManager.executeWithContext(text, chatId);
    await sendTelegramMessage(chatId, responseText);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return new Response("OK", { status: 200 });
  }
});
