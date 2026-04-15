/**
 * Configuración del cliente (partido que usa la herramienta).
 * Se resuelve en este orden:
 *   1. NEXT_PUBLIC_CLIENT_PARTIDO / NEXT_PUBLIC_CLIENT_NOMBRE (build-time)
 *   2. Defaults (AC) — útil para desarrollo local
 *
 * Para cada despliegue del producto a un nuevo partido, se pasan estas vars
 * en docker-compose o en .env de la web.
 */

import type { PoliticalMode } from '@/components/ui/PoliticalModes';

export type PartidoClave = 'AC' | 'PP' | 'PSC' | 'ERC' | 'JxCat' | 'CUP' | 'VOX' | 'Cs' | 'Comuns';

export interface ClientConfig {
  partido: PartidoClave;
  nombre: string;
  rivales: string[];
}

export const CLIENT_CONFIG: ClientConfig = {
  partido: (process.env.NEXT_PUBLIC_CLIENT_PARTIDO || 'AC') as PartidoClave,
  nombre: process.env.NEXT_PUBLIC_CLIENT_NOMBRE || 'Aliança Catalana',
  rivales: (process.env.NEXT_PUBLIC_CLIENT_RIVALES || 'JxCat,ERC,PSC,CUP,PP,VOX,Cs')
    .split(',').map(s => s.trim()).filter(Boolean),
};

/**
 * Genera preguntas personalizadas por modo político según el cliente.
 * Cada modo recibe 4 preguntas que usan el partido del cliente y sus rivales.
 */
export function getModeQuestions(mode: PoliticalMode, cfg: ClientConfig = CLIENT_CONFIG): string[] {
  const p = cfg.partido;
  const r0 = cfg.rivales[0] || 'ERC';
  const r1 = cfg.rivales[1] || 'PSC';
  const r2 = cfg.rivales[2] || 'JxCat';

  switch (mode) {
    case 'monitor':
      return [
        `Què s'ha dit de ${cfg.nombre} aquest mes?`,
        `Qui ataca els regidors de ${p} als darrers mesos?`,
        `Tot sobre ${r0} al març 2026`,
        `Què diuen de ${p} els últims 60 dies?`,
      ];
    case 'atacar':
      return [
        `Dossier complet contra ${r0} sobre civisme`,
        `Contradiccions de ${r1} en habitatge aquest any`,
        `Votacions polèmiques de ${r2} en seguretat 2026`,
        `Punts dèbils de ${r0} en hisenda`,
      ];
    case 'defender':
      return [
        `Com respondre a crítiques de ${r0} sobre immigració?`,
        `Com defensar el vot de ${p} sobre civisme?`,
        `Punts forts de ${p} en seguretat per rebatre`,
        `Dades favorables a ${p} en habitatge 2026`,
      ];
    case 'comparar':
      return [
        `${r0} vs ${r2} en immigració 2026`,
        `${p} vs ${r1} en ordenances de civisme`,
        `Qui vota més a favor de més policia local?`,
        `Diferència entre ${r2} i ${r0} en habitatge`,
      ];
    case 'oportunidad':
      return [
        `On pot créixer ${p} ara mateix?`,
        `Temes calents on rivals estan dividits`,
        `Buits comunicatius dels 30 últims dies`,
        `Municipis grans sense veu de ${p} forta`,
      ];
  }
}
