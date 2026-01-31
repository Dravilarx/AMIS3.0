-- Tabla para gestionar múltiples firmas por documento
CREATE TABLE IF NOT EXISTS document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT, -- Para identificar al usuario que firmó
    style_id TEXT,
    fingerprint TEXT NOT NULL,
    x_pos FLOAT, -- Posición en porcentaje (0-100)
    y_pos FLOAT, -- Posición en porcentaje (0-100)
    page_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Access to Signatures"
ON document_signatures FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Comentario para auditoría
COMMENT ON TABLE document_signatures IS 'Registro de todas las firmas electrónicas aplicadas a los documentos para auditoría y múltiple firma.';
