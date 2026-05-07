import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { visibleRoutes } from '@/lib/navigation';
import { normalitzaRutaVisible } from '@/lib/routeUtils';

const PUBLIC_PATHS = [visibleRoutes.inici, visibleRoutes.autenticacio, visibleRoutes.legal, visibleRoutes.aterratge];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const normalizedPathname = normalitzaRutaVisible(pathname);

  if (normalizedPathname !== pathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = normalizedPathname;
    return NextResponse.redirect(redirectUrl);
  }

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === '/' ? normalizedPathname === '/' : normalizedPathname.startsWith(p),
  );

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return isPublic ? response : NextResponse.redirect(new URL(visibleRoutes.inici, request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Logged in user on login page → go to dashboard
  if (user && normalizedPathname === visibleRoutes.autenticacio) {
    return NextResponse.redirect(new URL(visibleRoutes.tauler, request.url));
  }

  // Not logged in on private route → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = visibleRoutes.autenticacio;
    url.searchParams.set('next', normalizedPathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
