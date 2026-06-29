import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase/config';

// Refreshes the Supabase session on every request and guards the app routes.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If an OAuth code lands on the root path (e.g. Supabase's Site URL has no
  // /auth/callback path), forward it to the callback handler so login still
  // completes instead of dead-ending on the home page.
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // If the app isn't configured yet (e.g. env vars missing on the host),
  // don't crash the whole site — just pass the request through.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase env vars are not set; skipping auth middleware.');
    return response;
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    // Never let an auth hiccup turn into a site-wide 500.
    console.error('Auth check failed in middleware:', err);
    return response;
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth');
  const isPublicAsset = pathname.startsWith('/icons') || pathname === '/favicon.ico';

  // Not signed in and trying to reach a protected page → send to /login.
  if (!user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already signed in but on the login page → send to the app.
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/track';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
