-- ============================================================================
-- AGRODATA - Row Level Security (RLS) Policies
-- The system is used only by authorized OMA personnel (Municipal Agriculturalist
-- and OMA staff). Farmers do NOT access the system. Therefore:
--   * Any authenticated user (a logged-in OMA account) may read/write agricultural data.
--   * Only the "Municipal Agriculturalist" role may manage user accounts and roles.
-- ============================================================================

-- Helper: resolve the application role name of the currently logged-in user.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.role_name
  from public.users u
  join public.user_roles r on r.role_id = u.role_id
  where u.auth_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'Municipal Agriculturalist', false);
$$;

-- Enable RLS on every table.
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

-- ---------- Agricultural data: full access for any authenticated OMA user ----
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
      create policy "auth_read_%1$s"   on public.%1$s for select using (auth.role() = 'authenticated');
      create policy "auth_insert_%1$s" on public.%1$s for insert with check (auth.role() = 'authenticated');
      create policy "auth_update_%1$s" on public.%1$s for update using (auth.role() = 'authenticated');
      create policy "auth_delete_%1$s" on public.%1$s for delete using (auth.role() = 'authenticated');
    $f$, t);
  end loop;
end $$;

-- ---------- user_roles: readable by all authenticated, managed by admin ------
create policy "roles_read"   on public.user_roles for select using (auth.role() = 'authenticated');
create policy "roles_write"  on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- users: a user may read self; admins manage everyone --------------
create policy "users_read_self_or_admin" on public.users for select
  using (auth_id = auth.uid() or public.is_admin());
create policy "users_admin_write" on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- audit_logs: authenticated may read & insert; no update/delete ----
create policy "audit_read"   on public.audit_logs for select using (auth.role() = 'authenticated');
create policy "audit_insert" on public.audit_logs for insert with check (auth.role() = 'authenticated');
