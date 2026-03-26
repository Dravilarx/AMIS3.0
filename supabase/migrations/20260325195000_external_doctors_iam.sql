-- Migration para el modelo IAM Zero-Friction B2B del Bot Clínico Telegram

-- Crea la tabla external_doctors usada como Whitelist para validar Médicos Derivadores
-- precargada por el administrador regional de AMIS.

CREATE TABLE IF NOT EXISTS public.external_doctors (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE NOT NULL, -- Llave de validación principal para IAM (Whitelist)
    hospital_name TEXT NOT NULL,
    telegram_chat_id BIGINT UNIQUE, -- Se vincula automáticamente vía el Webhook al compartir contacto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Indice para optimizar la búsqueda por el webhook con wildcard / ILIKE
CREATE INDEX IF NOT EXISTS idx_external_doctors_phone 
ON public.external_doctors (phone_number);

-- Políticas RLS básicas
ALTER TABLE public.external_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable Read Access for authenticated admins" 
ON public.external_doctors FOR SELECT TO authenticated USING (true);

-- Las validaciones del webhook usan una SERVICE_ROLE KEY y burlan la RLS por defecto.
