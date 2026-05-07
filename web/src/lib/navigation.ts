import { VISIBLE_ROUTES, visiblePath } from './visibleRoutes';

export const visibleRoutes = VISIBLE_ROUTES;

export function withQuery(path: string, params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function municipiDetailPath(id: string | number): string {
  return visiblePath(`${visibleRoutes.municipis}/${id}`);
}

export function regidorDetailPath(id: string | number): string {
  return visiblePath(`${visibleRoutes.regidors}/${id}`);
}

export function actaDetailPath(id: string | number): string {
  return visiblePath(`/actes/${id}`);
}

export function cercaPath(query?: string): string {
  return withQuery(visibleRoutes.cerca, { q: query });
}

export function conversaPath(params?: Record<string, string | number | boolean | undefined | null>): string {
  return withQuery(visibleRoutes.conversa, params || {});
}

export function espaiDeTreballPath(params?: Record<string, string | number | boolean | undefined | null>): string {
  return withQuery(visibleRoutes.espaiDeTreball, params || {});
}
