-- ═══════════════════════════════════════════════════════════════
-- 🚀 AMIS 3.0 — Sprint Backend Core: Schema Evolution
-- dispatch_engine_schema_evolution
-- ═══════════════════════════════════════════════════════════════
-- Fecha: 2026-03-19
-- Descripción: Evoluciona el schema para soportar escalamiento
-- multinivel y broadcast al pool de radiólogos.
-- ═══════════════════════════════════════════════════════════════

-- 1. Agregar 'orphaned_urgency' al enum interconsult_status
ALTER TYPE interconsult_status ADD VALUE IF NOT EXISTS 'orphaned_urgency' AFTER 'escalated';

-- 2. Columnas de escalamiento multinivel en interconsultations
ALTER TABLE interconsultations
  ADD COLUMN IF NOT EXISTS escalation_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_history jsonb[] DEFAULT '{}';

-- 3. Agregar telegram_chat_id a professionals (para pool de broadcast)
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;

-- 4. Índice parcial para escalaciones activas
-- (requiere transacción separada después del commit del nuevo enum value)
CREATE INDEX IF NOT EXISTS idx_interconsult_escalated
  ON interconsultations (escalated_at)
  WHERE status IN ('escalated', 'orphaned_urgency');

-- 5. Comentarios de documentación
COMMENT ON COLUMN interconsultations.escalation_level IS 'Nivel de escalamiento: 0=normal, 1=escalated, 2=orphaned_urgency';
COMMENT ON COLUMN interconsultations.escalation_history IS 'Audit trail JSONB: cada entrada contiene {action, from_status, to_status, timestamp, ...}';
COMMENT ON COLUMN professionals.telegram_chat_id IS 'Chat ID de Telegram del profesional para notificaciones omnicanal';
