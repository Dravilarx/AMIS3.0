-- Tabla de Configuración de Patologías Críticas por Centro

CREATE TABLE IF NOT EXISTS public.institution_critical_pathologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.ris_institution_mapping(id) ON DELETE CASCADE,
    finding_type TEXT NOT NULL, -- Ej: "ACV Hemorrágico", "Neumotórax", "Tromboembolismo"
    target_emails TEXT NOT NULL, -- Ej: "urgencias@clinica.cl, director@clinica.cl"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.institution_critical_pathologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable full access for authenticated users" 
ON public.institution_critical_pathologies 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable read for public API" 
ON public.institution_critical_pathologies 
FOR SELECT 
TO public 
USING (true);
