const TEMES_MAP: Record<string, string> = {
  hacienda: 'hisenda',
  urbanismo: 'urbanisme',
  seguridad: 'seguretat',
  medio_ambiente: 'medi ambient',
  cultura: 'cultura',
  transporte: 'transport',
  servicios_sociales: 'serveis socials',
  vivienda: 'habitatge',
  educacion: 'educació',
  educación: 'educació',
  salud: 'salut',
  comercio: 'comerç',
  inmigración: 'immigració',
  inmigracion: 'immigració',
  civismo: 'civisme',
  otros: 'altres',
  mociones: 'mocions',
  deportes: 'esports',
  empleo: 'ocupació',
  turismo: 'turisme',
  agricultura: 'agricultura',
  industria: 'indústria',
  justicia: 'justícia',
  infraestructuras: 'infraestructures',
  energia: 'energia',
  agua: 'aigua',
  residuos: 'residus',
  movilidad: 'mobilitat',
  participacion: 'participació',
  transparencia: 'transparència',
  igualdad: 'igualtat',
  juventud: 'joventut',
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
  urbanisme: 'urbanisme',
  seguretat: 'seguretat',
  habitatge: 'habitatge',
};

export function traduirTema(tema: string): string {
  if (!tema) return tema;
  const lower = tema.toLowerCase().trim();
  return TEMES_MAP[lower] || TEMES_MAP[lower.replace(/ /g, '_')] || tema;
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
