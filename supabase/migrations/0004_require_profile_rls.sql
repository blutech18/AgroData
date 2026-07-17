-- ============================================================================
-- AGRODATA - Harden RLS so data access requires an ACTIVE OMA profile
-- ----------------------------------------------------------------------------
-- Why: enabling email signups means anyone holding the public anon key could
-- register an auth account. Previously the data policies allowed ANY
-- authenticated user, which would expose data. After this migration, a user
-- must have a matching, ACTIVE row in public.users (created only by an admin
-- via the in-app "Add User" flow) to read or write any agricultural data.
-- ============================================================================

create or replace function public.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_id = auth.uid()
      and u.account_status = 'ACTIVE'
  );
$$;

-- Rebuild the agricultural-data policies to require an active profile.
do $$
declare
  t text;
  data_tables text[] := array[
    'farmers','farms','farm_plots','crops',
    'planting_records','harvest_inventory','yield_statistics'
  ];
begin
  foreach t in array data_tables loop
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

-- Reference + audit tables: also require an active profile.
drop policy if exists "roles_read" on public.user_roles;
create policy "roles_read" on public.user_roles for select using (public.has_active_profile());

drop policy if exists "audit_read"   on public.audit_logs;
drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_read"   on public.audit_logs for select using (public.has_active_profile());
create policy "audit_insert" on public.audit_logs for insert with check (public.has_active_profile());
