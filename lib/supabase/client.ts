import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase/config';

// Browser-side Supabase client (used in client components for CRUD + auth).
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL!, SUPABASE_KEY!);
}
