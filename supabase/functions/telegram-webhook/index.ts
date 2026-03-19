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
// Comando /vincular: Auto-registro self-service por RUT o email
// ──────────────────────────────────────────────────────────────

async function handleVincularCommand(
  identifier: string,
  chatId: number,
  firstName: string,
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const input = identifier.trim();

  if (!input) {
    return [
      `⚠️ Debes indicar tu *RUT* o *email institucional*.`,
      ``,
      `*Ejemplos:*`,
      `• \`/vincular 10.206.892-0\``,
      `• \`/vincular mi@email.com\``,
    ].join("\n");
  }

  // Detectar si es email o RUT
  const isEmail = input.includes("@");

  // Buscar en professionals por email o national_id
  const query = supabase
    .from("professionals")
    .select("id, name, last_name, email, national_id, role, telegram_chat_id");

  if (isEmail) {
    query.ilike("email", input);
  } else {
    query.eq("national_id", input);
  }

  const { data: matches, error } = await query;

  if (error) {
    console.error("❌ Error buscando profesional:", error.message);
    return `❌ Error interno al buscar tu perfil. Intenta de nuevo.`;
  }

  if (!matches || matches.length === 0) {
    console.log(`⚠️ VINCULAR: No se encontró profesional con ${isEmail ? "email" : "RUT"}: ${input}`);
    return [
      `❌ No encontré ningún profesional con ${isEmail ? "email" : "RUT"} *${input}*`,
      ``,
      `Verifica que el dato sea correcto o contacta a tu administrador AMIS.`,
    ].join("\n");
  }

  const professional = matches[0];

  // Verificar si ya está vinculado a OTRO chat
  if (professional.telegram_chat_id && professional.telegram_chat_id !== chatId) {
    return [
      `⚠️ *${professional.name} ${professional.last_name}* ya tiene otro Telegram vinculado.`,
      ``,
      `Si cambiaste de dispositivo, contacta al administrador AMIS para desvincular.`,
    ].join("\n");
  }

  // Verificar si YA está vinculado a ESTE chat
  if (professional.telegram_chat_id === chatId) {
    return [
      `✅ *${professional.name} ${professional.last_name}*, ya estás vinculado.`,
      ``,
      `📋 *Rol:* ${professional.role}`,
      `📧 *Email:* ${professional.email}`,
      `💬 *Chat ID:* ${chatId}`,
      ``,
      `Ya recibes alertas de interconsultas automáticamente. 🔔`,
    ].join("\n");
  }

  // ── Vincular: guardar chat_id ───────────────────────────
  const { error: updateError } = await supabase
    .from("professionals")
    .update({ telegram_chat_id: chatId })
    .eq("id", professional.id);

  if (updateError) {
    console.error("❌ Error actualizando telegram_chat_id:", updateError.message);
    return `❌ Error al vincular. Intenta de nuevo.`;
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("🔗 AUTO-VINCULACIÓN TELEGRAM EXITOSA");
  console.log(`   Profesional: ${professional.name} ${professional.last_name}`);
  console.log(`   ID: ${professional.id}`);
  console.log(`   Chat ID: ${chatId}`);
  console.log(`   Método: ${isEmail ? "email" : "RUT"} → ${input}`);
  console.log("═══════════════════════════════════════════════════");

  return [
    `🎉 *¡Vinculación exitosa!*`,
    ``,
    `👋 Bienvenido/a *${professional.name} ${professional.last_name}*`,
    ``,
    `📋 *Rol:* ${professional.role}`,
    `📧 *Email:* ${professional.email}`,
    `🆔 *RUT:* ${professional.national_id}`,
    `💬 *Chat ID:* ${chatId}`,
    ``,
    `✅ A partir de ahora recibirás:`,
    `• 🔔 Alertas de interconsultas asignadas a ti`,
    `• 🚨 Escalamientos SLA cuando un caso no sea atendido`,
    `• 🔴 Urgencias máximas del pool de radiólogos`,
    ``,
    `*Comandos disponibles:*`,
    `• \`TOMO IC-XXXX\` → Tomar un caso escalado`,
    `• \`/estado\` → Ver tu estado de vinculación`,
    `• \`/ayuda\` → Ver todos los comandos`,
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────
// Comando /estado: Verificar vinculación
// ──────────────────────────────────────────────────────────────

async function handleEstadoCommand(
  chatId: number,
  firstName: string,
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: professional } = await supabase
    .from("professionals")
    .select("name, last_name, email, national_id, role")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!professional) {
    return [
      `❌ *${firstName}*, tu Telegram no está vinculado a ningún profesional AMIS.`,
      ``,
      `Para vincularte, usa:`,
      `• \`/vincular tu-rut\``,
      `• \`/vincular tu@email.com\``,
    ].join("\n");
  }

  return [
    `✅ *Estado: VINCULADO*`,
    ``,
    `👤 *${professional.name} ${professional.last_name}*`,
    `📋 *Rol:* ${professional.role}`,
    `📧 *Email:* ${professional.email}`,
    `🆔 *RUT:* ${professional.national_id}`,
    `💬 *Chat ID:* ${chatId}`,
    ``,
    `🔔 Estás recibiendo alertas de interconsultas.`,
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
      console.log("📨 Update sin mensaje de texto:", JSON.stringify(update).slice(0, 200));
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username || message.from?.first_name || "Desconocido";
    const firstName = message.from?.first_name || "";
    const text = message.text || "";
    const messageDate = new Date((message.date || 0) * 1000).toISOString();

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

    // ── /start — Bienvenida ────────────────────────────────
    if (cmd === "/start") {
      // Auto-check: ¿ya está vinculado?
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: existing } = await supabase
        .from("professionals")
        .select("name, last_name, role")
        .eq("telegram_chat_id", chatId)
        .single();

      if (existing) {
        await sendTelegramMessage(chatId, [
          `👋 *¡Hola de nuevo, ${existing.name} ${existing.last_name}!*`,
          ``,
          `Ya estás vinculado como *${existing.role}*.`,
          `Recibirás alertas de interconsultas automáticamente. 🔔`,
          ``,
          `*Comandos:*`,
          `• \`TOMO IC-XXXX\` → Tomar un caso escalado`,
          `• \`/estado\` → Tu estado de vinculación`,
          `• \`/ayuda\` → Ver todos los comandos`,
        ].join("\n"));
      } else {
        await sendTelegramMessage(chatId, [
          `🏥 *Bienvenido al Bot AMIS 3.0*`,
          ``,
          `Soy el asistente de interconsultas de la red AMIS.`,
          ``,
          `Para recibir alertas, primero vincúlate:`,
          ``,
          `📌 *Opción 1:* Con tu RUT`,
          `\`/vincular 10.206.892-0\``,
          ``,
          `📌 *Opción 2:* Con tu email`,
          `\`/vincular tu@email.com\``,
          ``,
          `Solo necesitas hacerlo *una vez*. Después recibirás alertas automáticamente.`,
        ].join("\n"));
      }
      return new Response("OK", { status: 200 });
    }

    // ── /vincular — Auto-registro ─────────────────────────
    const vincularMatch = text.trim().match(/^\/vincular\s+(.+)$/i);
    if (vincularMatch) {
      const identifier = vincularMatch[1].trim();
      console.log(`🔗 Comando VINCULAR: "${identifier}" por ${firstName} (chat: ${chatId})`);
      const response = await handleVincularCommand(identifier, chatId, firstName);
      await sendTelegramMessage(chatId, response);
      return new Response("OK", { status: 200 });
    }

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
        `🔗 \`/vincular RUT-o-EMAIL\``,
        `   Vincular tu Telegram a tu perfil AMIS`,
        ``,
        `📋 \`/estado\``,
        `   Ver si estás vinculado y tu información`,
        ``,
        `🎯 \`TOMO IC-XXXX-XXXX\``,
        `   Tomar un caso escalado/sin respuesta`,
        ``,
        `❓ \`/ayuda\``,
        `   Mostrar esta ayuda`,
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

    // ── Mensaje no reconocido → ayuda inteligente ─────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: linked } = await supabase
      .from("professionals")
      .select("name")
      .eq("telegram_chat_id", chatId)
      .single();

    if (!linked) {
      // No vinculado → priorizar vinculación
      await sendTelegramMessage(chatId, [
        `🤖 *Hola ${firstName}!*`,
        ``,
        `Aún no estás vinculado al sistema AMIS.`,
        `Para empezar, ejecuta:`,
        ``,
        `\`/vincular tu-rut\`  o  \`/vincular tu@email.com\``,
        ``,
        `Ejemplo: \`/vincular 10.206.892-0\``,
      ].join("\n"));
    } else {
      await sendTelegramMessage(chatId, [
        `🤖 *Hola ${linked.name}!*`,
        ``,
        `No reconozco ese comando. Escribe \`/ayuda\` para ver las opciones.`,
      ].join("\n"));
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return new Response("OK", { status: 200 });
  }
});
