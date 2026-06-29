-- TimeIT initial schema: shared team workspace.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) once per project.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#4f86f7',
  archived    boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete set null,
  description text not null default '',
  started_at  timestamptz not null,
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc);
create index if not exists time_entries_started_idx
  on public.time_entries (started_at desc);

-- At most one running (ended_at is null) entry per user.
create unique index if not exists time_entries_one_running_per_user
  on public.time_entries (user_id)
  where ended_at is null;

-- ============================================================
-- New-user handling + domain restriction
-- ============================================================
-- Only accounts on this domain may sign up. To allow any email,
-- delete the "if ... raise exception" block below. To allow several
-- domains, change the check to: where new.email like '%@domain-a.com'
-- or new.email like '%@domain-b.com'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_domain text := 'leadersbrands.ae';
begin
  if split_part(new.email, '@', 2) <> allowed_domain then
    raise exception 'Sign-ups are restricted to @% accounts.', allowed_domain;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.time_entries enable row level security;

-- Profiles: every authenticated teammate can see the roster; you edit only your own.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Projects: shared across the workspace — anyone signed in can read and manage them.
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select to authenticated using (true);

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated using (true) with check (true);

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated using (true);

-- Time entries: the whole team can read entries (for team reports),
-- but each person may only create/edit/delete their own.
drop policy if exists "entries_select_team" on public.time_entries;
create policy "entries_select_team" on public.time_entries
  for select to authenticated using (true);

drop policy if exists "entries_insert_own" on public.time_entries;
create policy "entries_insert_own" on public.time_entries
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.time_entries;
create policy "entries_update_own" on public.time_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.time_entries;
create policy "entries_delete_own" on public.time_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Seed a starter project (optional)
-- ============================================================
insert into public.projects (name, color)
select 'General', '#4f86f7'
where not exists (select 1 from public.projects);
