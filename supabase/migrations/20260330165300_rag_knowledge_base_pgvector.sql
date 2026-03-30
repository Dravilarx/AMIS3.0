-- ============================================================
-- FASE 1: Infraestructura RAG con pgvector
-- Cerebro Central de Contexto para Bot Telegram AMIS
-- ============================================================

-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Base de Conocimiento con embeddings (768 dims = Gemini embedding)
CREATE TABLE IF NOT EXISTS public.amis_knowledge_base (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    document_title TEXT NOT NULL,
    content_chunk TEXT NOT NULL,
    embedding extensions.vector(768),
    access_level TEXT NOT NULL DEFAULT 'internal'
        CHECK (access_level IN ('internal', 'external', 'public')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. Índice IVFFlat para búsqueda vectorial
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding 
ON public.amis_knowledge_base 
USING ivfflat (embedding extensions.vector_cosine_ops)
WITH (lists = 100);

-- 4. Índice para filtrado por nivel de acceso
CREATE INDEX IF NOT EXISTS idx_knowledge_access_level 
ON public.amis_knowledge_base (access_level);

-- 5. RLS
ALTER TABLE public.amis_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.amis_knowledge_base
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_access" ON public.amis_knowledge_base
FOR SELECT TO authenticated USING (true);

-- 6. Función de búsqueda por similitud coseno
CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding extensions.vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_access_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_title TEXT,
    content_chunk TEXT,
    access_level TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.document_title,
        kb.content_chunk,
        kb.access_level,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM public.amis_knowledge_base kb
    WHERE
        (filter_access_level IS NULL OR kb.access_level = filter_access_level)
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
