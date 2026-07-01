-- Agrega severidad a ct_casos_criticos (Incidente grave del turno), a criterio
-- manual del tecnólogo (select, mismo catálogo 'severidad' que ya usan
-- ct_incid_personal, ct_incid_sla y ct_incid_tecnicas). Aditivo, no destructivo.
alter table public.ct_casos_criticos
    add column if not exists severidad text;
