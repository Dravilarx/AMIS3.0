-- =============================================================
-- AMIS 3.0 — Migración: Configuración Multi-Contacto y IRAD
-- Centraliza alertas multi-destinatario y estado de archivo IRAD
-- Autor: Antigravity Engine
-- Fecha: 2026-04-04
-- =============================================================

-- 1. Ampliar b2b_centers con campos multi-contacto y label
ALTER TABLE IF EXISTS b2b_centers
  ADD COLUMN IF NOT EXISTS id_label TEXT DEFAULT 'RUT',
  ADD COLUMN IF NOT EXISTS contact_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_telegram_ids TEXT[] DEFAULT '{}';

COMMENT ON COLUMN b2b_centers.id_label IS 'Etiqueta del tipo de ID (ej: "RUT", "N° Cobre", "ID Minera")';
COMMENT ON COLUMN b2b_centers.contact_emails IS 'Array de correos de alerta del centro (máx. 3)';
COMMENT ON COLUMN b2b_centers.contact_telegram_ids IS 'Array de Telegram chat IDs del centro (máx. 3)';

-- Constraint de máximo 3 elementos en arrays
ALTER TABLE IF EXISTS b2b_centers
  ADD CONSTRAINT IF NOT EXISTS chk_max_emails
    CHECK (array_length(contact_emails, 1) <= 3 OR contact_emails IS NULL),
  ADD CONSTRAINT IF NOT EXISTS chk_max_telegrams
    CHECK (array_length(contact_telegram_ids, 1) <= 3 OR contact_telegram_ids IS NULL);

-- 2. Migrar campos legacy (singular) a los nuevos arrays si tienen datos
UPDATE b2b_centers
SET
  contact_emails = CASE
    WHEN alert_email IS NOT NULL AND alert_email != ''
    THEN ARRAY[alert_email]
    ELSE '{}'
  END,
  contact_telegram_ids = CASE
    WHEN telegram_chat_id IS NOT NULL AND telegram_chat_id != ''
    THEN ARRAY[telegram_chat_id]
    ELSE '{}'
  END
WHERE contact_emails = '{}' OR contact_emails IS NULL;

-- 3. Estado de archivo IRAD en multiris_production
ALTER TABLE IF EXISTS multiris_production
  ADD COLUMN IF NOT EXISTS irad_status TEXT DEFAULT 'NOT_REQUESTED'
    CHECK (irad_status IN ('NOT_REQUESTED', 'PENDING_IRAD', 'READY')),
  ADD COLUMN IF NOT EXISTS irad_requested_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS irad_ready_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS irad_package_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS irad_package_type TEXT[] DEFAULT '{}';

COMMENT ON COLUMN multiris_production.irad_status IS 'Semáforo IRAD: NOT_REQUESTED | PENDING_IRAD | READY';
COMMENT ON COLUMN multiris_production.irad_requested_at IS 'Timestamp de la solicitud de recuperación a IRAD';
COMMENT ON COLUMN multiris_production.irad_ready_at IS 'Timestamp en que el paquete IRAD quedó disponible';
COMMENT ON COLUMN multiris_production.irad_package_url IS 'URL del paquete IRAD descargable (DICOM + PDFs)';
COMMENT ON COLUMN multiris_production.irad_package_type IS 'Tipo de archivos en el paquete (DICOM, ORDEN, ANTECEDENTES)';

-- 4. Índice para búsquedas de estudios pendientes IRAD
CREATE INDEX IF NOT EXISTS idx_multiris_irad_status
  ON multiris_production(irad_status)
  WHERE irad_status IN ('PENDING_IRAD', 'READY');

-- 5. Log de despachos multi-destinatario (ampliar si ya existe)
ALTER TABLE IF EXISTS alert_dispatch_log
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recipients_detail JSONB DEFAULT '{}';

COMMENT ON COLUMN alert_dispatch_log.recipient_count IS 'Total de destinatarios notificados';
COMMENT ON COLUMN alert_dispatch_log.recipients_detail IS 'Detalle JSON de cada destinatario y su estado de entrega';
