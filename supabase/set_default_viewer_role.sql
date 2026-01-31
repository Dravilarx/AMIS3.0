-- Script para configurar el rol por defecto VIEWER para nuevos usuarios
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- 1. Establecer el valor por defecto de la columna 'role' en la tabla profiles
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'VIEWER';

-- 2. Crear función que asigna rol VIEWER automáticamente a nuevos perfiles
CREATE OR REPLACE FUNCTION set_default_viewer_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no se especifica un rol, asignar VIEWER
    IF NEW.role IS NULL THEN
        NEW.role := 'VIEWER';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger que ejecuta la función antes de insertar un nuevo perfil
DROP TRIGGER IF EXISTS trigger_set_default_viewer_role ON profiles;
CREATE TRIGGER trigger_set_default_viewer_role
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_default_viewer_role();

-- 4. Verificar la configuración
SELECT 
    column_name, 
    column_default, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'role';

-- 5. Comentario explicativo
COMMENT ON COLUMN profiles.role IS 'Rol del usuario. Por defecto: VIEWER (solo lectura + carga de archivos). Opciones: SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, VIEWER';
