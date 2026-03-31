-- Migration: ris_2030_integration_mappings
-- Creado: 2026-03-31
-- Descripción: Tablas base para el Cerebro de Reglas del Dashboard RIS 2030

-- 1. Table ris_institution_mapping
CREATE TABLE IF NOT EXISTS public.ris_institution_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id INTEGER NOT NULL UNIQUE,
    nombre_comercial TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.ris_institution_mapping ENABLE ROW LEVEL SECURITY;

-- 2. Table ris_doctor_mapping
CREATE TABLE IF NOT EXISTS public.ris_doctor_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id INTEGER NOT NULL UNIQUE,
    nombre_completo TEXT NOT NULL,
    especialidad TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.ris_doctor_mapping ENABLE ROW LEVEL SECURITY;

-- 3. Table ris_sla_rules (Dynamic Matrix)
CREATE TABLE IF NOT EXISTS public.ris_sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.ris_institution_mapping(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Urgencia', 'Hospitalizado', 'Ambulatorio')),
    modality TEXT NOT NULL CHECK (modality IN ('CT', 'MR', 'RX', 'US', 'MG', 'PT')),
    sla_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (institution_id, category, modality)
);

-- Habilitar RLS
ALTER TABLE public.ris_sla_rules ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura base (todos los usuarios autenticados pueden leer)
CREATE POLICY "Permitir SELECT a todos los autenticados_inst"
ON public.ris_institution_mapping
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Permitir SELECT a todos los autenticados_doc"
ON public.ris_doctor_mapping
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Permitir SELECT a todos los autenticados_sla"
ON public.ris_sla_rules
FOR SELECT TO authenticated
USING (true);
