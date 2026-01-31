-- FIX: Políticas de Seguridad para el Repositorio de Documentos (AMIS 3.0)
-- Este script habilita la carga de activos digitales (incluyendo documentos nativos)

-- 1. Asegurar existencia del bucket 'documents' y hacerlo público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents', 
    'documents', 
    true, 
    104857600, -- 100MB
    '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,video/mp4,video/quicktime,text/plain,text/markdown,text/html}'
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    allowed_mime_types = '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,video/mp4,video/quicktime,text/plain,text/markdown,text/html}';

-- 2. Eliminar políticas restrictivas previas
DROP POLICY IF EXISTS "Allow All" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- 3. Crear política universal para el bucket 'documents' tras la estabilización
-- Esta política permite lectura, inserción y borrado para facilitar el flujo de trabajo actual
CREATE POLICY "Full Access to Documents"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
