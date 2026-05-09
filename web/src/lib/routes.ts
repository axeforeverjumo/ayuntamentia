export const CATALAN_ROUTE_RULE = 'Totes les rutes, slugs i enllaços visibles han d\'estar en català.';

export const APP_ROUTES = {
  inici: '/',
  entrada: '/acces',
  tauler: '/tauler',
  xat: '/sala-intelligencia',
  workspace: '/sala-intelligencia/espai-treball',
  cercar: '/cercar',
  alertes: '/alertes',
  municipis: '/municipis',
  regidors: '/regidors',
  reputacio: '/reputacio',
  intelLigencia: '/intel-ligencia',
  parlament: '/parlament',
  informes: '/informes',
  administracio: '/administracio',
  configuracio: '/configuracio',
  recepcio: '/recepcio',
  subscripcions: '/subscripcions',
  aterrada: '/aterratge',
  actes: '/actes',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

const CATALAN_SEGMENTS = new Set<string>([
  '',
  'acces',
  'tauler',
  'sala-intelligencia',
  'espai-treball',
  'cercar',
  'alertes',
  'municipis',
  'regidors',
  'reputacio',
  'intel-ligencia',
  'parlament',
  'informes',
  'administracio',
  'configuracio',
  'recepcio',
  'subscripcions',
  'aterratge',
  'actes',
  '[id]',
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

    throw new Error(`Ruta fora de la convenció catalana: ${route}`);
  }
}

export const PUBLIC_ROUTES = [
  APP_ROUTES.inici,
  APP_ROUTES.entrada,
  '/legal',
  APP_ROUTES.aterrada,
] as const;

export const LEGACY_VISIBLE_ROUTE_SEGMENTS = [
  'login',
  'dashboard',
  'chat',
  'workspace',
  'buscar',
  'admin',
  'landing',
  'settings',
  'suscripciones',
  'recepcion',
  'municipios',
  'actas',
] as const;
