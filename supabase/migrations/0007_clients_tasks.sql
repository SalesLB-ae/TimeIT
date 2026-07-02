-- Clients → Projects → Tasks hierarchy.
-- Run in the Supabase SQL editor after 0006_pause_resume.sql.

-- Clients (shared across the workspace, like projects).
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#2f6df6',
  archived    boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- A project may belong to a client (nullable so existing projects keep working).
alter table public.projects
  add column if not exists client_id uuid references public.clients (id) on delete set null;

-- Tasks live under a project.
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks (project_id);

-- A time entry may reference a task.
alter table public.time_entries
  add column if not exists task_id uuid references public.tasks (id) on delete set null;

-- ============================================================
-- RLS (shared workspace; same shape as projects)
-- ============================================================
alter table public.clients enable row level security;
alter table public.tasks   enable row level security;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients for select to authenticated using (true);
drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients for update to authenticated using (true) with check (true);
drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients for delete to authenticated using (true);

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select to authenticated using (true);
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert to authenticated with check (true);
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update to authenticated using (true) with check (true);
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete to authenticated using (true);
