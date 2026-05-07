import { esRutaVisibleEnCatala, normalitzaRutaVisible } from './routeUtils';

export function assertVisibleRouteInCatalan(path: string): string {
  const normalized = normalitzaRutaVisible(path);
  if (!esRutaVisibleEnCatala(normalized)) {
    throw new Error(`Ruta visible fora de català: ${path}`);
  }
  return normalized;
}
