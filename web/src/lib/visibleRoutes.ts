import { assertVisibleRouteInCatalan } from './routeGuard';
import { ROUTE_PATHS } from './routes';

export const VISIBLE_ROUTES = Object.freeze({
  ...ROUTE_PATHS,
});

Object.values(VISIBLE_ROUTES).forEach((path) => {
  assertVisibleRouteInCatalan(path);
});

export function visiblePath(path: string): string {
  return assertVisibleRouteInCatalan(path);
}
