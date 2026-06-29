# ⏱ TimeIT

A fast, **team** time tracker in the spirit of Clockify — built for ease of use and access. Sign in with your work Google account, hit ▶, and you're tracking. Built on **Next.js** (deploys to **Vercel**) + **Supabase** (Postgres, Auth, Row-Level Security).

## What it does

- **Google sign-in** with your work account — no passwords to manage. Sign-up is restricted to your company domain.
- **Shared team workspace** — everyone shares the same projects.
- **Teams (Sales / Ops)** — each person sets their team designation, color-coded everywhere (Sales = coral, Ops = violet). Projects can belong to a team too.
- **One-click timer** — type what you're doing, hit ▶ (or press Enter). Hit it again to stop. The live time also shows in the browser tab.
- **Side-panel calendar** — pick any day to see exactly what the whole team logged that day, grouped by person with team badges and totals.
- **Entries grouped by day** with daily totals. Click any entry to edit times, or tap ▶ to **resume** it.
- ➕ **Manual time entry** for when you forget to start the timer.
- 📊 **Team reports** — totals for today / this week / this month, broken down **by project, by person, or by team**, with **CSV export** for invoicing.
- 🔒 **Row-Level Security** — the database enforces that you can only edit your *own* entries, even though the whole team can read reports.
- Sky-blue, Apple-style "liquid glass" UI; responsive, works great on phones.

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Next.js 14 (App Router) + TypeScript    |
| Hosting        | Vercel                                  |
| Auth           | Supabase Auth (Google OAuth)            |
| Database       | Supabase Postgres + Row-Level Security  |
| Styling        | Plain CSS (no build-tool dependency)    |

---

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**. This creates the `profiles`, `projects`, and `time_entries` tables, the RLS policies, and the new-user trigger. Then do the same with [`supabase/migrations/0002_teams.sql`](supabase/migrations/0002_teams.sql) to add the Sales/Ops team columns.
3. **Domain restriction** lives in that SQL — the `handle_new_user()` function rejects any sign-up whose email isn't `@leadersbrands.ae`. To change the domain, edit the `allowed_domain` value; to allow anyone, delete the `raise exception` block. (See the comments in the file.)

### 2. Enable Google sign-in

1. In Supabase: **Authentication → Providers → Google** → enable it. It shows you a **callback URL** like `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In [Google Cloud Console](https://console.cloud.google.com/): **APIs & Services → Credentials → Create OAuth client ID** (type *Web application*).
   - **Authorized redirect URI**: paste the Supabase callback URL from step 1.
   - (Optional, recommended) On the OAuth consent screen set **User type = Internal** so only your Google Workspace org can sign in.
3. Copy the **Client ID** and **Client secret** back into Supabase's Google provider settings and save.
4. In Supabase **Authentication → URL Configuration**, add your app URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<your-app>.vercel.app/auth/callback`

### 3. Run locally

```bash
cp .env.local.example .env.local   # then fill in the values below
npm install
npm run dev                         # http://localhost:3000
```

`.env.local` (values come from Supabase → **Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Use the **publishable** key (`sb_publishable_…`) from Project Settings → API.
> The legacy `anon` JWT key also works if you set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> instead — the app reads whichever is present. Both are public client keys,
> safe to expose and protected by Row-Level Security. Never put the
> `sb_secret_…` / `service_role` key in any `NEXT_PUBLIC_*` variable.

### 4. Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new) (framework auto-detects as Next.js).
2. Add the three environment variables above in **Project → Settings → Environment Variables**, but set `NEXT_PUBLIC_SITE_URL` to your production URL, e.g. `https://timeit.vercel.app`.
3. Deploy. Then make sure that production URL's `/auth/callback` is in the Supabase **Redirect URLs** list (step 2.4).

---

## How access control works

- **Sign-up domain lock** — enforced server-side by the `handle_new_user()` trigger; a non-company email can authenticate with Google but is rejected before a profile is created.
- **Read vs. write** — RLS policies let any signed-in teammate *read* projects and time entries (so team reports work), but *insert/update/delete* of a time entry is restricted to its owner (`auth.uid() = user_id`).
- A Postgres unique index guarantees **at most one running timer per person**.

## Project layout

```
app/
  layout.tsx                 root layout + metadata
  globals.css                all styling (light theme)
  page.tsx                   redirects to /track
  login/page.tsx             Google sign-in screen
  auth/callback/route.ts     OAuth code → session exchange
  (app)/
    layout.tsx               authed shell (guards routes, renders nav)
    AppNav.tsx               tabs + account menu + sign out
    track/                   the timer + day-grouped entries
    reports/                 team totals by project / person + CSV
    projects/                shared project management
components/EntryModal.tsx    edit / manual-add dialog
lib/
  supabase/{client,server}.ts  browser & server Supabase clients
  db.ts                      typed data-access functions
  format.ts                  duration / date formatting
  types.ts                   domain + Database types
middleware.ts                session refresh + route protection
supabase/migrations/0001_init.sql   schema + RLS + domain trigger
```

## Roadmap ideas

- Realtime sync so a timer started on your phone updates your laptop live (Supabase Realtime).
- Tags, billable rates, and per-client grouping.
- A weekly timesheet grid and admin/member roles.
- Idle detection and reminders to start the timer.
