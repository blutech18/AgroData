-- ============================================================================
-- AGRODATA - SAMPLE / DEMO DATA
-- ----------------------------------------------------------------------------
-- Populates farmers (the unified producer registry), farms, plots, multi-year
-- planting & harvest records, livestock/poultry records, fisherfolk and fish
-- catch, aquaculture sites and culture cycles, stored crop/livestock/fisheries
-- statistics, and a few audit logs so the dashboard, analytics, trends, and all
-- six reports show meaningful content across every sector.
--
-- Run AFTER setup_all.sql (which already seeds roles + crops).
-- Paste into Supabase Studio -> SQL Editor -> Run.
--
-- Idempotent, in two independently guarded blocks: the crop block skips when
-- producers already exist, and the sector block skips when sector records
-- already exist. A database that already has crop sample data can therefore
-- still receive livestock, fisheries, and aquaculture demo data.
-- Barangay names use actual Kinoguitan, Misamis Oriental barangays.
-- ============================================================================

do $$
begin
  if (select count(*) from public.farmers) > 0 then
    raise notice 'AGRODATA sample data already present - skipping.';
    return;
  end if;

  -- ---------- Farmers (spread across actual Kinoguitan barangays) -----------
  insert into public.farmers (first_name, last_name, sex, birthdate, contact_no, address, barangay) values
    ('Juan',     'Dela Cruz', 'MALE',   '1980-03-12', '09171234001', 'Purok 1, Bolisong',    'Bolisong'),
    ('Maria',    'Santos',    'FEMALE', '1985-07-22', '09171234002', 'Purok 2, Buko',        'Buko'),
    ('Pedro',    'Reyes',     'MALE',   '1978-11-05', '09171234003', 'Purok 3, Poblacion',   'Poblacion'),
    ('Ana',      'Lim',       'FEMALE', '1990-01-30', '09171234004', 'Purok 1, Esperanza',   'Esperanza'),
    ('Jose',     'Garcia',    'MALE',   '1975-09-18', '09171234005', 'Purok 4, Panabol',     'Panabol'),
    ('Liza',     'Tan',       'FEMALE', '1988-05-14', '09171234006', 'Purok 2, Sumalag',     'Sumalag'),
    ('Mark',     'Villamor',  'MALE',   '1982-12-02', '09171234007', 'Purok 1, Bolisong',    'Bolisong'),
    ('Grace',    'Bautista',  'FEMALE', '1992-08-09', '09171234008', 'Purok 3, Buko',        'Buko'),
    ('Ramon',    'Aquino',    'MALE',   '1970-04-25', '09171234009', 'Purok 2, Poblacion',   'Poblacion'),
    ('Cecilia',  'Flores',    'FEMALE', '1986-06-17', '09171234010', 'Purok 5, Esperanza',   'Esperanza'),
    ('Danilo',   'Mercado',   'MALE',   '1983-02-28', '09171234011', 'Purok 1, Panabol',     'Panabol'),
    ('Rosa',     'Navarro',   'FEMALE', '1979-10-11', '09171234012', 'Purok 4, Sumalag',     'Sumalag');

  -- ---------- One farm per farmer ------------------------------------------
  insert into public.farms (farmer_id, farm_name, barangay, total_area, soil_type, irrigation_type)
  select f.farmer_id,
         f.last_name || ' Farm',
         f.barangay,
         round((random() * 4 + 1)::numeric, 2),
         (array['CLAY','LOAM','SANDY']::soil_type[])[1 + floor(random() * 3)::int],
         (array['RAINFED','IRRIGATED']::irrigation_type[])[1 + floor(random() * 2)::int]
  from public.farmers f;

  -- ---------- One active plot per farm -------------------------------------
  insert into public.farm_plots (farm_id, plot_number, plot_size, status)
  select fm.farm_id,
         'PLOT-' || fm.farm_id,
         round((random() * 2 + 0.5)::numeric, 2),
         'ACTIVE'
  from public.farms fm;

  -- ---------- Historical plantings (2021-2025) + linked harvests -----------
  -- Yield-per-hectare rises year over year so trend analysis
  -- show a clear upward pattern.
  with new_plantings as (
    insert into public.planting_records (
      plot_id, crop_id, planting_date, expected_harvest_date, actual_harvest_date,
      area_planted, quantity_planted, planting_unit, planting_status
    )
    select p.plot_id,
           (select crop_id from public.crops order by random() limit 1),
           make_date(y, 1, 15),
           make_date(y, 4, 25),
           make_date(y, 5, 5),
           round((random() * 1.5 + 0.5)::numeric, 2),
           (50 + random() * 100)::int,
           'kg',
           'HARVESTED'
    from public.farm_plots p
    cross join generate_series(2021, 2025) as y
    returning planting_id, area_planted, planting_date
  )
  insert into public.harvest_inventory (planting_id, quantity_harvested, unit, harvested_at)
  select np.planting_id,
         round((np.area_planted *
                (1000 + (extract(year from np.planting_date)::int - 2021) * 180 + random() * 150))::numeric, 2),
         'kg',
         np.planting_date + interval '115 days'
  from new_plantings np;

  -- ---------- Current-season active plantings (not yet harvested) ----------
  insert into public.planting_records (
    plot_id, crop_id, planting_date, expected_harvest_date,
    area_planted, quantity_planted, planting_unit, planting_status
  )
  select p.plot_id,
         (select crop_id from public.crops order by random() limit 1),
         make_date(2026, 3, 1),
         make_date(2026, 6, 30),
         round((random() * 1.5 + 0.5)::numeric, 2),
         (50 + random() * 100)::int,
         'kg',
         'PLANTED'
  from public.farm_plots p;

  -- ---------- Yearly yield statistics per crop (computed summaries) --------
  insert into public.yield_statistics (
    crop_id, barangay, period_type, period_start, period_end,
    total_area_planted, total_yield, average_yield_per_hectare, farmer_count, computed_at
  )
  select pr.crop_id,
         null,
         'YEARLY',
         make_date(extract(year from pr.planting_date)::int, 1, 1),
         make_date(extract(year from pr.planting_date)::int, 12, 31),
         round(sum(pr.area_planted), 2),
         round(sum(hi.quantity_harvested), 2),
         round(sum(hi.quantity_harvested) / nullif(sum(pr.area_planted), 0), 2),
         count(distinct fm.farmer_id),
         now()
  from public.planting_records pr
  join public.harvest_inventory hi on hi.planting_id = pr.planting_id
  join public.farm_plots p on p.plot_id = pr.plot_id
  join public.farms fm on fm.farm_id = p.farm_id
  group by pr.crop_id, extract(year from pr.planting_date);

  raise notice 'AGRODATA crop sample data inserted successfully.';
end $$;

-- ============================================================================
-- SECTOR SAMPLE DATA - livestock/poultry, fisheries, aquaculture
-- ----------------------------------------------------------------------------
-- Guarded independently from the crop block above so a database that already
-- holds crop sample data can still receive sector demo data. Requires at least
-- one producer, and skips if any sector records already exist.
-- ============================================================================
do $$
begin
  if (select count(*) from public.farmers) = 0 then
    raise notice 'AGRODATA sector sample data skipped - no producers registered yet.';
    return;
  end if;

  if (select count(*) from public.livestock_records) > 0
     or (select count(*) from public.fisherfolk) > 0
     or (select count(*) from public.aquaculture_sites) > 0 then
    raise notice 'AGRODATA sector sample data already present - skipping.';
    return;
  end if;

  -- ==========================================================================
  -- LIVESTOCK & POULTRY
  -- Periodic inventory/production records per producer + species + barangay.
  -- Species are already seeded by setup_all.sql (migration 0006).
  -- ==========================================================================
  insert into public.livestock_records (
    farmer_id, species_id, barangay, record_date, inventory_count,
    births, deaths, disposed, production_type, production_qty, production_unit, notes
  )
  select f.farmer_id,
         s.species_id,
         f.barangay,
         d.record_date,
         -- Poultry is kept in larger numbers than large livestock.
         case when s.category = 'POULTRY'
              then (40 + random() * 120)::int
              else (3 + random() * 22)::int
         end,
         (random() * 4)::int,
         (random() * 2)::int,
         (random() * 3)::int,
         case s.species_name
           when 'Chicken' then 'EGGS'::animal_product_type
           when 'Duck'    then 'EGGS'::animal_product_type
           when 'Carabao' then 'MILK'::animal_product_type
           when 'Cattle'  then 'MILK'::animal_product_type
           else 'MEAT'::animal_product_type
         end,
         round((random() * 90 + 10)::numeric, 2),
         case when s.species_name in ('Chicken', 'Duck') then 'trays'
              when s.species_name in ('Carabao', 'Cattle') then 'liters'
              else 'kg'
         end,
         null
  from public.farmers f
  cross join public.livestock_species s
  cross join (values
    (date '2025-03-31'), (date '2025-06-30'),
    (date '2025-09-30'), (date '2025-12-31'),
    (date '2026-03-31'), (date '2026-06-30')
  ) as d(record_date);

  -- ==========================================================================
  -- FISHERIES (capture) - fisherfolk profiles + monthly catch records
  -- ==========================================================================
  -- Roughly two-thirds of producers also fish. Selection is by row position
  -- rather than barangay name, so the seed behaves the same on a database whose
  -- producers were entered by hand.
  insert into public.fisherfolk (farmer_id, barangay, involvement, vessel_type, gear_type)
  select f.farmer_id,
         f.barangay,
         case when f.rn % 2 = 0 then 'PART_TIME'::fishing_involvement
              else 'FULL_TIME'::fishing_involvement end,
         case when f.rn % 3 = 0 then 'Non-motorized banca' else 'Motorized banca' end,
         case when f.rn % 2 = 0 then 'Hook and line' else 'Gill net' end
  from (
    select farmer_id, barangay, row_number() over (order by farmer_id) as rn
    from public.farmers
  ) f
  where f.rn % 3 <> 0;

  insert into public.fish_catch (
    fisherfolk_id, catch_date, subsector, species_name, quantity, unit, notes
  )
  select ff.fisherfolk_id,
         make_date(p.yr, p.mo, 15),
         -- Poblacion records represent inland municipal waters.
         case when ff.barangay = 'Poblacion' then 'INLAND_MUNICIPAL'::fisheries_subsector
              else 'MARINE_MUNICIPAL'::fisheries_subsector end,
         (array['Bangus', 'Tilapia', 'Tuna', 'Galunggong', 'Squid'])[
           1 + ((p.mo + ff.fisherfolk_id) % 5)
         ],
         round((random() * 45 + 5)::numeric, 2),
         'kg',
         null
  from public.fisherfolk ff
  cross join (
    select 2025 as yr, mo from generate_series(1, 12) as mo
    union all
    select 2026 as yr, mo from generate_series(1, 6) as mo
  ) as p;

  -- ==========================================================================
  -- AQUACULTURE - sites and stocking-to-harvest cycles
  -- ==========================================================================
  -- Four producers operate an aquaculture site, chosen by row position so the
  -- seed does not depend on specific barangay names existing.
  insert into public.aquaculture_sites (
    farmer_id, site_name, barangay, site_type, water_environment, area_size
  )
  select f.farmer_id,
         f.last_name || ' Fishpond',
         f.barangay,
         case when f.rn % 2 = 0 then 'POND'::aqua_site_type
              else 'CAGE'::aqua_site_type end,
         case when f.rn % 2 = 0 then 'FRESHWATER'::water_environment
              else 'BRACKISH'::water_environment end,
         round((random() * 0.8 + 0.2)::numeric, 2)
  from (
    select farmer_id, last_name, barangay, row_number() over (order by farmer_id) as rn
    from public.farmers
  ) f
  where f.rn <= 4;

  -- Completed cycle (harvested) per site.
  insert into public.aquaculture_cycles (
    site_id, species_name, stocking_date, stocking_qty,
    harvest_date, harvest_qty, unit, status
  )
  select s.site_id,
         case when s.water_environment = 'BRACKISH' then 'Bangus' else 'Tilapia' end,
         date '2025-01-20',
         round((random() * 2000 + 1000)::numeric, 2),
         date '2025-06-25',
         round((random() * 600 + 300)::numeric, 2),
         'kg',
         'HARVESTED'
  from public.aquaculture_sites s;

  -- Ongoing cycle (still stocked) per site.
  insert into public.aquaculture_cycles (
    site_id, species_name, stocking_date, stocking_qty, unit, status
  )
  select s.site_id,
         case when s.water_environment = 'BRACKISH' then 'Bangus' else 'Tilapia' end,
         date '2026-02-10',
         round((random() * 2500 + 1200)::numeric, 2),
         'kg',
         'STOCKED'
  from public.aquaculture_sites s;

  -- ==========================================================================
  -- Stored sector statistics (yearly), mirroring yield_statistics for crops.
  -- The compute-statistics Edge Function recomputes these on demand.
  -- ==========================================================================
  insert into public.livestock_statistics (
    species_id, barangay, period_type, period_start, period_end,
    total_inventory, total_births, total_deaths, total_disposed,
    total_production, computed_at
  )
  select lr.species_id,
         null,
         'YEARLY',
         make_date(extract(year from lr.record_date)::int, 1, 1),
         make_date(extract(year from lr.record_date)::int, 12, 31),
         sum(lr.inventory_count),
         sum(lr.births),
         sum(lr.deaths),
         sum(lr.disposed),
         round(sum(coalesce(lr.production_qty, 0)), 2),
         now()
  from public.livestock_records lr
  group by lr.species_id, extract(year from lr.record_date);

  insert into public.fisheries_statistics (
    subsector, species_name, unit, period_type, period_start, period_end,
    total_catch, catch_records, computed_at
  )
  select fc.subsector,
         fc.species_name,
         coalesce(nullif(fc.unit, ''), 'kg'),
         'YEARLY',
         make_date(extract(year from fc.catch_date)::int, 1, 1),
         make_date(extract(year from fc.catch_date)::int, 12, 31),
         round(sum(fc.quantity), 2),
         count(*),
         now()
  from public.fish_catch fc
  group by fc.subsector, fc.species_name, coalesce(nullif(fc.unit, ''), 'kg'),
           extract(year from fc.catch_date);

  -- Aquaculture yearly summaries (migration 0012), bucketed by stocking year,
  -- grouped by species, site type, and unit.
  insert into public.aquaculture_statistics (
    species_name, site_type, unit, period_type, period_start, period_end,
    total_stocked, total_harvested, active_cycles, harvested_cycles, lost_cycles,
    computed_at
  )
  select ac.species_name,
         s.site_type,
         coalesce(nullif(ac.unit, ''), 'kg'),
         'YEARLY',
         make_date(extract(year from ac.stocking_date)::int, 1, 1),
         make_date(extract(year from ac.stocking_date)::int, 12, 31),
         round(sum(coalesce(ac.stocking_qty, 0)), 2),
         round(sum(coalesce(ac.harvest_qty, 0)), 2),
         count(*) filter (where ac.status = 'STOCKED'),
         count(*) filter (where ac.status = 'HARVESTED'),
         count(*) filter (where ac.status = 'LOST'),
         now()
  from public.aquaculture_cycles ac
  join public.aquaculture_sites s on s.site_id = ac.site_id
  group by ac.species_name, s.site_type, coalesce(nullif(ac.unit, ''), 'kg'),
           extract(year from ac.stocking_date);

  -- ---------- A few audit log entries (linked to any existing user) --------
  insert into public.audit_logs (user_id, action, entity, entity_id, details, created_at)
  select u.user_id, x.action, x.entity, x.entity_id, x.details, now() - (x.mins || ' minutes')::interval
  from (select user_id from public.users order by user_id limit 1) u
  cross join (values
    ('LOGIN',          'auth',     null,  'Signed in to AGRODATA',        5),
    ('CREATE_FARMER',  'farmers',  '1',   'Registered farmer Dela Cruz',  30),
    ('CREATE_PLANTING','planting_records','1','Recorded a planting cycle',60),
    ('CREATE_LIVESTOCK','livestock_records','1','Recorded swine inventory',75),
    ('CREATE_FISH_CATCH','fish_catch','1','Encoded municipal fish catch',85),
    ('GENERATE_REPORT','reports',  null,  'Crop Production Report',       90)
  ) as x(action, entity, entity_id, details, mins);

  raise notice 'AGRODATA sector sample data inserted successfully.';
end $$;
