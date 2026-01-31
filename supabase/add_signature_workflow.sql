-- 1. Soporte para múltiples firmantes y flujo de aprobación
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS requested_signers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'; -- draft, pending_signatures, signed, rejected

-- Comentario explicativo
COMMENT ON COLUMN documents.requested_signers IS 'Lista de roles o IDs de usuarios que deben firmar el documento. Ejemplo: ["admin", "medical_director"]';

-- 2. Asegurar que la tabla document_signatures tenga referencia al usuario
ALTER TABLE document_signatures
ADD COLUMN IF NOT EXISTS signer_role TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Función para verificar si un usuario puede firmar un documento
CREATE OR REPLACE FUNCTION can_user_sign_document(doc_id UUID, user_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    req_signers JSONB;
BEGIN
    SELECT requested_signers INTO req_signers FROM documents WHERE id = doc_id;
    -- Si está vacío, cualquiera puede firmar (comportamiento legacy)
    IF req_signers IS NULL OR jsonb_array_length(req_signers) = 0 THEN
        RETURN TRUE;
    END IF;
    -- Verificar si el rol está en la lista permitida
    RETURN req_signers ? user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
