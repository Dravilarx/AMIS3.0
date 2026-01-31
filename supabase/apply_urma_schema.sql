-- Protocolo URMA: Trazabilidad y Gestión de Ciclo de Vida
-- Este script habilita el borrado lógico y auditoría básica en las tablas principales.

-- 1. Tabla PROJECTS
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 2. Tabla BPM_TASKS
ALTER TABLE bpm_tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 3. Tabla SHIFTS
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 4. Tabla PROFESSIONALS (Opcional pero recomendado por URMA)
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 5. Tabla DOCUMENTS (Consistencia con URMA)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Índices para optimizar filtros de "no eliminados"
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON projects(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON bpm_tasks(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_shifts_not_deleted ON shifts(is_deleted) WHERE is_deleted = FALSE;
