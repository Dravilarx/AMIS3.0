-- ─── Catálogos del 4° Turno ──────────────────────────────────────────────────
create table if not exists public.ct_catalogos (
    id          uuid primary key default gen_random_uuid(),
    tipo        text not null,
    valor       text not null,
    etiqueta    text not null,
    orden       integer not null default 0,
    activo      boolean not null default true,
    created_at  timestamptz not null default now()
);

-- Tipos de turno predeterminados
insert into public.ct_catalogos (tipo, valor, etiqueta, orden) values
    ('tipo_turno', 'dia',       'Diurno (07:00–15:00)',    1),
    ('tipo_turno', 'tarde',     'Tarde (15:00–23:00)',     2),
    ('tipo_turno', 'noche',     'Nocturno (23:00–07:00)',  3),
    ('tipo_turno', 'especial',  'Turno Especial',          4)
on conflict do nothing;

-- ─── Turnos del 4° Turno ─────────────────────────────────────────────────────
create table if not exists public.ct_turnos (
    id                  uuid primary key default gen_random_uuid(),
    fecha               date not null,
    tipo_turno          text not null,
    hora_inicio         time,
    hora_fin            time,
    estabilizado        boolean not null default false,
    apoyo_medico_extra  boolean not null default false,
    recibidos           integer,
    entregados          integer,
    observaciones       text,
    created_by          uuid references auth.users(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists ct_turnos_updated_at on public.ct_turnos;
create trigger ct_turnos_updated_at
    before update on public.ct_turnos
    for each row execute function public.set_updated_at();

-- RLS
alter table public.ct_turnos  enable row level security;
alter table public.ct_catalogos enable row level security;

create policy "Autenticados pueden leer turnos"
    on public.ct_turnos for select to authenticated using (true);

create policy "Autenticados pueden insertar turnos"
    on public.ct_turnos for insert to authenticated
    with check (auth.uid() = created_by);

create policy "Autenticados pueden actualizar turnos"
    on public.ct_turnos for update to authenticated using (true);

create policy "Autenticados pueden leer catálogos"
    on public.ct_catalogos for select to authenticated using (true);
