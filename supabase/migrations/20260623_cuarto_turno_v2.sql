-- Agrega los campos extendidos de recibidos/entregados y hora de estabilización
alter table public.ct_turnos
    add column if not exists recibidos_fueraplazo  integer,
    add column if not exists recibidos_pendientes  integer,
    add column if not exists entregados_fueraplazo integer,
    add column if not exists entregados_pendientes integer,
    add column if not exists hora_estabilizacion   time;
