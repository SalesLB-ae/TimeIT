import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase/config';

// Server-side Supabase client (Server Components, Route Handlers).
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    SUPABASE_URL!,
    SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes cookies.
          }
        },
      },
    }
  );
}
