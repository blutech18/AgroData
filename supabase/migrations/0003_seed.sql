-- ============================================================================
-- AGRODATA - Seed / Reference Data
-- ============================================================================

-- Roles (Use Case: Login / Manage User Accounts)
insert into public.user_roles (role_name, description) values
  ('Municipal Agriculturalist', 'Administrator with full access including user and role management, backup, and audit logs.'),
  ('OMA Staff', 'Office staff who manage farmer profiles, land records, crop data, reports, and analytics.')
on conflict (role_name) do nothing;

-- Common crops in Misamis Oriental (reference data for crop monitoring)
insert into public.crops (crop_name, crop_category, expected_harvest_days) values
  ('Rice (Palay)',  'Cereal',       110),
  ('Yellow Corn',   'Cereal',       95),
  ('White Corn',    'Cereal',       95),
  ('Coconut',       'Plantation',   2555),
  ('Banana',        'Fruit',        300),
  ('Cassava',       'Root Crop',    270),
  ('Sweet Potato',  'Root Crop',    120),
  ('Tomato',        'Vegetable',    75),
  ('Eggplant',      'Vegetable',    70),
  ('Coffee',        'Plantation',   1095)
on conflict (crop_name) do nothing;

-- ----------------------------------------------------------------------------
-- NOTE ON CREATING THE FIRST ADMIN ACCOUNT
-- ----------------------------------------------------------------------------
-- 1. In Supabase Studio: Authentication -> Users -> "Add user", create an
--    account (e.g. admin@kinoguitan.gov.ph) and copy its UUID.
-- 2. Run the following (replace the UUID), to link the profile + admin role:
--
--   insert into public.users (auth_id, role_id, first_name, last_name, email, username)
--   values (
--     'PASTE-AUTH-UUID-HERE',
--     (select role_id from public.user_roles where role_name = 'Municipal Agriculturalist'),
--     'Maria', 'Santos', 'admin@kinoguitan.gov.ph', 'admin'
--   );
-- ----------------------------------------------------------------------------
