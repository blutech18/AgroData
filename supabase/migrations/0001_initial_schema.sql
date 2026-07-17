-- ============================================================================
-- AGRODATA - Initial Schema
-- Agricultural Data Management System (OMA, LGU Kinoguitan, Misamis Oriental)
-- PostgreSQL (Supabase) translation of the normalized relational design
-- described in the capstone Data Dictionary (Tables 1-9).
-- ============================================================================

-- ---------- Enumerated types -------------------------------------------------
create type account_status as enum ('ACTIVE', 'INACTIVE');
create type sex_type as enum ('MALE', 'FEMALE');
create type soil_type as enum ('CLAY', 'LOAM', 'SANDY');
create type irrigation_type as enum ('RAINFED', 'IRRIGATED');
create type plot_status as enum ('ACTIVE', 'FALLOW');
create type planting_status as enum ('PLANTED', 'HARVESTED', 'SPOILED');
create type period_type as enum ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- ---------- Table 1: User_Roles ---------------------------------------------
create table public.user_roles (
  role_id     bigint generated always as identity primary key,
  role_name   varchar(50)  not null unique,
  description varchar(255)
);

-- ---------- Table 2: Users ---------------------------------------------------
-- Linked 1:1 with Supabase auth.users via auth_id. Authentication is handled
-- by Supabase Auth; this table stores the application profile + role.
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

-- ---------- Table 3: Farmers -------------------------------------------------
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
  -- Consistency check (Objective 2): prevent duplicate farmer records.
  unique (first_name, last_name, birthdate, barangay)
);

-- ---------- Table 4: Farms ---------------------------------------------------
create table public.farms (
  farm_id         bigint generated always as identity primary key,
  farmer_id       bigint not null references public.farmers (farmer_id) on delete cascade,
  farm_name       varchar(100) not null,
  barangay        varchar(100) not null,
  total_area      numeric(10,2),
  soil_type       soil_type,
  irrigation_type irrigation_type
);

-- ---------- Table 5: Farm_Plots ---------------------------------------------
create table public.farm_plots (
  plot_id     bigint generated always as identity primary key,
  farm_id     bigint not null references public.farms (farm_id) on delete cascade,
  plot_number varchar(100) not null,
  plot_size   numeric(10,2) not null,
  status      plot_status not null default 'ACTIVE'
);

-- ---------- Table 6: Crops ---------------------------------------------------
create table public.crops (
  crop_id               bigint generated always as identity primary key,
  crop_name             varchar(100) not null unique,
  crop_category         varchar(100),
  expected_harvest_days int
);

-- ---------- Table 7: Planting_Records ---------------------------------------
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

-- ---------- Table 8: Harvest_Inventory --------------------------------------
create table public.harvest_inventory (
  inventory_id       bigint generated always as identity primary key,
  planting_id        bigint not null references public.planting_records (planting_id) on delete cascade,
  quantity_harvested numeric(10,2) not null,
  unit               varchar(50) not null,
  harvested_at       timestamptz not null default now()
);

-- ---------- Table 9: Yield_Statistics ---------------------------------------
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

-- ---------- Audit Logs (Use Case Table 16: Audit Logs & System Monitoring) --
create table public.audit_logs (
  log_id     bigint generated always as identity primary key,
  user_id    bigint references public.users (user_id) on delete set null,
  action     varchar(100) not null,
  entity     varchar(100),
  entity_id  varchar(100),
  details    text,
  created_at timestamptz not null default now()
);

-- ---------- Helpful indexes --------------------------------------------------
create index idx_farmers_barangay        on public.farmers (barangay);
create index idx_farms_farmer            on public.farms (farmer_id);
create index idx_plots_farm              on public.farm_plots (farm_id);
create index idx_planting_plot           on public.planting_records (plot_id);
create index idx_planting_crop           on public.planting_records (crop_id);
create index idx_planting_date           on public.planting_records (planting_date);
create index idx_harvest_planting        on public.harvest_inventory (planting_id);
create index idx_yieldstats_crop         on public.yield_statistics (crop_id);
create index idx_audit_user              on public.audit_logs (user_id);
create index idx_audit_created           on public.audit_logs (created_at);
