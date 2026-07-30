-- ============================================================================
-- AGRODATA - Restrict EXECUTE on SECURITY DEFINER helper functions
-- ----------------------------------------------------------------------------
-- Reported by `supabase db advisors --type security` (lints 0028/0029):
-- Postgres grants EXECUTE to PUBLIC by default, so every helper function was
-- callable over the REST API by the `anon` role, e.g.
-- POST /rest/v1/rpc/resync_identity_sequences. The role helpers only leak a
-- boolean, but resync_identity_sequences() performs writes (setval), so an
-- unauthenticated caller could poke at identity sequences.
--
-- Fix: revoke the default PUBLIC/anon grants, allow only signed-in users, and
-- additionally require the Municipal Agriculturalist role inside the sequence
-- resync, which is only ever used by the admin-only restore flow.
-- ============================================================================

-- ---------- Role/profile helpers: signed-in users only ----------------------
revoke all on function public.current_role_name()   from public, anon;
revoke all on function public.is_admin()            from public, anon;
revoke all on function public.has_active_profile()  from public, anon;

grant execute on function public.current_role_name()  to authenticated;
grant execute on function public.is_admin()           to authenticated;
grant execute on function public.has_active_profile() to authenticated;

-- ---------- Sequence resync: admin only, and self-guarded -------------------
create or replace function public.resync_identity_sequences()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cols text[][] := array[
    array['user_roles','role_id'],
    array['users','user_id'],
    array['farmers','farmer_id'],
    array['farms','farm_id'],
    array['farm_plots','plot_id'],
    array['crops','crop_id'],
    array['planting_records','planting_id'],
    array['harvest_inventory','inventory_id'],
    array['yield_statistics','stat_id'],
    array['audit_logs','log_id'],
    array['livestock_species','species_id'],
    array['livestock_records','record_id'],
    array['fisherfolk','fisherfolk_id'],
    array['fish_catch','catch_id'],
    array['aquaculture_sites','site_id'],
    array['aquaculture_cycles','cycle_id'],
    array['livestock_statistics','stat_id'],
    array['fisheries_statistics','stat_id']
  ];
  c text[];
  seq text;
  maxid bigint;
begin
  -- Defence in depth: the restore screen is admin-only in the UI, but the RPC
  -- endpoint is reachable directly, so re-check the role here.
  if not public.is_admin() then
    raise exception 'Only the Municipal Agriculturalist may resync identity sequences.'
      using errcode = '42501';
  end if;

  foreach c slice 1 in array cols loop
    seq := pg_get_serial_sequence('public.' || c[1], c[2]);
    execute format('select max(%I) from public.%I', c[2], c[1]) into maxid;
    perform setval(seq, coalesce(maxid, 1), maxid is not null);
  end loop;
end $$;

revoke all on function public.resync_identity_sequences() from public, anon;
grant execute on function public.resync_identity_sequences() to authenticated;
