import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types';

// Browser-side Supabase client (used in client components for CRUD + auth).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
