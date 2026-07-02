-- Every project belongs to a client. Non-client work lives under a special
-- "Internal" client instead of a null client_id.
-- Run in the Supabase SQL editor after 0008_status.sql.

alter table public.clients
  add column if not exists is_internal boolean not null default false;

-- Seed the single Internal client if it doesn't exist.
insert into public.clients (name, color, is_internal)
select 'Internal', '#7a869a', true
where not exists (select 1 from public.clients where is_internal);

-- Backfill: any project without a client now belongs to Internal.
update public.projects
  set client_id = (select id from public.clients where is_internal limit 1)
  where client_id is null;
