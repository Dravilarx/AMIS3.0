-- ─── Tabla de incidencias de personal ────────────────────────────────────────
create table if not exists public.ct_incid_personal (
    id               uuid primary key default gen_random_uuid(),
    id_turno         uuid references public.ct_turnos(id),
    fecha            date,
    medico           text,
    bloque_horario   text,
    tipo_incidencia  text,
    minutos_atraso   integer,
    causa            text,
    severidad        text,
    detalle          text,
    created_by       uuid references auth.users(id),
    created_at       timestamptz not null default now()
);

alter table public.ct_incid_personal enable row level security;

create policy "Autenticados pueden leer incidencias"
    on public.ct_incid_personal for select to authenticated using (true);

create policy "Autenticados pueden insertar incidencias"
    on public.ct_incid_personal for insert to authenticated
    with check (auth.uid() = created_by);

create policy "Autenticados pueden actualizar incidencias"
    on public.ct_incid_personal for update to authenticated using (true);

-- ─── Catálogos nuevos ─────────────────────────────────────────────────────────
insert into public.ct_catalogos (tipo, valor, etiqueta, orden) values
    ('tipo_incidencia_personal', 'ingreso_tardio',     'Ingreso tardío',        1),
    ('tipo_incidencia_personal', 'abandono_turno',     'Abandono de turno',     2),
    ('tipo_incidencia_personal', 'ausentismo',         'Ausentismo',            3),
    ('tipo_incidencia_personal', 'conflicto',          'Conflicto',             4),
    ('tipo_incidencia_personal', 'otro',               'Otro',                  5),
    ('causa_personal', 'enfermedad',         'Enfermedad',             1),
    ('causa_personal', 'fuerza_mayor',       'Fuerza mayor',           2),
    ('causa_personal', 'sin_justificacion',  'Sin justificación',      3),
    ('causa_personal', 'error_coordinacion', 'Error de coordinación',  4),
    ('causa_personal', 'otro',               'Otro',                   5),
    ('severidad', 'leve',     'Leve',     1),
    ('severidad', 'moderada', 'Moderada', 2),
    ('severidad', 'grave',    'Grave',    3),
    ('severidad', 'critica',  'Crítica',  4)
on conflict do nothing;
