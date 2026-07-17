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

AGRODATA covers four integrated capabilities as described in the system's capstone study:

1. **Farmer & Crop Yield Inventory** 
   Comprehensive farmer profiling, detailed land/plot records, and continuous crop monitoring from planting to harvest.
2. **Data Validation & Consistency Checks** 
   Strict database-level constraints and duplicate prevention mechanisms to ensure high data quality and reliability.
3. **Automated Report Generation** 
   One-click generation of standardized municipal and Provincial Agriculture Office (PAO) compliance reports, ready for printing or digital submission.
4. **Analytics & Decision Support** 
   Interactive visual dashboards, yield trend analysis, statistical summaries, and basic production forecasting to guide agricultural policies.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix primitives) |
| Routing | React Router |
| Server state | TanStack Query |
| Charts | Recharts |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Row Level Security) |

## Project structure

```
AgroData/
├─ supabase/migrations/      # SQL schema, RLS policies, seed data
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

(Or simply run the all-in-one `supabase/setup_all.sql`, then optionally `supabase/sample_data.sql` for demo data.)

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
directly in the app: go to **User Accounts → Add User**, fill in the name, email,
username, role, and a temporary password. The account is created and ready to use
immediately — no dashboard steps required.

> Note: If your Supabase project has **Authentication → Email → Confirm email**
> enabled, new users must confirm their email before signing in. For an internal
> LGU tool you can disable that setting so accounts work right away.

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
- All key actions are written to the `audit_logs` table for monitoring.
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
