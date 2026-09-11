-- ============================================================================
-- AGRODATA - Unit-aware fisheries statistics + transactional recompute
-- ----------------------------------------------------------------------------
-- Two additive, non-destructive changes:
--
--   1. Add `unit` to `fisheries_statistics` so stored catch summaries are not
--      combined across incompatible units (e.g. kg vs. pieces). Existing rows
--      default to 'kg'.
--
--   2. Add `apply_sector_statistics()`: the compute-statistics Edge Function
--      previously deleted each sector's rows and re-inserted them in separate
--      statements, so a failure partway through could leave summaries empty or
--      partially refreshed. This function performs the delete + insert for all
--      four sectors inside a single implicit transaction (a PL/pgSQL function
--      body is atomic), so any error rolls the whole recompute back.
--
-- No table, column, policy, or data is dropped.
-- ============================================================================

-- ---------- 1. Unit-aware fisheries statistics ------------------------------
alter table public.fisheries_statistics
  add column if not exists unit varchar(50) not null default 'kg';

-- ---------- 2. Transactional recompute --------------------------------------
-- SECURITY INVOKER so the caller's RLS still applies; additionally gated to the
-- Municipal Agriculturalist because recompute replaces municipality-wide
-- summaries. Rows are passed as JSONB arrays computed by the Edge Function.
create or replace function public.apply_sector_statistics(
  p_period_type period_type,
  p_yield       jsonb default '[]'::jsonb,
  p_livestock   jsonb default '[]'::jsonb,
  p_fisheries   jsonb default '[]'::jsonb,
  p_aquaculture jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  n_crops int;
  n_livestock int;
  n_fisheries int;
  n_aquaculture int;
begin
  if not public.is_admin() then
    raise exception 'Only the Municipal Agriculturalist may recompute statistics.'
      using errcode = '42501';
  end if;

  -- Crops ---------------------------------------------------------------------
  delete from public.yield_statistics where period_type = p_period_type;
  insert into public.yield_statistics
    (crop_id, barangay, period_type, period_start, period_end,
     total_area_planted, total_yield, average_yield_per_hectare, farmer_count)
  select crop_id, barangay, p_period_type, period_start, period_end,
         total_area_planted, total_yield, average_yield_per_hectare, farmer_count
  from jsonb_populate_recordset(null::public.yield_statistics, p_yield);
  get diagnostics n_crops = row_count;

  -- Livestock -----------------------------------------------------------------
  delete from public.livestock_statistics where period_type = p_period_type;
  insert into public.livestock_statistics
    (species_id, barangay, period_type, period_start, period_end,
     total_inventory, total_births, total_deaths, total_disposed, total_production)
  select species_id, barangay, p_period_type, period_start, period_end,
         total_inventory, total_births, total_deaths, total_disposed, total_production
  from jsonb_populate_recordset(null::public.livestock_statistics, p_livestock);
  get diagnostics n_livestock = row_count;

  -- Fisheries -----------------------------------------------------------------
  delete from public.fisheries_statistics where period_type = p_period_type;
  insert into public.fisheries_statistics
    (subsector, species_name, unit, period_type, period_start, period_end,
     total_catch, catch_records)
  select subsector, species_name, coalesce(nullif(unit, ''), 'kg'), p_period_type,
         period_start, period_end, total_catch, catch_records
  from jsonb_populate_recordset(null::public.fisheries_statistics, p_fisheries);
  get diagnostics n_fisheries = row_count;

  -- Aquaculture ---------------------------------------------------------------
  delete from public.aquaculture_statistics where period_type = p_period_type;
  insert into public.aquaculture_statistics
    (species_name, site_type, unit, period_type, period_start, period_end,
     total_stocked, total_harvested, active_cycles, harvested_cycles, lost_cycles)
  select species_name, site_type, coalesce(nullif(unit, ''), 'kg'), p_period_type,
         period_start, period_end,
         total_stocked, total_harvested, active_cycles, harvested_cycles, lost_cycles
  from jsonb_populate_recordset(null::public.aquaculture_statistics, p_aquaculture);
  get diagnostics n_aquaculture = row_count;

  return jsonb_build_object(
    'crops', n_crops,
    'livestock', n_livestock,
    'fisheries', n_fisheries,
    'aquaculture', n_aquaculture
  );
end $$;

revoke all on function public.apply_sector_statistics(period_type, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.apply_sector_statistics(period_type, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
