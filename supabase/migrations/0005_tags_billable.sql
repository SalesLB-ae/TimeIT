-- Tags + billable flag on time entries.
-- Run in the Supabase SQL editor after 0004_roles.sql.

alter table public.time_entries
  add column if not exists tags text[] not null default '{}';

alter table public.time_entries
  add column if not exists billable boolean not null default false;

-- GIN index so filtering by tag stays fast as data grows.
create index if not exists time_entries_tags_idx on public.time_entries using gin (tags);
