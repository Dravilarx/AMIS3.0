-- Migración para añadir soporte a Hilos de Conversación y Mensajes Guardados en AMIS 3.0
-- Ejecutar este script en el Editor SQL de Supabase

-- 1. Añadir columna para mensajes guardados (favoritos)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;

-- 2. Añadir columnas para hilos de conversación y respuestas
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reply_to JSONB;

-- 3. Crear índices para optimizar la búsqueda de hilos
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id);

-- 4. (Opcional) Si la tabla de canales no tiene el tipo 'group', asegurémonos de que el enum o check lo permita
-- ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_type_check;
-- ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK (type IN ('shift', 'project', 'direct', 'group'));

COMMENT ON COLUMN public.messages.parent_id IS 'ID del mensaje raíz del hilo.';
COMMENT ON COLUMN public.messages.reply_to IS 'Objeto con metadatos del mensaje al que se está respondiendo directamente.';
