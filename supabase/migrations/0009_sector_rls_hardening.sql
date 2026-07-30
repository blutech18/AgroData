-- ============================================================================
-- AGRODATA - Harden RLS on the livestock/fisheries/aquaculture tables
-- ----------------------------------------------------------------------------
-- Why: migration 0004 replaced the permissive `auth.role() = 'authenticated'`
-- data policies with `has_active_profile()`, so a user must have a matching
-- ACTIVE row in public.users (created only by an admin) before reading or
-- writing agricultural data. Migrations 0006 and 0007 were written against the
-- older pattern, so the sector tables were still reachable by ANY authenticated
-- identity -- including a self-registered account with no OMA profile. This
-- migration brings them to parity with the crop tables.
-- ============================================================================

do $$
declare
  t text;
  sector_tables text[] := array[
    'livestock_species','livestock_records','fisherfolk','fish_catch',
    'aquaculture_sites','aquaculture_cycles',
    'livestock_statistics','fisheries_statistics'
  ];
begin
  foreach t in array sector_tables loop
    execute format('drop policy if exists "auth_read_%1$s"   on public.%1$s;', t);
    execute format('drop policy if exists "auth_insert_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "auth_update_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "auth_delete_%1$s" on public.%1$s;', t);

    execute format('create policy "auth_read_%1$s"   on public.%1$s for select using (public.has_active_profile());', t);
    execute format('create policy "auth_insert_%1$s" on public.%1$s for insert with check (public.has_active_profile());', t);
    execute format('create policy "auth_update_%1$s" on public.%1$s for update using (public.has_active_profile());', t);
    execute format('create policy "auth_delete_%1$s" on public.%1$s for delete using (public.has_active_profile());', t);
  end loop;
end $$;
