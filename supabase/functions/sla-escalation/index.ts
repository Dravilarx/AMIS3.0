import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// ⏱ AMIS 3.0 — Escalador SLA & Broadcast al Pool
// ═══════════════════════════════════════════════════════════════
// Llamado por pg_cron cada minuto (via pg_net) o manualmente.
// Detecta interconsultas con SLA vencido y:
//   1. Marca como 'escalated' (nivel 1) u 'orphaned_urgency' (nivel 2)
//   2. Emite broadcast via Supabase Realtime (auto por UPDATE)
//   3. Notifica al pool de radiólogos activos por Telegram
//   4. Registra audit trail en escalation_history (JSONB)
// ═══════════════════════════════════════════════════════════════

// 🔐 Secrets: configurar via Supabase Dashboard > Settings > Edge Functions > Secrets
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://app.amis.cl";

if (!TELEGRAM_TOKEN) console.warn("⚠️ TELEGRAM_TOKEN no configurado. Broadcast SLA deshabilitado.");

// Umbral para 2do nivel de escalamiento (minutos adicionales después del SLA)
const ORPHAN_THRESHOLD_MINUTES = 15;

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
    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Telegram API [${res.status}]:`, err);
    }
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Misión 3: checkSlaAndEscalate — Escalado multinivel por SLA
// ─────────────────────────────────────────────────────────────

interface EscalatedCase {
  id: string;
  case_id: string;
  paciente_nombre: string;
  estudio_tipo: string;
  referente_nombre: string;
  referente_clinica: string;
  radiologo_id: string;
  radiologo_nombre: string;
  message: string;
  sla_minutes: number;
  sla_deadline: string;
  created_at: string;
  magic_link_token: string;
  status: string;
  escalation_level: number;
  escalation_history: Record<string, unknown>[];
}

interface PoolRadiologist {
  id: string;
  nombre: string;
  telegram_chat_id: number | null;
}

async function checkSlaAndEscalate(): Promise<{
  escalatedCount: number;
  orphanedCount: number;
  notifiedRadiologists: number;
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now = new Date();
  let notifiedCount = 0;

  // ═══════════════════════════════════════════════════════════
  // NIVEL 1: Interconsultas con SLA vencido → 'escalated'
  // ═══════════════════════════════════════════════════════════
  const { data: level1Cases, error: l1Error } = await supabase
    .from("interconsultations")
    .select("*")
    .in("status", ["dispatched", "acknowledged"])
    .lt("sla_deadline", now.toISOString());

  if (l1Error) {
    console.error("❌ Error fetching L1 expired cases:", l1Error.message);
    return { escalatedCount: 0, orphanedCount: 0, notifiedRadiologists: 0 };
  }

  // ═══════════════════════════════════════════════════════════
  // NIVEL 2: Interconsultas ESCALATED por más de ORPHAN_THRESHOLD
  // → 'orphaned_urgency' (emergencia máxima)
  // ═══════════════════════════════════════════════════════════
  const orphanThreshold = new Date(now.getTime() - ORPHAN_THRESHOLD_MINUTES * 60 * 1000);
  const { data: level2Cases, error: l2Error } = await supabase
    .from("interconsultations")
    .select("*")
    .eq("status", "escalated")
    .lt("escalated_at", orphanThreshold.toISOString());

  if (l2Error) {
    console.error("❌ Error fetching L2 orphaned cases:", l2Error.message);
  }

  // ─────── Obtener pool de radiólogos desde la DB ───────────
  // Buscamos profesionales con telegram_chat_id configurado
  const { data: poolRadiologists } = await supabase
    .from("professionals")
    .select("id, nombre, telegram_chat_id")
    .not("telegram_chat_id", "is", null);

  const pool: PoolRadiologist[] = (poolRadiologists || []).filter(
    (r: PoolRadiologist) => r.telegram_chat_id != null,
  );

  if (pool.length === 0) {
    console.log("⚠️ Pool de radiólogos vacío. No hay destinos para broadcast Telegram.");
    console.log("   → Verificar que los profesionales tengan 'telegram_chat_id' configurado.");
  }

  // ─────── Procesamos NIVEL 1 ───────────────────────────────
  const l1 = level1Cases || [];
  if (l1.length > 0) {
    console.log(`🚨 ${l1.length} interconsulta(s) con SLA vencido → NIVEL 1 (escalated)`);

    for (const caso of l1 as EscalatedCase[]) {
      const minutesSinceCreation = Math.round(
        (now.getTime() - new Date(caso.created_at).getTime()) / 60000,
      );

      const auditEntry = {
        action: "sla_escalation_level_1",
        from_status: caso.status,
        to_status: "escalated",
        timestamp: now.toISOString(),
        minutes_elapsed: minutesSinceCreation,
        sla_minutes: caso.sla_minutes,
      };

      const existingHistory = Array.isArray(caso.escalation_history) ? caso.escalation_history : [];

      await supabase
        .from("interconsultations")
        .update({
          status: "escalated",
          escalated_at: now.toISOString(),
          escalation_level: 1,
          escalation_history: [...existingHistory, auditEntry],
        })
        .eq("id", caso.id);

      console.log("═══════════════════════════════════════════════════");
      console.log("🚨 SLA ESCALATION — NIVEL 1");
      console.log(`   Case: ${caso.case_id}`);
      console.log(`   Paciente: ${caso.paciente_nombre}`);
      console.log(`   Radiólogo original: ${caso.radiologo_nombre} (NO RESPONDIÓ)`);
      console.log(`   Tiempo: ${minutesSinceCreation} min (SLA: ${caso.sla_minutes} min)`);
      console.log("═══════════════════════════════════════════════════");

      // Broadcast al pool por Telegram
      for (const rad of pool) {
        if (rad.id === caso.radiologo_id) continue; // No notificar al que falló

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
          `🔗 [📱 Abrir estudio en AMIS](${APP_BASE_URL}/quick-view?token=${caso.magic_link_token})`,
          ``,
          `👉 ¿Puedes tomar este caso? Responde \`TOMO ${caso.case_id}\``,
        ].join("\n");

        if (rad.telegram_chat_id) {
          const sent = await sendTelegramMessage(rad.telegram_chat_id, alertText);
          if (sent) notifiedCount++;
        }
      }
    }
  } else {
    console.log("✅ Sin interconsultas con SLA vencido (Nivel 1).");
  }

  // ─────── Procesamos NIVEL 2: ORPHANED URGENCY ─────────────
  const l2 = level2Cases || [];
  if (l2.length > 0) {
    console.log(`🔴 ${l2.length} interconsulta(s) → NIVEL 2 (orphaned_urgency)`);

    for (const caso of l2 as EscalatedCase[]) {
      const minutesSinceCreation = Math.round(
        (now.getTime() - new Date(caso.created_at).getTime()) / 60000,
      );

      const auditEntry = {
        action: "sla_escalation_level_2_orphaned",
        from_status: "escalated",
        to_status: "orphaned_urgency",
        timestamp: now.toISOString(),
        minutes_elapsed: minutesSinceCreation,
      };

      const existingHistory = Array.isArray(caso.escalation_history) ? caso.escalation_history : [];

      await supabase
        .from("interconsultations")
        .update({
          status: "orphaned_urgency",
          escalation_level: 2,
          escalation_history: [...existingHistory, auditEntry],
        })
        .eq("id", caso.id);

      console.log("🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴");
      console.log("🔴 ORPHANED URGENCY — BROADCAST GLOBAL");
      console.log(`   Case: ${caso.case_id}`);
      console.log(`   Paciente: ${caso.paciente_nombre}`);
      console.log(`   NADIE RESPONDIÓ en ${minutesSinceCreation} min`);
      console.log("🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴");

      // Broadcast URGENTE a TODOS (incluyendo el original)
      for (const rad of pool) {
        const urgentText = [
          `🔴🔴🔴 *URGENCIA MÁXIMA AMIS* 🔴🔴🔴`,
          ``,
          `📋 *Caso:* ${caso.case_id}`,
          `👤 *Paciente:* ${caso.paciente_nombre}`,
          `🔬 *Estudio:* ${caso.estudio_tipo}`,
          ``,
          `⛔ *NADIE ha respondido en ${minutesSinceCreation} minutos.*`,
          `Este caso necesita atención *INMEDIATA*.`,
          ``,
          `💬 _"${caso.message}"_`,
          ``,
          `🔗 [📱 Abrir en AMIS AHORA](${APP_BASE_URL}/quick-view?token=${caso.magic_link_token})`,
          ``,
          `👉 Responde \`TOMO ${caso.case_id}\` para asignarte.`,
        ].join("\n");

        if (rad.telegram_chat_id) {
          const sent = await sendTelegramMessage(rad.telegram_chat_id, urgentText);
          if (sent) notifiedCount++;
        }
      }
    }
  } else {
    console.log("✅ Sin interconsultas orphaned (Nivel 2).");
  }

  return {
    escalatedCount: l1.length,
    orphanedCount: l2.length,
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
    const t0 = performance.now();
    const result = await checkSlaAndEscalate();
    const latency = (performance.now() - t0).toFixed(0);

    console.log(`⏱ SLA check completado en ${latency}ms | Escalated: ${result.escalatedCount} | Orphaned: ${result.orphanedCount} | Notificados: ${result.notifiedRadiologists}`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      latency_ms: parseInt(latency),
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
