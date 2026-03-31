-- Migration: master_procedures_translator
-- Creado: 2026-03-31
-- Descripción: Tablas base para el Traductor Universal de Prestaciones (La Torre de Babel)

-- 1. Tabla master_procedures: El catálogo estándar dictado por AMIS.
CREATE TABLE IF NOT EXISTS public.master_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_amis TEXT UNIQUE NOT NULL,
    titulo_oficial TEXT NOT NULL,
    modalidad TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.master_procedures ENABLE ROW LEVEL SECURITY;

-- 2. Tabla procedure_mapping: El diccionario institucional
CREATE TABLE IF NOT EXISTS public.procedure_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.ris_institution_mapping(id) ON DELETE CASCADE,
    codigo_externo TEXT NOT NULL,
    master_procedure_id UUID NOT NULL REFERENCES public.master_procedures(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Restricción estricta: Una institución no puede tener el mismo código mapeado a dos procedimientos distintos
    UNIQUE (institution_id, codigo_externo) 
);

ALTER TABLE public.procedure_mapping ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura base (todos los sistemas autenticados pueden leer)
CREATE POLICY "Permitir SELECT a todos los autenticados_master"
ON public.master_procedures
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Permitir SELECT a todos los autenticados_mapping"
ON public.procedure_mapping
FOR SELECT TO authenticated
USING (true);

-- Política de lectura anon/service
CREATE POLICY "Permitir SELECT a anon_y_service_master"
ON public.master_procedures
FOR SELECT TO anon
USING (true);

CREATE POLICY "Permitir SELECT a anon_y_service_mapping"
ON public.procedure_mapping
FOR SELECT TO anon
USING (true);
