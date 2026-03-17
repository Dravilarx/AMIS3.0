import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ──────────────────────────────────────────────────────────────
// 🤖 AMIS 3.0 — Telegram Webhook (MVP)
// ──────────────────────────────────────────────────────────────
// POST /api/webhooks/telegram
// Recibe mensajes de Telegram, los loguea y responde con acuse
// de recibo automático.
// ──────────────────────────────────────────────────────────────

// MVP: Token con fallback. En producción, mover a Supabase Secrets y eliminar el fallback.
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "8657771895:AAEWbsty9UEYi3gsrbr63q1y6LD8nl9RhoI";

/**
 * Misión 3: La Boca — Envía un mensaje de vuelta al chat de Telegram.
 * POST https://api.telegram.org/bot<TOKEN>/sendMessage
 */
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
): Promise<boolean> {
  if (!TELEGRAM_TOKEN) {
    console.error(
      "❌ TELEGRAM_TOKEN not configured. Cannot send message.",
    );
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `❌ Telegram API error [${response.status}]:`,
        errorBody,
      );
      return false;
    }

    console.log(`✅ Mensaje enviado a chat ${chatId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Misión 1 & 2: El Oído + El Enrutador
// ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Solo aceptamos POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parsear el payload de Telegram
    const update = await req.json();

    // Telegram envía muchos tipos de updates; nos enfocamos en mensajes de texto
    const message = update?.message;

    if (!message) {
      // Podría ser un callback_query, edited_message, etc.
      console.log("📨 Update recibido sin mensaje de texto:", JSON.stringify(update).slice(0, 200));
      return new Response("OK", { status: 200 });
    }

    // Extraer datos clave
    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const username = message.from?.username || message.from?.first_name || "Desconocido";
    const firstName = message.from?.first_name || "";
    const text = message.text || "";
    const messageDate = new Date((message.date || 0) * 1000).toISOString();

    // ────────────────────────────────────────────────────────
    // Misión 2: Console.log del mensaje entrante
    // ────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════");
    console.log("📩 NUEVO MENSAJE TELEGRAM RECIBIDO");
    console.log("═══════════════════════════════════════════");
    console.log(`  👤 Usuario:    ${firstName} (@${username})`);
    console.log(`  🆔 User ID:    ${userId}`);
    console.log(`  💬 Chat ID:    ${chatId}`);
    console.log(`  📝 Texto:      "${text}"`);
    console.log(`  🕐 Fecha:      ${messageDate}`);
    console.log("═══════════════════════════════════════════");

    // ────────────────────────────────────────────────────────
    // Misión 3: Acuse de recibo automático
    // ────────────────────────────────────────────────────────
    if (chatId && text) {
      const replyText = [
        `🤖 *Hola ${firstName}, soy el Asistente AMIS.*`,
        ``,
        `He recibido tu mensaje:`,
        `_"${text}"_`,
        ``,
        `Mi cerebro IA está en construcción. 🧠🔧`,
        ``,
        `Pronto podré ayudarte con interconsultas, protocolos y SLAs de la Red AMIS.`,
        ``,
        `⏳ _Procesando... por favor espera._`,
      ].join("\n");

      await sendTelegramMessage(chatId, replyText);
    }

    // Responder 200 OK inmediato a Telegram
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    // Siempre responder 200 para evitar que Telegram reintente
    return new Response("OK", { status: 200 });
  }
});
