// Centralized Supabase connection config.
//
// Supports both the modern publishable key (sb_publishable_...) and the
// legacy anon JWT key, whichever is set. These are public client keys —
// safe to ship to the browser, protected by Row-Level Security.
//
// NOTE: the env names are referenced literally (not computed) so Next.js can
// inline the NEXT_PUBLIC_* values into the client/edge bundles at build time.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
