-- Lógica de "Inteligencia de Misión"

-- 1. State Machine de Informes
CREATE TYPE report_status AS ENUM ('PENDING_INFO', 'REPORTED', 'VALIDATED');

CREATE TABLE IF NOT EXISTS public.dicom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_uid TEXT UNIQUE NOT NULL, -- The DICOM Study Instance UID
    status report_status DEFAULT 'PENDING_INFO',
    
    -- Structure 5 Sections (Obligatorias para transición de estado)
    section_title TEXT,
    section_technique TEXT,
    section_background TEXT,
    section_findings TEXT,
    section_impression TEXT,
    
    -- Authorship (Usamos UUIDs de los usuarios, pueden ser de auth.users o legacy IDs string)
    reported_by UUID, 
    validated_by UUID, 
    
    reported_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.dicom_reports ENABLE ROW LEVEL SECURITY;

-- 2. Motor de Notificaciones Críticas
CREATE TABLE IF NOT EXISTS public.critical_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_uid TEXT NOT NULL REFERENCES public.dicom_reports(study_uid) ON DELETE CASCADE,
    finding_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'SENT'
);

ALTER TABLE public.critical_notifications ENABLE ROW LEVEL SECURITY;

-- Bypass for API with Service Role Key
CREATE POLICY "Enable Full Access dicom_reports" ON public.dicom_reports FOR ALL USING (true);
CREATE POLICY "Enable Full Access critical_notifications" ON public.critical_notifications FOR ALL USING (true);
