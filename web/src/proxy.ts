import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { APP_ROUTES, PUBLIC_ROUTES } from '@/lib/routes';

const PUBLIC_PATHS = [...PUBLIC_ROUTES];
const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  '/login': APP_ROUTES.entrada,
  '/dashboard': APP_ROUTES.tauler,
  '/chat': APP_ROUTES.xat,
  '/chat/workspace': APP_ROUTES.workspace,
  '/buscar': APP_ROUTES.cercar,
  '/admin': APP_ROUTES.administracio,
  '/landing': APP_ROUTES.aterrada,
  '/intel': APP_ROUTES.intelLigencia,
  '/settings': APP_ROUTES.configuracio,
  '/suscripciones': APP_ROUTES.subscripcions,
  '/recepcion': APP_ROUTES.recepcio,
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const legacyRedirect = LEGACY_ROUTE_REDIRECTS[pathname];
  if (legacyRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = legacyRedirect;
    return NextResponse.redirect(url, 308);
  }

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p),
  );

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return isPublic ? response : NextResponse.redirect(new URL('/', request.url));
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
  if (user && pathname === APP_ROUTES.entrada) {
    return NextResponse.redirect(new URL(APP_ROUTES.tauler, request.url));
  }

  // Not logged in on private route → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.entrada;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
