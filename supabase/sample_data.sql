-- ============================================================================
-- AGRODATA - SAMPLE / DEMO DATA
-- ----------------------------------------------------------------------------
-- Populates farmers, farms, plots, multi-year planting & harvest records,
-- yield statistics, and a few audit logs so the dashboard, analytics, trends,
-- forecasts, and reports show meaningful content.
--
-- Run AFTER setup_all.sql (which already seeds roles + crops).
-- Paste into Supabase Studio -> SQL Editor -> Run.
--
-- Idempotent: if farmer records already exist, the script does nothing.
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
  -- Yield-per-hectare rises year over year so trend analysis & forecasting
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

  -- ---------- A few audit log entries (linked to any existing user) --------
  insert into public.audit_logs (user_id, action, entity, entity_id, details, created_at)
  select u.user_id, x.action, x.entity, x.entity_id, x.details, now() - (x.mins || ' minutes')::interval
  from (select user_id from public.users order by user_id limit 1) u
  cross join (values
    ('LOGIN',          'auth',     null,  'Signed in to AGRODATA',        5),
    ('CREATE_FARMER',  'farmers',  '1',   'Registered farmer Dela Cruz',  30),
    ('CREATE_PLANTING','planting_records','1','Recorded a planting cycle',60),
    ('GENERATE_REPORT','reports',  null,  'Crop Production Report',       90)
  ) as x(action, entity, entity_id, details, mins);

  raise notice 'AGRODATA sample data inserted successfully.';
end $$;
