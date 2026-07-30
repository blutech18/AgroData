-- ============================================================================
-- AGRODATA - Sector statistical summaries (livestock & fisheries)
-- Mirrors `yield_statistics` (crops) for the livestock/poultry and fisheries
-- sectors. Rows are computed and persisted server-side by the
-- `compute-statistics` Edge Function, grouped by species/subsector and period.
-- ============================================================================

-- ---------- Livestock & Poultry statistics ----------------------------------
create table public.livestock_statistics (
  stat_id          bigint generated always as identity primary key,
  species_id       bigint not null references public.livestock_species (species_id) on delete cascade,
  barangay         varchar(100),
  period_type      period_type not null,
  period_start     date not null,
  period_end       date not null,
  total_inventory  int,
  total_births     int,
  total_deaths     int,
  total_disposed   int,
  total_production numeric(10,2),
  computed_at      timestamptz not null default now()
);

-- ---------- Fisheries statistics --------------------------------------------
create table public.fisheries_statistics (
  stat_id       bigint generated always as identity primary key,
  subsector     fisheries_subsector not null,
  species_name  varchar(100) not null,
  period_type   period_type not null,
  period_start  date not null,
  period_end    date not null,
  total_catch   numeric(10,2),
  catch_records int,
  computed_at   timestamptz not null default now()
);

-- ---------- Indexes ----------------------------------------------------------
create index idx_livestock_stats_species on public.livestock_statistics (species_id);
create index idx_livestock_stats_period  on public.livestock_statistics (period_start);
create index idx_fisheries_stats_period  on public.fisheries_statistics (period_start);
create index idx_fisheries_stats_species on public.fisheries_statistics (species_name);

-- ---------- Row Level Security ----------------------------------------------
alter table public.livestock_statistics enable row level security;
alter table public.fisheries_statistics enable row level security;

do $$
declare
  t text;
  stat_tables text[] := array['livestock_statistics', 'fisheries_statistics'];
begin
  foreach t in array stat_tables loop
    execute format($f$
      create policy "auth_read_%1$s"   on public.%1$s for select using (auth.role() = 'authenticated');
      create policy "auth_insert_%1$s" on public.%1$s for insert with check (auth.role() = 'authenticated');
      create policy "auth_update_%1$s" on public.%1$s for update using (auth.role() = 'authenticated');
      create policy "auth_delete_%1$s" on public.%1$s for delete using (auth.role() = 'authenticated');
    $f$, t);
  end loop;
end $$;
