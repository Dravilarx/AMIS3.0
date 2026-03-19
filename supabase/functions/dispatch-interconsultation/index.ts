import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// 🚀 AMIS 3.0 — Motor de Despacho Omnicanal
// ═══════════════════════════════════════════════════════════════
// POST /dispatch-interconsultation
// Orquesta la notificación simultánea por:
//   1. WebSocket (Supabase Realtime → RIS/PACS)
//   2. Telegram (Bot API → Celular del radiólogo)
// Con Magic Link JWT para acceso seguro.
// ═══════════════════════════════════════════════════════════════

// 🔐 Secrets: configurar via Supabase Dashboard > Settings > Edge Functions > Secrets
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const JWT_SECRET = Deno.env.get("JWT_SECRET") ?? "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://app.amis.cl";

// Validación de secrets críticos al arrancar
if (!TELEGRAM_TOKEN) console.warn("⚠️ TELEGRAM_TOKEN no configurado. Canal Telegram deshabilitado.");
if (!JWT_SECRET) console.warn("⚠️ JWT_SECRET no configurado. Magic Links no se firmarán correctamente.");

// ─────────────────────────────────────────────────────────────
// Misión 1: Generador de Magic Links (JWT)
// ─────────────────────────────────────────────────────────────

interface MagicLinkPayload {
  studyId: string;
  radiologistId: string;
  caseId: string;
  exp: number;
  iat: number;
  iss: string;
}

/**
 * Genera un JWT firmado con HMAC-SHA256 para acceso rápido al estudio.
 * Expiración configurable (default: 2 horas).
 */
async function generateMagicLink(
  studyId: string,
  radiologistId: string,
  caseId: string,
  expiresInHours: number = 2,
): Promise<{ token: string; url: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + expiresInHours * 3600) * 1000);

  const payload: MagicLinkPayload = {
    studyId,
    radiologistId,
    caseId,
    exp: now + expiresInHours * 3600,
    iat: now,
    iss: "amis-dispatch",
  };

  // Encoder helpers
  const encoder = new TextEncoder();

  // Base64URL encode
  function base64url(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  // Header
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));

  // Sign
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingInput),
  );
  const signatureB64 = base64url(new Uint8Array(signature));

  const token = `${signingInput}.${signatureB64}`;
  const url = `${APP_BASE_URL}/quick-view?token=${token}`;

  console.log(`🔑 Magic Link generado para estudio ${studyId} → expira ${expiresAt.toISOString()}`);

  return { token, url, expiresAt };
}

// ─────────────────────────────────────────────────────────────
// Utilidad: Enviar mensaje Telegram
// ─────────────────────────────────────────────────────────────

async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  parseMode: string = "Markdown",
): Promise<boolean> {
  if (!TELEGRAM_TOKEN) {
    console.error("❌ TELEGRAM_TOKEN no configurado.");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: false,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Telegram API [${res.status}]:`, err);
      return false;
    }

    console.log(`✅ Telegram enviado a chat ${chatId}`);
    return true;
  } catch (e) {
    console.error("❌ Telegram send error:", e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Misión 2: El Despachador Omnicanal
// ─────────────────────────────────────────────────────────────

interface DispatchRequest {
  caseId: string;
  radiologistId: string;
  radiologistName: string;
  radiologistTelegramChatId?: number;
  message: string;
  referenteName: string;
  referenteClinica: string;
  pacienteNombre: string;
  estudioTipo: string;
  studyId: string;
  slaMinutes?: number;
}

interface DispatchResult {
  success: boolean;
  channels: {
    websocket: boolean;
    telegram: boolean;
  };
  magicLink: {
    url: string;
    expiresAt: string;
  };
  caseId: string;
  dispatchedAt: string;
}

async function dispatchInterconsultation(
  req: DispatchRequest,
): Promise<DispatchResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const t0 = performance.now();

  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 DESPACHO OMNICANAL INICIADO");
  console.log(`   Case: ${req.caseId}`);
  console.log(`   Radiólogo: ${req.radiologistName}`);
  console.log(`   Paciente: ${req.pacienteNombre}`);
  console.log(`   Estudio: ${req.estudioTipo}`);
  console.log("═══════════════════════════════════════════════════");

  // ── Misión 1: Generar Magic Link ────────────────────────
  const tMagic = performance.now();
  const magicLink = await generateMagicLink(
    req.studyId,
    req.radiologistId,
    req.caseId,
  );
  console.log(`🔑 Magic Link generado en ${(performance.now() - tMagic).toFixed(0)}ms`);

  // ── Construir mensaje Telegram (preparar antes del dispatch paralelo) ──
  const telegramMessage = [
    `🔔 *NUEVA INTERCONSULTA AMIS*`,
    ``,
    `📋 *Caso:* ${req.caseId}`,
    `👤 *Paciente:* ${req.pacienteNombre}`,
    `🔬 *Estudio:* ${req.estudioTipo}`,
    `🏥 *Referente:* ${req.referenteName} (${req.referenteClinica})`,
    ``,
    `💬 *Consulta:*`,
    `_"${req.message}"_`,
    ``,
    `⏱ *SLA:* ${req.slaMinutes || 10} minutos`,
    ``,
    `🔗 *Acceso rápido al estudio:*`,
    `[📱 Abrir en AMIS Visor](${magicLink.url})`,
    ``,
    `_Responde aquí por Telegram o accede al RIS/PACS._`,
  ].join("\n");

  // ══════════════════════════════════════════════════════════
  // 🔀 DISPATCH CONCURRENTE — Promise.allSettled
  // Ambos canales se disparan en paralelo real.
  // ══════════════════════════════════════════════════════════

  const channelResults = await Promise.allSettled([
    // ── Canal 1: WebSocket (Supabase Realtime via INSERT) ──
    (async (): Promise<boolean> => {
      const tWs = performance.now();
      try {
        const slaMin = req.slaMinutes || 10;
        const now = new Date();
        const slaDeadline = new Date(now.getTime() + slaMin * 60 * 1000);

        const { error } = await supabase
          .from("interconsultations")
          .upsert(
            {
              case_id: req.caseId,
              referente_nombre: req.referenteName,
              referente_clinica: req.referenteClinica,
              paciente_nombre: req.pacienteNombre,
              estudio_tipo: req.estudioTipo,
              estudio_id: req.studyId,
              radiologo_id: req.radiologistId,
              radiologo_nombre: req.radiologistName,
              radiologo_telegram_chat_id: req.radiologistTelegramChatId || null,
              message: req.message,
              status: "dispatched",
              sla_minutes: slaMin,
              sla_deadline: slaDeadline.toISOString(),
              magic_link_token: magicLink.token,
              magic_link_expires_at: magicLink.expiresAt.toISOString(),
              dispatched_via: ["websocket", "telegram"],
            },
            { onConflict: "case_id" },
          );

        const latency = (performance.now() - tWs).toFixed(0);
        if (error) {
          console.error(`❌ WebSocket canal error (${latency}ms):`, error.message);
          return false;
        }
        console.log(`📡 Canal WebSocket: INSERT OK → Realtime propagará al RIS/PACS (${latency}ms)`);
        return true;
      } catch (e) {
        console.error(`❌ WebSocket dispatch error (${(performance.now() - tWs).toFixed(0)}ms):`, e);
        return false;
      }
    })(),

    // ── Canal 2: Telegram ──────────────────────────────────
    (async (): Promise<boolean> => {
      const tTg = performance.now();
      if (!req.radiologistTelegramChatId) {
        console.log("⚠️ Radiólogo sin chat_id de Telegram. Solo despacho por WebSocket.");
        return false;
      }
      const sent = await sendTelegramMessage(
        req.radiologistTelegramChatId,
        telegramMessage,
      );
      const latency = (performance.now() - tTg).toFixed(0);
      console.log(`📱 Canal Telegram: ${sent ? "ENVIADO" : "FALLÓ"} (${latency}ms)`);
      return sent;
    })(),
  ]);

  // ── Procesar resultados ─────────────────────────────────
  const wsOk = channelResults[0].status === "fulfilled" && channelResults[0].value === true;
  const tgOk = channelResults[1].status === "fulfilled" && channelResults[1].value === true;

  const dispatchedVia: string[] = [];
  if (wsOk) dispatchedVia.push("websocket");
  if (tgOk) dispatchedVia.push("telegram");

  // ── Actualizar canales reales usados + audit trail ─────
  if (dispatchedVia.length > 0) {
    const auditEntry = {
      action: "dispatch",
      channels: dispatchedVia,
      timestamp: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - t0),
    };

    await supabase
      .from("interconsultations")
      .update({
        dispatched_via: dispatchedVia,
        escalation_history: [auditEntry],
      })
      .eq("case_id", req.caseId);
  }

  const totalLatency = (performance.now() - t0).toFixed(0);
  console.log("═══════════════════════════════════════════════════");
  console.log(`✅ DESPACHO COMPLETADO en ${totalLatency}ms: WS=${wsOk} TG=${tgOk}`);
  console.log(`   Canales activos: [${dispatchedVia.join(", ")}]`);
  console.log("═══════════════════════════════════════════════════");

  return {
    success: wsOk || tgOk,
    channels: { websocket: wsOk, telegram: tgOk },
    magicLink: {
      url: magicLink.url,
      expiresAt: magicLink.expiresAt.toISOString(),
    },
    caseId: req.caseId,
    dispatchedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// HTTP Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS para frontend
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body: DispatchRequest = await req.json();

    // Validación básica
    if (!body.caseId || !body.radiologistId || !body.message) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: caseId, radiologistId, message",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await dispatchInterconsultation(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ Dispatch error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
