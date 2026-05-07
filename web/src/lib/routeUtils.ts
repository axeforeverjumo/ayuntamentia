import { CATALAN_ROUTE_SEGMENTS, ROUTE_ALIASES } from './routes';

export function normalitzaRutaVisible(path: string): string {
  for (const [legacy, catalan] of Object.entries(ROUTE_ALIASES)) {
    if (path === legacy || path.startsWith(`${legacy}/`) || path.startsWith(`${legacy}?`)) {
      return `${catalan}${path.slice(legacy.length)}` || catalan;
    }
  }
  return path;
}

export function esRutaVisibleEnCatala(path: string): boolean {
  const [withoutQuery] = path.split('?');
  const segments = withoutQuery.split('/');
  return segments.every((segment, index) => {
    if (index === 0) return true;
    if (!segment) return true;
    if (/^\[[^/]+\]$/.test(segment)) return true;
    if (/^\d+$/.test(segment)) return true;
    return CATALAN_ROUTE_SEGMENTS.has(segment);
  });
}
