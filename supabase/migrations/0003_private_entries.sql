-- Make time entries PRIVATE: each person can only read their own entries.
-- (Reverses the earlier team-wide read policy.) Projects stay shared.
-- Run in the Supabase SQL editor after 0002_teams.sql.

drop policy if exists "entries_select_team" on public.time_entries;
drop policy if exists "entries_select_own" on public.time_entries;

create policy "entries_select_own" on public.time_entries
  for select to authenticated
  using (auth.uid() = user_id);

-- Seed shared categories that everyone can track against.
insert into public.projects (name, color, team)
select 'Meeting', '#e5a23c', null
where not exists (select 1 from public.projects where lower(name) = 'meeting');

insert into public.projects (name, color, team)
select 'Training', '#2bb673', null
where not exists (select 1 from public.projects where lower(name) = 'training');
