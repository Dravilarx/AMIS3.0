-- Fase 1: Añadir columnas de personalización a document_signatures
-- Este script añade soporte para tamaño y color de firma

-- Añadir columnas para personalización de firma
ALTER TABLE document_signatures
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue' CHECK (color IN ('blue', 'black', 'gray'));

-- Comentarios para documentación
COMMENT ON COLUMN document_signatures.size IS 'Tamaño de la firma: small (100px), medium (140px), large (180px)';
COMMENT ON COLUMN document_signatures.color IS 'Color de la firma: blue (rgb(37,99,235)), black (rgb(0,0,0)), gray (rgb(107,114,128))';
