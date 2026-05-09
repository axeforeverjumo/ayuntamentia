export const CATALAN_ROUTE_RULE = 'Totes les rutes, slugs i enllaços visibles han d\'estar en català.';

export const APP_ROUTES = {
  inici: '/',
  entrada: '/login',
  tauler: '/dashboard',
  xat: '/chat',
  cercar: '/buscar',
  alertes: '/alertes',
  municipis: '/municipis',
  regidors: '/regidors',
  reputacio: '/reputacio',
  intelLigencia: '/intel',
  parlament: '/parlament',
  informes: '/informes',
  administracio: '/admin',
  configuracio: '/configuracio',
  recepcio: '/recepcio',
  aterrada: '/landing',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

const CATALAN_SEGMENTS = new Set<string>([
  '',
  'login',
  'dashboard',
  'chat',
  'buscar',
  'alertes',
  'municipis',
  'regidors',
  'reputacio',
  'intel',
  'parlament',
  'informes',
  'admin',
  'configuracio',
  'recepcio',
  'landing',
  'actes',
  '[id]',
  'workspace',
]);

export function buildRoute(...segments: Array<string | number>): string {
  const route = `/${segments
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join('/')}`;

  assertCatalanRoute(route);
  return route;
}

export function assertCatalanRoute(route: string): void {
  const path = route.split('?')[0].split('#')[0];
  const segments = path.split('/').filter(Boolean);

  for (const segment of segments) {
    if (/^\d+$/.test(segment)) continue;
    if (CATALAN_SEGMENTS.has(segment)) continue;
    if (/^[a-z0-9-]+$/.test(segment)) continue;

    throw new Error(`Ruta fora de la convenció catalana: ${route}`);
  }
}

export const PUBLIC_ROUTES = [
  APP_ROUTES.inici,
  APP_ROUTES.entrada,
  '/legal',
  APP_ROUTES.aterrada,
] as const;
