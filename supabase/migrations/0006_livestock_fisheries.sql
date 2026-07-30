-- ============================================================================
-- AGRODATA - Livestock/Poultry & Fisheries/Aquaculture expansion
-- Adds sector-specific records that reference the existing `farmers` table as
-- the unified agricultural-producer registry (a farmer may also be a raiser or
-- fisherfolk). Crops remain unchanged.
-- ============================================================================

-- ---------- Enumerated types -------------------------------------------------
create type livestock_category as enum ('LIVESTOCK', 'POULTRY');
create type animal_product_type as enum ('MEAT', 'MILK', 'EGGS', 'OTHER');
create type fishing_involvement as enum ('FULL_TIME', 'PART_TIME');
create type fisheries_subsector as enum ('MARINE_MUNICIPAL', 'INLAND_MUNICIPAL');
create type aqua_site_type as enum ('POND', 'CAGE', 'TANK', 'PEN');
create type water_environment as enum ('FRESHWATER', 'BRACKISH', 'MARINE');
create type aqua_cycle_status as enum ('STOCKED', 'HARVESTED', 'LOST');

-- ---------- Livestock & Poultry ---------------------------------------------
-- Reference catalog of animal species (analogous to `crops`).
create table public.livestock_species (
  species_id      bigint generated always as identity primary key,
  species_name    varchar(100) not null unique,
  category        livestock_category not null,
  primary_product varchar(100)
);

-- Periodic animal record per producer + species + barangay: inventory on a
-- reference date plus births/deaths/dispositions and optional production output.
create table public.livestock_records (
  record_id       bigint generated always as identity primary key,
  farmer_id       bigint not null references public.farmers (farmer_id) on delete cascade,
  species_id      bigint not null references public.livestock_species (species_id),
  barangay        varchar(100) not null,
  record_date     date not null,
  inventory_count int not null default 0 check (inventory_count >= 0),
  births          int not null default 0 check (births >= 0),
  deaths          int not null default 0 check (deaths >= 0),
  disposed        int not null default 0 check (disposed >= 0),
  production_type animal_product_type,
  production_qty  numeric(10,2) check (production_qty is null or production_qty >= 0),
  production_unit varchar(50),
  notes           text
);

-- ---------- Fisheries (capture) ---------------------------------------------
-- Sector profile attached 1:1 to a producer who engages in municipal fishing.
create table public.fisherfolk (
  fisherfolk_id bigint generated always as identity primary key,
  farmer_id     bigint not null unique references public.farmers (farmer_id) on delete cascade,
  barangay      varchar(100) not null,
  involvement   fishing_involvement not null default 'FULL_TIME',
  vessel_type   varchar(100),
  gear_type     varchar(100),
  registered_at timestamptz not null default now()
);

-- Fish catch records by date, subsector, species, quantity, unit.
create table public.fish_catch (
  catch_id      bigint generated always as identity primary key,
  fisherfolk_id bigint not null references public.fisherfolk (fisherfolk_id) on delete cascade,
  catch_date    date not null,
  subsector     fisheries_subsector not null default 'MARINE_MUNICIPAL',
  species_name  varchar(100) not null,
  quantity      numeric(10,2) not null check (quantity >= 0),
  unit          varchar(50) not null default 'kg',
  notes         text
);

-- ---------- Aquaculture ------------------------------------------------------
create table public.aquaculture_sites (
  site_id           bigint generated always as identity primary key,
  farmer_id         bigint not null references public.farmers (farmer_id) on delete cascade,
  site_name         varchar(100) not null,
  barangay          varchar(100) not null,
  site_type         aqua_site_type not null default 'POND',
  water_environment water_environment not null default 'FRESHWATER',
  area_size         numeric(10,2) check (area_size is null or area_size >= 0)
);

-- Managed stocking-to-harvest cycle for a species at an aquaculture site.
create table public.aquaculture_cycles (
  cycle_id      bigint generated always as identity primary key,
  site_id       bigint not null references public.aquaculture_sites (site_id) on delete cascade,
  species_name  varchar(100) not null,
  stocking_date date not null,
  stocking_qty  numeric(10,2) check (stocking_qty is null or stocking_qty >= 0),
  harvest_date  date,
  harvest_qty   numeric(10,2) check (harvest_qty is null or harvest_qty >= 0),
  unit          varchar(50) not null default 'kg',
  status        aqua_cycle_status not null default 'STOCKED',
  -- Consistency: harvest cannot precede stocking.
  check (harvest_date is null or harvest_date >= stocking_date)
);

-- ---------- Indexes ----------------------------------------------------------
create index idx_livestock_records_farmer  on public.livestock_records (farmer_id);
create index idx_livestock_records_species on public.livestock_records (species_id);
create index idx_livestock_records_date    on public.livestock_records (record_date);
create index idx_livestock_records_brgy    on public.livestock_records (barangay);
create index idx_fisherfolk_farmer         on public.fisherfolk (farmer_id);
create index idx_fish_catch_fisherfolk     on public.fish_catch (fisherfolk_id);
create index idx_fish_catch_date           on public.fish_catch (catch_date);
create index idx_aqua_sites_farmer         on public.aquaculture_sites (farmer_id);
create index idx_aqua_cycles_site          on public.aquaculture_cycles (site_id);
create index idx_aqua_cycles_stocking      on public.aquaculture_cycles (stocking_date);

-- ---------- Row Level Security ----------------------------------------------
-- Consistent with 0002: any authenticated OMA user may read/write sector data.
alter table public.livestock_species   enable row level security;
alter table public.livestock_records   enable row level security;
alter table public.fisherfolk          enable row level security;
alter table public.fish_catch          enable row level security;
alter table public.aquaculture_sites   enable row level security;
alter table public.aquaculture_cycles  enable row level security;

do $$
declare
  t text;
  sector_tables text[] := array[
    'livestock_species','livestock_records','fisherfolk',
    'fish_catch','aquaculture_sites','aquaculture_cycles'
  ];
begin
  foreach t in array sector_tables loop
    execute format($f$
      create policy "auth_read_%1$s"   on public.%1$s for select using (auth.role() = 'authenticated');
      create policy "auth_insert_%1$s" on public.%1$s for insert with check (auth.role() = 'authenticated');
      create policy "auth_update_%1$s" on public.%1$s for update using (auth.role() = 'authenticated');
      create policy "auth_delete_%1$s" on public.%1$s for delete using (auth.role() = 'authenticated');
    $f$, t);
  end loop;
end $$;

-- ---------- Seed reference species ------------------------------------------
insert into public.livestock_species (species_name, category, primary_product) values
  ('Carabao', 'LIVESTOCK', 'Milk/Draft'),
  ('Cattle',  'LIVESTOCK', 'Meat/Milk'),
  ('Goat',    'LIVESTOCK', 'Meat'),
  ('Swine',   'LIVESTOCK', 'Meat'),
  ('Chicken', 'POULTRY',   'Meat/Eggs'),
  ('Duck',    'POULTRY',   'Eggs/Meat')
on conflict (species_name) do nothing;
