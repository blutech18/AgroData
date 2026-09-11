# AGRODATA

**An Agricultural Data Management System for the Office of the Municipal Agriculturalist (OMA), LGU Kinoguitan, Misamis Oriental.**

## 🎯 System Purpose

AGRODATA is a comprehensive, web-based Agricultural Data Management System designed specifically to modernize and streamline the operations of the Office of the Municipal Agriculturalist (OMA) in LGU Kinoguitan, Misamis Oriental. 

For years, the agricultural sector's data management has heavily relied on manual, paper-based record-keeping. This traditional approach often led to data redundancy, physical storage issues, difficult retrieval processes, and delayed reporting. AGRODATA directly addresses these challenges by providing a secure, centralized digital platform to manage the municipality's agricultural information.

The primary purpose of the system is to empower the LGU with accurate, real-time data regarding its local farmers, farmlands, crop production, and harvest yields. By digitizing these records, the OMA can make informed, data-driven decisions to support local agricultural development, allocate resources efficiently, and improve the overall livelihood of the farming community in Kinoguitan.

## 🚀 Key Objectives

1. **Centralized Digital Repository:** To transition the OMA from fragmented paper records into a unified digital database that ensures data integrity, security, and easy retrieval.
2. **Efficient Farmer & Farm Profiling:** To maintain accurate registries of local farmers, their associated farm plots, and land ownership details.
3. **Yield & Production Monitoring:** To track planting schedules, crop stages, and harvest yields over time, allowing the municipality to analyze agricultural productivity trends.
4. **Streamlined Reporting:** To automate the generation of compliance reports required by the local government and the Provincial Agriculture Office (PAO), reducing administrative overhead.
5. **Data-Driven Decision Support:** To provide analytical dashboards and statistical summaries that give municipal leaders a clear overview of the agricultural sector's health.

## ✨ Core Capabilities

AGRODATA covers integrated capabilities across three production domains — **crops**, **livestock/poultry**, and **fisheries/aquaculture** — as described in the system's capstone study:

1. **Unified Producer & Crop Yield Inventory** 
   Comprehensive producer profiling, detailed land/plot records, and continuous crop monitoring from planting to harvest.
2. **Livestock & Poultry Records** 
   Species catalog plus periodic inventory, births, deaths, dispositions, and production (meat/milk/eggs) per producer.
3. **Fisheries & Aquaculture Records** 
   Fisherfolk profiles and municipal fish catch (marine/inland), plus aquaculture sites and stocking-to-harvest culture cycles.
4. **Data Validation & Consistency Checks** 
   Strict database-level constraints and duplicate prevention mechanisms to ensure high data quality and reliability.
5. **Automated Report Generation** 
   One-click generation of standardized crop, livestock, fisheries, and municipal compliance reports for printing or digital submission.
6. **Analytics & Decision Support** 
   Interactive visual dashboards, historical yield trend analysis, and statistical summaries to guide agricultural policies.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix primitives) |
| Routing | React Router |
| Server state | TanStack Query |
| Charts | Recharts |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Row Level Security) |
| Server-side logic | Supabase Edge Functions (Deno): `generate-report`, `compute-statistics` |

## Project structure

```
AgroData/
├─ supabase/migrations/      # SQL schema, RLS policies, seed data
├─ supabase/functions/       # Edge Functions (report generation, statistics)
├─ src/
│  ├─ components/ui/         # shadcn/ui primitives
│  ├─ components/shared/     # layout, sidebar, header, shared widgets
│  ├─ features/              # data-access layer (one module per domain)
│  ├─ hooks/                 # useAuth
│  ├─ lib/                   # supabase client, utils, audit logging
│  ├─ pages/                 # route pages
│  └─ types/                 # database domain types
└─ .env.example
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.example` to `.env` and fill them in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_seed.sql`
4. `supabase/migrations/0004_require_profile_rls.sql` (locks data access to active OMA profiles)
5. `supabase/migrations/0005_backup_support.sql` (enables ID-preserving Backup & Restore)
6. `supabase/migrations/0006_livestock_fisheries.sql` (adds livestock/poultry & fisheries/aquaculture modules)
7. `supabase/migrations/0007_sector_statistics.sql` (adds `livestock_statistics` & `fisheries_statistics`; **required** for the Analytics page)
8. `supabase/migrations/0008_backup_sector_support.sql` (includes the sector tables in Backup & Restore)
9. `supabase/migrations/0009_sector_rls_hardening.sql` (**security**: requires an active OMA profile for the sector tables, matching the crop tables)
10. `supabase/migrations/0010_function_execute_hardening.sql` (**security**: revokes anon/PUBLIC EXECUTE on definer helpers; re-checks admin inside `resync_identity_sequences`)
11. `supabase/migrations/0011_revoke_role_name_execute.sql` (**security**: removes the last unnecessary role grant)
12. `supabase/migrations/0012_aquaculture_statistics.sql` (adds `aquaculture_statistics` for the Analytics aquaculture summaries and the Aquaculture Stocking & Harvest report)
13. `supabase/migrations/0013_statistics_unit_and_txn.sql` (adds unit-aware fisheries stats and a transactional recompute function)
14. `supabase/migrations/0014_reference_catalogs.sql` (adds admin-managed `measurement_units` and `aquatic_species` catalogs used by the sector forms)

> Run **all** migrations through `0014`. Stopping early leaves the Analytics page
> without its statistics tables (migrations 0007, 0012–0013) and leaves the sector tables
> reachable by any authenticated account with no OMA profile (migrations 0009–0011 close this).
> Migration `0014` adds the reference catalogs the sector forms use for units and species.

(Or simply run the all-in-one `supabase/setup_all.sql`, which already includes the
`0009` active-profile policies for the sector tables, then optionally
`supabase/sample_data.sql` for demo data. If you use `setup_all.sql`, still apply
migrations `0010` and `0011` afterward for the function-execute hardening.)

### 4. Deploy the Edge Functions

Report generation (Reports page) and statistical-summary computation (Analytics → "Compute & store") run server-side as Supabase Edge Functions. Deploy them with the Supabase CLI:

```bash
# One-time: install the CLI and link the project
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref

# Deploy the functions
supabase functions deploy generate-report
supabase functions deploy compute-statistics
supabase functions deploy create-oma-user
```

All three require an authenticated user (JWT verification is on). `generate-report` and
`compute-statistics` query under the caller's Row Level Security context and additionally verify
that the caller holds the Municipal Agriculturalist role, so they cannot be invoked by an encoder
calling the endpoint directly. For local development you can serve them with
`supabase functions serve`.

`create-oma-user` provisions login accounts and needs the service-role key, which is available to
deployed functions as `SUPABASE_SERVICE_ROLE_KEY` without any extra configuration. This key must
never be added to `.env` or referenced from frontend code: it bypasses Row Level Security
entirely. It is used only inside the function, after the caller's admin role has been verified.

### 4. Create the first admin account

1. In Supabase: **Authentication → Users → Add user** (e.g. `admin@kinoguitan.gov.ph`). Copy the user's UUID.
2. In the **SQL Editor**, link the profile to the admin role:

```sql
insert into public.users (auth_id, role_id, first_name, last_name, email, username)
values (
  'PASTE-AUTH-UUID-HERE',
  (select role_id from public.user_roles where role_name = 'Municipal Agriculturalist'),
  'Maria', 'Santos', 'admin@kinoguitan.gov.ph', 'admin'
);
```

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:5173 and sign in with the account created above.

## Adding more OMA staff

Once you can sign in as the Municipal Agriculturalist, add all other accounts
directly in the app: go to **User Accounts → Add User** and fill in the name, email,
username, and role. The password field is optional:

- **Leave it blank** to email the user an invitation so they set their own password.
  Preferred, since an administrator should not know another user's credentials.
- **Set a temporary password** to make the account usable immediately, for example when
  onboarding someone in person.

Either way the login account and the OMA profile are created together by the
`create-oma-user` Edge Function. If profile creation fails, the function removes the
auth account it just created, so a half-provisioned user is never left behind. Accounts
created with a password are marked email-confirmed, so the **Confirm email** project
setting no longer blocks sign-in.

> The invitation option depends on email delivery. Supabase's built-in SMTP is
> rate-limited and intended for testing; configure **Authentication → SMTP Settings**
> with the LGU's mail service before relying on invitations in production.

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |

## Deployment

- **Frontend:** Vercel or Netlify (set the two `VITE_` env vars in the dashboard).
- **Backend/DB:** Supabase Cloud (managed).

## Security notes

- All tables are protected by Row Level Security. Only authenticated OMA accounts
  with an **active profile** can read/write agricultural data; only the Municipal
  Agriculturalist role can manage user accounts, run Backup/Restore, and view audit logs.
- The anon key is safe to expose in the browser — access is enforced by RLS.
- All key actions are written to the `audit_logs` table for monitoring. The table has no
  update or delete policy, so entries are append-only.
- Account provisioning happens server-side in `create-oma-user`; the service-role key stays
  in the Edge Function environment and is never shipped to the browser.
- Unhandled UI errors are caught by an error boundary, so a failure shows a recoverable
  screen rather than a blank page.
- **Backup files are unencrypted and contain personal data** (producer names, birthdates,
  contact numbers, addresses). Store them on office-controlled storage only, do not send
  them over personal email or chat, and delete copies that are no longer needed. The same
  applies to exported reports.
- Recommended project settings before go-live: enable **leaked password protection** and
  set password strength rules under **Authentication → Sign In / Providers → Email**
  (leaked-password checking requires the Pro plan), and confirm the production URL is in
  the allowed redirect list so password resets work.
- Repeated failed logins are locked client-side after 3 attempts, on top of
  Supabase's server-side auth rate limiting.

### Note on the `Users.password_hash` field (ERD vs implementation)

The Data Dictionary (Table 2) lists a `password_hash` column. In this build,
authentication is delegated to **Supabase Auth**, which stores password hashes in
the secured, internal `auth.users` table. The application's `public.users` table
therefore links to that account via an `auth_id` (UUID) instead of duplicating a
`password_hash`. This is a deliberate, more secure design: credentials are never
stored or handled by the application schema. The logical intent of the ERD
(authenticated user accounts) is fully preserved.
