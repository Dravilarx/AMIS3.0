-- =============================================================
-- AMIS 3.0 — Migración: Sistema de Alertas Globales
-- Autor: Antigravity Engine
-- Fecha: 2026-04-04
-- =============================================================

-- 1. Añadir campos de contacto de alerta a b2b_centers
ALTER TABLE IF EXISTS b2b_centers
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alert_email TEXT DEFAULT NULL;

COMMENT ON COLUMN b2b_centers.telegram_chat_id IS 'Chat ID de Telegram para enviar alertas al centro B2B';
COMMENT ON COLUMN b2b_centers.alert_email IS 'Email de contacto para alertas críticas de este centro';

-- 2. Añadir campo de hallazgo crítico a multiris_production
ALTER TABLE IF EXISTS multiris_production
  ADD COLUMN IF NOT EXISTS is_critical_finding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS critical_finding_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS critical_finding_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS critical_finding_by TEXT DEFAULT NULL;

COMMENT ON COLUMN multiris_production.is_critical_finding IS 'Marca de hallazgo crítico vital detectado por el radiólogo';
COMMENT ON COLUMN multiris_production.critical_finding_notes IS 'Notas del radiólogo sobre el hallazgo crítico';
COMMENT ON COLUMN multiris_production.critical_finding_at IS 'Timestamp de cuando se marcó el hallazgo crítico';
COMMENT ON COLUMN multiris_production.critical_finding_by IS 'Nombre público del médico que marcó el hallazgo (Identity Shield)';

-- 3. Tabla de log de alertas enviadas (auditoría)
CREATE TABLE IF NOT EXISTS alert_dispatch_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('PENDING_CENTER_ACTION', 'CRITICAL_FINDING')),
  report_id UUID REFERENCES multiris_production(id),
  center_aetitle TEXT,
  patient_rut TEXT,
  recipient_telegram TEXT,
  recipient_email TEXT,
  message_sent TEXT,
  signed_by TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'SENT'
);

COMMENT ON TABLE alert_dispatch_log IS 'Registro de todas las alertas externas enviadas por dispatch-global-alerts';

-- 4. Índice para consultas rápidas de alertas
CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_type ON alert_dispatch_log(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_dispatch_log_report ON alert_dispatch_log(report_id);
CREATE INDEX IF NOT EXISTS idx_multiris_critical ON multiris_production(is_critical_finding) WHERE is_critical_finding = TRUE;

-- 5. RLS para alert_dispatch_log
ALTER TABLE alert_dispatch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and chiefs can read alert logs"
  ON alert_dispatch_log FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Service role can insert alert logs"
  ON alert_dispatch_log FOR INSERT
  WITH CHECK (true);
