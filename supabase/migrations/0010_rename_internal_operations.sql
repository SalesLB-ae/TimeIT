-- Rename the special internal client from "Internal" to "Operations".
-- The app references this client by the is_internal flag (not its name), so
-- renaming the display label is safe and needs no code changes.
-- Run in the Supabase SQL editor after 0009_internal_client.sql.

update public.clients
  set name = 'Operations'
  where is_internal and name = 'Internal';
