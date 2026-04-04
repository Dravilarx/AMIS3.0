-- =============================================================
-- AMIS 3.0 — Migración: Sistema de Identidad Adaptativa
-- Soporte multi-llave: RUT, NUM_COBRE, EXTERNAL_ID
-- Autor: Antigravity Engine
-- Fecha: 2026-04-04
-- =============================================================

-- 1. Crear tipo ENUM para fuente de identificación de pacientes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_id_source_type') THEN
        CREATE TYPE patient_id_source_type AS ENUM ('RUT', 'NUM_COBRE', 'EXTERNAL_ID');
    END IF;
END $$;

-- 2. Añadir columna a b2b_centers
ALTER TABLE IF EXISTS b2b_centers
  ADD COLUMN IF NOT EXISTS patient_id_source patient_id_source_type DEFAULT 'RUT',
  ADD COLUMN IF NOT EXISTS patient_id_label TEXT DEFAULT 'RUT';

COMMENT ON COLUMN b2b_centers.patient_id_source IS 'Enum que define qué campo usar como llave de identidad del paciente: RUT, NUM_COBRE, EXTERNAL_ID';
COMMENT ON COLUMN b2b_centers.patient_id_label IS 'Etiqueta legible para mostrar en UI (ej: "RUT", "N° Cobre", "ID Empleado")';

-- 3. Añadir columna genérica de ID externo a multiris_production
ALTER TABLE IF EXISTS multiris_production
  ADD COLUMN IF NOT EXISTS external_patient_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS patient_id_source patient_id_source_type DEFAULT 'RUT';

COMMENT ON COLUMN multiris_production.external_patient_id IS 'ID externo del paciente (Número Cobre, ID Empleado, etc.)';
COMMENT ON COLUMN multiris_production.patient_id_source IS 'Tipo de identificador usado para este registro';

-- 4. Índices para búsqueda eficiente por cualquier llave
CREATE INDEX IF NOT EXISTS idx_multiris_external_patient_id
  ON multiris_production(external_patient_id)
  WHERE external_patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_multiris_patient_id_source
  ON multiris_production(patient_id_source);

-- 5. Vista utilitaria: resolver ID efectivo del paciente
CREATE OR REPLACE FUNCTION resolve_patient_id(
  p_record multiris_production
) RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT CASE p_record.patient_id_source
    WHEN 'RUT' THEN p_record.paciente_id
    WHEN 'NUM_COBRE' THEN p_record.external_patient_id
    WHEN 'EXTERNAL_ID' THEN p_record.external_patient_id
    ELSE p_record.paciente_id
  END;
$$;

COMMENT ON FUNCTION resolve_patient_id IS 'Resuelve el identificador efectivo del paciente según la fuente configurada en el centro B2B';
