-- Script para poblar la tabla profiles con usuarios administrativos iniciales
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Insertar perfil de Marcelo Avila (SUPER_ADMIN vitalicio)
INSERT INTO profiles (id, full_name, email, role, created_at)
VALUES (
    gen_random_uuid(),
    'Marcelo Avila',
    'marcelo.avila@amis.global',
    'SUPER_ADMIN',
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Insertar perfiles de prueba adicionales
INSERT INTO profiles (id, full_name, email, role, created_at)
VALUES 
    (gen_random_uuid(), 'Ana Martínez', 'ana.martinez@amis.global', 'ADMIN', NOW()),
    (gen_random_uuid(), 'Carlos Rodríguez', 'carlos.rodriguez@amis.global', 'MANAGER', NOW()),
    (gen_random_uuid(), 'Laura Fernández', 'laura.fernandez@amis.global', 'OPERATOR', NOW()),
    (gen_random_uuid(), 'Diego Silva', 'diego.silva@amis.global', 'VIEWER', NOW())
ON CONFLICT (email) DO UPDATE
SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Verificar que los datos se insertaron correctamente
SELECT id, full_name, email, role, created_at 
FROM profiles 
ORDER BY 
    CASE role
        WHEN 'SUPER_ADMIN' THEN 1
        WHEN 'ADMIN' THEN 2
        WHEN 'MANAGER' THEN 3
        WHEN 'OPERATOR' THEN 4
        WHEN 'VIEWER' THEN 5
    END;
