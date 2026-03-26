-- Expansión de la tabla external_doctors para soportar el Módulo de Onboarding Masivo B2B (Plantilla Excel)

ALTER TABLE public.external_doctors
ADD COLUMN IF NOT EXISTS rut TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Opcional: Índice adicional para RUT para optimizaciones de upsert
CREATE INDEX IF NOT EXISTS idx_external_doctors_rut 
ON public.external_doctors (rut);
