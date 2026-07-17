-- ============================================================================
-- AGRODATA - COMPLETE SETUP SCRIPT (run once in Supabase SQL Editor)
-- This combines schema + RLS policies + seed data. Paste the whole file into
-- Supabase Studio -> SQL Editor -> New query -> Run.
-- Safe to re-run: it drops existing AGRODATA tables/types first.
-- ============================================================================

-- ---------- Clean slate (idempotent) ----------------------------------------
drop table if exists public.audit_logs        cascade;
drop table if exists public.yield_statistics  cascade;
drop table if exists public.harvest_inventory cascade;
drop table if exists public.planting_records  cascade;
drop table if exists public.crops             cascade;
drop table if exists public.farm_plots        cascade;
drop table if exists public.farms             cascade;
drop table if exists public.farmers           cascade;
drop table if exists public.users             cascade;
drop table if exists public.user_roles        cascade;

drop type if exists account_status  cascade;
drop type if exists sex_type         cascade;
drop type if exists soil_type        cascade;
drop type if exists irrigation_type  cascade;
drop type if exists plot_status      cascade;
drop type if exists planting_status  cascade;
drop type if exists period_type      cascade;

-- ---------- Enumerated types -------------------------------------------------
create type account_status as enum ('ACTIVE', 'INACTIVE');
create type sex_type as enum ('MALE', 'FEMALE');
create type soil_type as enum ('CLAY', 'LOAM', 'SANDY');
create type irrigation_type as enum ('RAINFED', 'IRRIGATED');
create type plot_status as enum ('ACTIVE', 'FALLOW');
create type planting_status as enum ('PLANTED', 'HARVESTED', 'SPOILED');
create type period_type as enum ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- ---------- Tables -----------------------------------------------------------
create table public.user_roles (
  role_id     bigint generated always as identity primary key,
  role_name   varchar(50)  not null unique,
  description varchar(255)
);

create table public.users (
  user_id        bigint generated always as identity primary key,
  auth_id        uuid unique references auth.users (id) on delete set null,
  role_id        bigint references public.user_roles (role_id),
  first_name     varchar(100) not null,
  last_name      varchar(100) not null,
  email          varchar(100) not null unique,
  username       varchar(50)  not null unique,
  account_status account_status not null default 'ACTIVE',
  created_at     timestamptz not null default now()
);

create table public.farmers (
  farmer_id         bigint generated always as identity primary key,
  user_id           bigint references public.users (user_id) on delete set null,
  first_name        varchar(50)  not null,
  last_name         varchar(50)  not null,
  sex               sex_type     not null,
  birthdate         date         not null,
  contact_no        varchar(15)  not null,
  address           varchar(255) not null,
  barangay          varchar(100) not null,
  registration_date timestamptz  not null default now(),
  unique (first_name, last_name, birthdate, barangay)
);

create table public.farms (
  farm_id         bigint generated always as identity primary key,
  farmer_id       bigint not null references public.farmers (farmer_id) on delete cascade,
  farm_name       varchar(100) not null,
  barangay        varchar(100) not null,
  total_area      numeric(10,2),
  soil_type       soil_type,
  irrigation_type irrigation_type
);

create table public.farm_plots (
  plot_id     bigint generated always as identity primary key,
  farm_id     bigint not null references public.farms (farm_id) on delete cascade,
  plot_number varchar(100) not null,
  plot_size   numeric(10,2) not null,
  status      plot_status not null default 'ACTIVE'
);

create table public.crops (
  crop_id               bigint generated always as identity primary key,
  crop_name             varchar(100) not null unique,
  crop_category         varchar(100),
  expected_harvest_days int
);

create table public.planting_records (
  planting_id           bigint generated always as identity primary key,
  plot_id               bigint not null references public.farm_plots (plot_id) on delete cascade,
  crop_id               bigint not null references public.crops (crop_id),
  planting_date         date not null,
  expected_harvest_date date,
  actual_harvest_date   date,
  area_planted          numeric(10,2) not null,
  quantity_planted      int,
  planting_unit         varchar(50) not null,
  planting_status       planting_status not null default 'PLANTED'
);

create table public.harvest_inventory (
  inventory_id       bigint generated always as identity primary key,
  planting_id        bigint not null references public.planting_records (planting_id) on delete cascade,
  quantity_harvested numeric(10,2) not null,
  unit               varchar(50) not null,
  harvested_at       timestamptz not null default now()
);

create table public.yield_statistics (
  stat_id                   bigint generated always as identity primary key,
  crop_id                   bigint not null references public.crops (crop_id) on delete cascade,
  barangay                  varchar(100),
  period_type               period_type not null,
  period_start              date not null,
  period_end                date not null,
  total_area_planted        numeric(10,2),
  total_yield               numeric(10,2),
  average_yield_per_hectare numeric(10,2),
  farmer_count              int,
  computed_at               timestamptz not null default now()
);

create table public.audit_logs (
  log_id     bigint generated always as identity primary key,
  user_id    bigint references public.users (user_id) on delete set null,
  action     varchar(100) not null,
  entity     varchar(100),
  entity_id  varchar(100),
  details    text,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------------------------------------------------------
create index idx_farmers_barangay  on public.farmers (barangay);
create index idx_farms_farmer       on public.farms (farmer_id);
create index idx_plots_farm          on public.farm_plots (farm_id);
create index idx_planting_plot       on public.planting_records (plot_id);
create index idx_planting_crop       on public.planting_records (crop_id);
create index idx_planting_date       on public.planting_records (planting_date);
create index idx_harvest_planting    on public.harvest_inventory (planting_id);
create index idx_yieldstats_crop     on public.yield_statistics (crop_id);
create index idx_audit_user          on public.audit_logs (user_id);
create index idx_audit_created       on public.audit_logs (created_at);

-- ---------- RLS helper functions --------------------------------------------
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select r.role_name
  from public.users u
  join public.user_roles r on r.role_id = u.role_id
  where u.auth_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'Municipal Agriculturalist', false);
$$;

-- True only when the logged-in auth user has an ACTIVE profile in public.users.
-- Used to gate data access so a bare auth signup (no profile) sees nothing.
create or replace function public.has_active_profile()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.auth_id = auth.uid() and u.account_status = 'ACTIVE'
  );
$$;

-- ---------- Enable RLS -------------------------------------------------------
alter table public.user_roles        enable row level security;
alter table public.users             enable row level security;
alter table public.farmers           enable row level security;
alter table public.farms             enable row level security;
alter table public.farm_plots        enable row level security;
alter table public.crops             enable row level security;
alter table public.planting_records  enable row level security;
alter table public.harvest_inventory enable row level security;
alter table public.yield_statistics  enable row level security;
alter table public.audit_logs        enable row level security;

-- ---------- Policies: agricultural data (requires an ACTIVE OMA profile) ----
do $$
declare
  t text;
  data_tables text[] := array[
    'farmers','farms','farm_plots','crops',
    'planting_records','harvest_inventory','yield_statistics'
  ];
begin
  foreach t in array data_tables loop
    execute format($f$
      create policy "auth_read_%1$s"   on public.%1$s for select using (public.has_active_profile());
      create policy "auth_insert_%1$s" on public.%1$s for insert with check (public.has_active_profile());
      create policy "auth_update_%1$s" on public.%1$s for update using (public.has_active_profile());
      create policy "auth_delete_%1$s" on public.%1$s for delete using (public.has_active_profile());
    $f$, t);
  end loop;
end $$;

create policy "roles_read"  on public.user_roles for select using (public.has_active_profile());
create policy "roles_write" on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

create policy "users_read_self_or_admin" on public.users for select
  using (auth_id = auth.uid() or public.is_admin());
create policy "users_admin_write" on public.users for all
  using (public.is_admin()) with check (public.is_admin());

create policy "audit_read"   on public.audit_logs for select using (public.has_active_profile());
create policy "audit_insert" on public.audit_logs for insert with check (public.has_active_profile());

-- ---------- Seed data --------------------------------------------------------
insert into public.user_roles (role_name, description) values
  ('Municipal Agriculturalist', 'Administrator with full access including user and role management, backup, and audit logs.'),
  ('OMA Staff', 'Office staff who manage farmer profiles, land records, crop data, reports, and analytics.')
on conflict (role_name) do nothing;

insert into public.crops (crop_name, crop_category, expected_harvest_days) values
  ('Rice (Palay)',  'Cereal',       110),
  ('Yellow Corn',   'Cereal',       95),
  ('White Corn',    'Cereal',       95),
  ('Coconut',       'Plantation',   2555),
  ('Banana',        'Fruit',        300),
  ('Cassava',       'Root Crop',    270),
  ('Sweet Potato',  'Root Crop',    120),
  ('Tomato',        'Vegetable',    75),
  ('Eggplant',      'Vegetable',    70),
  ('Coffee',        'Plantation',   1095)
on conflict (crop_name) do nothing;

-- ============================================================================
-- NEXT: create your first admin login
-- 1) Supabase Studio -> Authentication -> Users -> Add user
--    (email + password, e.g. admin@kinoguitan.gov.ph). Copy its UUID.
-- 2) Replace the UUID below and run this insert:
--
-- insert into public.users (auth_id, role_id, first_name, last_name, email, username)
-- values (
--   'PASTE-AUTH-UUID-HERE',
--   (select role_id from public.user_roles where role_name = 'Municipal Agriculturalist'),
--   'Maria', 'Santos', 'admin@kinoguitan.gov.ph', 'admin'
-- );
-- ============================================================================

-- ============================================================================
-- Backup & Restore support (identity columns settable for ID-preserving restore)
-- ============================================================================
alter table public.user_roles        alter column role_id     set generated by default;
alter table public.users             alter column user_id     set generated by default;
alter table public.farmers           alter column farmer_id   set generated by default;
alter table public.farms             alter column farm_id     set generated by default;
alter table public.farm_plots        alter column plot_id     set generated by default;
alter table public.crops             alter column crop_id     set generated by default;
alter table public.planting_records  alter column planting_id set generated by default;
alter table public.harvest_inventory alter column inventory_id set generated by default;
alter table public.yield_statistics  alter column stat_id     set generated by default;
alter table public.audit_logs        alter column log_id      set generated by default;

create or replace function public.resync_identity_sequences()
returns void language plpgsql security definer set search_path = public as $$
declare
  cols text[][] := array[
    array['user_roles','role_id'], array['users','user_id'],
    array['farmers','farmer_id'], array['farms','farm_id'],
    array['farm_plots','plot_id'], array['crops','crop_id'],
    array['planting_records','planting_id'], array['harvest_inventory','inventory_id'],
    array['yield_statistics','stat_id'], array['audit_logs','log_id']
  ];
  c text[]; seq text; maxid bigint;
begin
  foreach c slice 1 in array cols loop
    seq := pg_get_serial_sequence('public.' || c[1], c[2]);
    execute format('select max(%I) from public.%I', c[2], c[1]) into maxid;
    perform setval(seq, coalesce(maxid, 1), maxid is not null);
  end loop;
end $$;

grant execute on function public.resync_identity_sequences() to authenticated;
