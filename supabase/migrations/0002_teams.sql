-- TimeIT teams: add Sales/Ops designation to people and projects.
-- Run this in the Supabase SQL editor after 0001_init.sql.

-- A person's team designation (null until they pick one).
alter table public.profiles
  add column if not exists team text
  check (team in ('sales', 'ops'));

-- A project belongs to a team (null = shared across all teams).
alter table public.projects
  add column if not exists team text
  check (team in ('sales', 'ops'));

create index if not exists projects_team_idx on public.projects (team);

-- profiles_update_own (from 0001) already lets a user set their own team.
-- No new policies needed: projects/time_entries policies are unchanged.
