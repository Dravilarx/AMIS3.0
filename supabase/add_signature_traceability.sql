-- 1. Tabla para requerimientos de firma (Traceability)
CREATE TABLE IF NOT EXISTS document_signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    requested_by UUID, -- Quien solicita la firma
    signer_role TEXT, -- Rol requerido para firmar
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    task_id UUID -- Referencia a la tarea en el BPM para seguimiento
);

-- 2. Vincular tareas BPM con firmas
ALTER TABLE document_signatures 
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES document_signature_requests(id);

-- 3. Función para auto-crear tarea de seguimiento al solicitar firma
CREATE OR REPLACE FUNCTION create_signature_task()
RETURNS TRIGGER AS $$
DECLARE
    doc_name TEXT;
    new_task_id UUID;
BEGIN
    SELECT title INTO doc_name FROM documents WHERE id = NEW.document_id;
    
    INSERT INTO bpm_tasks (
        title,
        description,
        status,
        priority,
        assigned_to, -- Aquí idealmente se asignaría al rol o usuario específico
        category,
        metadata
    ) VALUES (
        'Firma Requerida: ' || doc_name,
        'Se requiere la firma del rol ' || NEW.signer_role || ' para el documento ' || doc_name,
        'pending',
        'high',
        NEW.signer_role, -- En nuestro sistema simplificado usamos el rol como ID de asignación
        'audit',
        jsonb_build_object('signature_request_id', NEW.id, 'document_id', NEW.document_id)
    ) RETURNING id INTO new_task_id;

    UPDATE document_signature_requests SET task_id = new_task_id WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_signature_task ON document_signature_requests;
CREATE TRIGGER trg_create_signature_task
AFTER INSERT ON document_signature_requests
FOR EACH ROW EXECUTE FUNCTION create_signature_task();
