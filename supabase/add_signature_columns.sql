-- Migración: Añadir campos de auditoría para Firma Electrónica
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signer_name TEXT,
ADD COLUMN IF NOT EXISTS signature_fingerprint TEXT;

-- Comentario para trazabilidad
COMMENT ON COLUMN documents.signature_fingerprint IS 'Hash único generado al momento de la firma para integridad del documento.';
