import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './types';

/**
 * Updates the Supabase session in Next.js middleware.
 * Ensures cookies are properly synchronized between request and response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: DO NOT use getSession() — getUser() validates the token with Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Add Request ID for end-to-end tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  supabaseResponse.headers.set('x-request-id', requestId);

  // Protected route checking: /account requires active authenticated session
  if (pathname.startsWith('/account')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // Prevent caching of private account information
    supabaseResponse.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  }

  // Protected route checking: /admin requires active authenticated session (except first-time bootstrap)
  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin-setup') &&
    pathname !== '/admin/setup' &&
    pathname !== '/admin/setup/'
  ) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // Prevent caching of private admin pages
    supabaseResponse.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  }

  // Prevent caching of sensitive /choose-plan
  if (pathname.startsWith('/choose-plan')) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  }

  return supabaseResponse;
}
