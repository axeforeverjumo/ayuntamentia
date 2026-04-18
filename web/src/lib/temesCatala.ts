// Mapa de traducció de temes ES→CA validat amb terminologia oficial
// Font: Generalitat de Catalunya, Diari Oficial, nomenclatura municipal
const TEMES_MAP: Record<string, string> = {
  // --- Temes principals (per freqüència a la BD) ---
  procedimiento: 'procediment',
  hacienda: 'hisenda',
  otros: 'altres',
  urbanismo: 'urbanisme',
  medio_ambiente: 'medi ambient',
  servicios_sociales: 'serveis socials',
  cultura: 'cultura',
  educacion: 'educació',
  educación: 'educació',
  seguridad: 'seguretat',
  transporte: 'transport',
  ruegos: 'precs i preguntes',
  deportes: 'esports',
  comercio: 'comerç',
  vivienda: 'habitatge',
  salud: 'salut',
  mociones: 'mocions',
  turismo: 'turisme',
  agua: 'aigua',
  juventud: 'joventut',
  personal: 'personal',
  servicios: 'serveis',

  // --- Variantes mal escrites (normalització) ---
  medio_ambient: 'medi ambient',
  'medio_ambiente': 'medi ambient',
  'medio_ambiente': 'medi ambient',
  'medio_ambiental': 'medi ambient',
  'medio_ambiento': 'medi ambient',
  'medio_ambientre': 'medi ambient',
  transport: 'transport',

  // --- Temes secundaris ---
  inmigración: 'immigració',
  inmigracion: 'immigració',
  civismo: 'civisme',
  agricultura: 'agricultura',
  industria: 'indústria',
  justicia: 'justícia',
  infraestructuras: 'infraestructures',
  energia: 'energia',
  residuos: 'residus',
  movilidad: 'mobilitat',
  participacion: 'participació',
  transparencia: 'transparència',
  igualdad: 'igualtat',
  mayores: 'gent gran',
  sanidad: 'sanitat',
  seguridad_ciudadana: 'seguretat ciutadana',
  proteccion_civil: 'protecció civil',
  medio_rural: 'medi rural',
  pesca: 'pesca',
  tecnologia: 'tecnologia',
  comunicacion: 'comunicació',
  patrimonio: 'patrimoni',
  fiestas: 'festes',
  limpieza: 'neteja',
  alumbrado: 'il·luminació',
  parques: 'parcs',
  mercados: 'mercats',
  cementerios: 'cementiris',
  bomberos: 'bombers',
  policia: 'policia',
  empleo: 'ocupació',

  // --- Ja en català (pass-through) ---
  urbanisme: 'urbanisme',
  seguretat: 'seguretat',
  habitatge: 'habitatge',
  hisenda: 'hisenda',
  altres: 'altres',
  procediment: 'procediment',
};

export function traduirTema(tema: string): string {
  if (!tema) return tema;
  const lower = tema.toLowerCase().trim();
  // Try exact match
  if (TEMES_MAP[lower]) return TEMES_MAP[lower];
  // Try replacing spaces with underscores
  const underscored = lower.replace(/ /g, '_');
  if (TEMES_MAP[underscored]) return TEMES_MAP[underscored];
  // Try removing underscores
  const spaced = lower.replace(/_/g, ' ');
  if (TEMES_MAP[spaced]) return TEMES_MAP[spaced];
  // Return original with first letter capitalized
  return tema;
}

export function traduirTemes<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
): T[] {
  return items.map(item => ({
    ...item,
    [field]: traduirTema(String(item[field] || '')),
  }));
}
