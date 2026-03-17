import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ⏱ AMIS 3.0 — Escalador SLA & Broadcast al Pool
// ═══════════════════════════════════════════════════════════════
// Llamado por pg_cron cada minuto (via pg_net) o manualmente.
// Detecta interconsultas con SLA vencido y:
//   1. Marca como 'escalated' en la DB
//   2. Emite broadcastToPool via Supabase Realtime
//   3. Notifica al pool de radiólogos activos por Telegram
// ═══════════════════════════════════════════════════════════════

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "8657771895:AAEWbsty9UEYi3gsrbr63q1y6LD8nl9RhoI";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─────────────────────────────────────────────────────────────
// Utilidad Telegram
// ─────────────────────────────────────────────────────────────
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
): Promise<boolean> {
  if (!TELEGRAM_TOKEN) return false;
  try {
    const res = await fetch(
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
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Misión 3: broadcastToPool — Escalado por SLA
// ─────────────────────────────────────────────────────────────

interface EscalatedCase {
  id: string;
  case_id: string;
  paciente_nombre: string;
  estudio_tipo: string;
  referente_nombre: string;
  referente_clinica: string;
  radiologo_nombre: string;
  message: string;
  sla_minutes: number;
  created_at: string;
  magic_link_token: string;
}

interface PoolRadiologist {
  id: string;
  nombre: string;
  telegram_chat_id: number | null;
  status: string;
}

async function broadcastToPool(): Promise<{
  escalatedCount: number;
  notifiedRadiologists: number;
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Encontrar interconsultas con SLA vencido aún en 'dispatched' o 'acknowledged'
  const { data: expiredCases, error: fetchError } = await supabase
    .from("interconsultations")
    .select("*")
    .in("status", ["dispatched", "acknowledged"])
    .lt("sla_deadline", new Date().toISOString());

  if (fetchError) {
    console.error("❌ Error fetching expired cases:", fetchError.message);
    return { escalatedCount: 0, notifiedRadiologists: 0 };
  }

  if (!expiredCases || expiredCases.length === 0) {
    console.log("✅ Sin interconsultas con SLA vencido.");
    return { escalatedCount: 0, notifiedRadiologists: 0 };
  }

  console.log(`🚨 ${expiredCases.length} interconsulta(s) con SLA vencido detectadas.`);

  // 2. Marcar como escaladas
  const escalatedIds = expiredCases.map((c: EscalatedCase) => c.id);
  await supabase
    .from("interconsultations")
    .update({
      status: "escalated",
      escalated_at: new Date().toISOString(),
    })
    .in("id", escalatedIds);

  // 3. Obtener radiólogos activos del pool (excepto los que ya fallaron)
  // TODO: Cuando tengamos tabla de radiólogos, filtrar por status 'online'
  // Por ahora, usamos un approach simplificado notificando al grupo AMIS
  const poolRadiologists: PoolRadiologist[] = [
    // Estos se poblarán desde la DB cuando tengamos el directorio completo
    // Por ahora es un placeholder para el broadcast
  ];

  let notifiedCount = 0;

  // 4. Por cada caso escalado, emitir broadcast
  for (const caso of expiredCases as EscalatedCase[]) {
    const minutesSinceCreation = Math.round(
      (Date.now() - new Date(caso.created_at).getTime()) / 60000,
    );

    // ── 4a. Evento Realtime (WebSocket broadcast) ──────
    // El UPDATE a 'escalated' ya fue propagado por Supabase Realtime
    // El frontend del Dispatch Center escucha este canal

    // ── 4b. Insertar registro de escalado para audit trail ──
    console.log("═══════════════════════════════════════════════════");
    console.log("🚨 SLA ESCALATION — BROADCAST TO POOL");
    console.log(`   Case: ${caso.case_id}`);
    console.log(`   Paciente: ${caso.paciente_nombre}`);
    console.log(`   Estudio: ${caso.estudio_tipo}`);
    console.log(`   Radiólogo original: ${caso.radiologo_nombre} (NO RESPONDIÓ)`);
    console.log(`   Tiempo transcurrido: ${minutesSinceCreation} min (SLA: ${caso.sla_minutes} min)`);
    console.log("═══════════════════════════════════════════════════");

    // ── 4c. Notificar al pool por Telegram ──────────────
    for (const rad of poolRadiologists) {
      if (rad.telegram_chat_id && rad.status === "online") {
        const alertText = [
          `🚨 *ALERTA SLA — INTERCONSULTA SIN RESPUESTA*`,
          ``,
          `📋 *Caso:* ${caso.case_id}`,
          `👤 *Paciente:* ${caso.paciente_nombre}`,
          `🔬 *Estudio:* ${caso.estudio_tipo}`,
          `🏥 *Referente:* ${caso.referente_nombre} (${caso.referente_clinica})`,
          ``,
          `⚠️ *${caso.radiologo_nombre}* no respondió en *${caso.sla_minutes} min*.`,
          `⏱ Tiempo total: *${minutesSinceCreation} min*`,
          ``,
          `💬 _"${caso.message}"_`,
          ``,
          `👉 ¿Puedes tomar este caso? Responde "TOMO ${caso.case_id}"`,
        ].join("\n");

        const sent = await sendTelegramMessage(rad.telegram_chat_id, alertText);
        if (sent) notifiedCount++;
      }
    }
  }

  return {
    escalatedCount: expiredCases.length,
    notifiedRadiologists: notifiedCount,
  };
}

// ─────────────────────────────────────────────────────────────
// HTTP Handler (invocable por pg_cron via pg_net, o manualmente)
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Aceptar GET (para pg_cron simple) y POST
  try {
    const result = await broadcastToPool();

    return new Response(JSON.stringify({
      success: true,
      ...result,
      checkedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ SLA Escalation error:", error);
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
