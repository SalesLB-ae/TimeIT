-- True pause/resume for the running timer.
-- A live entry (ended_at is null) banks active time in accumulated_seconds and
-- tracks the current segment's start in running_since (null = paused).
-- On stop, the app sets ended_at = started_at + total active time, so every
-- COMPLETED entry keeps ended_at - started_at == real tracked duration.
-- Run in the Supabase SQL editor after 0005_tags_billable.sql.

alter table public.time_entries
  add column if not exists running_since timestamptz;

alter table public.time_entries
  add column if not exists accumulated_seconds integer not null default 0;

-- Any entry currently open is treated as actively running since it started.
update public.time_entries
  set running_since = started_at
  where ended_at is null and running_since is null;
