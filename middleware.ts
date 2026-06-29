import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session on every request and guards the app routes.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If the app isn't configured yet (e.g. env vars missing on the host),
  // don't crash the whole site — just pass the request through.
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars are not set; skipping auth middleware.');
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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
