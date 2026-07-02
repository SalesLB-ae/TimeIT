-- Completion status for projects and tasks (ongoing vs done).
-- Separate from `archived` (archived = hidden; done = finished but still shown).
-- Run in the Supabase SQL editor after 0007_clients_tasks.sql.

alter table public.projects
  add column if not exists done boolean not null default false;

alter table public.tasks
  add column if not exists done boolean not null default false;
