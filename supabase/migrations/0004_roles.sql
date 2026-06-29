-- Roles: member (default), manager, admin.
-- Managers and admins can see and edit ALL teammates' time entries.
-- Admins can additionally manage people's roles and teams.
-- Run in the Supabase SQL editor after 0003_private_entries.sql.

alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('member', 'manager', 'admin'));

-- Helper predicates (security definer so they bypass RLS and can't recurse).
create or replace function public.is_elevated()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('manager', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Time entries: you always see/edit your own; elevated roles see/edit everyone's.
drop policy if exists "entries_select_own" on public.time_entries;
drop policy if exists "entries_select" on public.time_entries;
create policy "entries_select" on public.time_entries
  for select to authenticated
  using (auth.uid() = user_id or public.is_elevated());

drop policy if exists "entries_update_own" on public.time_entries;
drop policy if exists "entries_update" on public.time_entries;
create policy "entries_update" on public.time_entries
  for update to authenticated
  using (auth.uid() = user_id or public.is_elevated())
  with check (auth.uid() = user_id or public.is_elevated());

drop policy if exists "entries_delete_own" on public.time_entries;
drop policy if exists "entries_delete" on public.time_entries;
create policy "entries_delete" on public.time_entries
  for delete to authenticated
  using (auth.uid() = user_id or public.is_elevated());

-- Profiles: you can edit your own; admins can edit anyone (roles + teams).
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- 👇 PROMOTE YOUR FIRST ADMIN: edit the email, then run this line once.
-- update public.profiles set role = 'admin' where email = 'sales@leadersbrands.ae';
