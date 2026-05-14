import type { ChatResponse, IntelSourcesGrouped, IntelStructuredSource, Source } from '@/lib/types';

function pickString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeStructuredSource(source: unknown): IntelStructuredSource | null {
  if (!source || typeof source !== 'object') return null;

  const raw = source as Record<string, unknown>;
  const label = pickString(raw.label);
  const title = pickString(raw.short_title, raw.title, raw.titulo);
  const date = pickString(raw.date, raw.fecha);
  const url = pickString(raw.url);
  const sourceType = pickString(raw.source_type, raw.tipo);

  if (!label && !title && !date) return null;

  return {
    label,
    title,
    short_title: title,
    date,
    url,
    source_type: sourceType,
  };
}

function normalizeLegacySource(source: Source): IntelStructuredSource | null {
  const label = pickString(source.label, source.tipo);
  const title = pickString(source.short_title, source.title, source.titulo, source.tema);
  const date = pickString(source.date, source.fecha);
  const url = pickString(source.url);
  const sourceType = pickString(source.source_type, source.tipo);

  if (!label && !title && !date) return null;

  return {
    label,
    title,
    short_title: title,
    date,
    url,
    source_type: sourceType,
  };
}

export function normalizeIntelResponse(response: ChatResponse): {
  answer: string;
  flatSources: Source[];
  groupedSources: IntelSourcesGrouped;
  premsaDegraded: boolean;
  premsaUnavailableMessage?: string;
} {
  const answer = response.text?.trim() || response.answer?.trim() || '';
  const groupedSources: IntelSourcesGrouped = { plens: [], premsa: [] };

  if (Array.isArray(response.sources)) {
    const normalized = response.sources
      .map((source) => normalizeLegacySource(source))
      .filter((source): source is IntelStructuredSource => Boolean(source));

    groupedSources.plens = normalized;
  } else if (response.sources && typeof response.sources === 'object') {
    const plensRaw = Array.isArray(response.sources.plens) ? response.sources.plens : [];
    const premsaRaw = Array.isArray(response.sources.premsa) ? response.sources.premsa : [];

    groupedSources.plens = plensRaw
      .map((source) => normalizeStructuredSource(source))
      .filter((source): source is IntelStructuredSource => Boolean(source));

    groupedSources.premsa = premsaRaw
      .map((source) => normalizeStructuredSource(source))
      .filter((source): source is IntelStructuredSource => Boolean(source));
  }

  const flatSources: Source[] = [
    ...groupedSources.plens.map((source) => ({
      label: source.label,
      title: source.title,
      short_title: source.short_title,
      date: source.date,
      url: source.url,
      source_type: source.source_type || 'plens',
      titulo: source.title,
      fecha: source.date,
      tipo: 'plens',
    })),
    ...groupedSources.premsa.map((source) => ({
      label: source.label,
      title: source.title,
      short_title: source.short_title,
      date: source.date,
      url: source.url,
      source_type: source.source_type || 'premsa',
      titulo: source.title,
      fecha: source.date,
      tipo: 'premsa',
    })),
  ];

  const degradedByFlag = response.degraded === true;
  const degradedByReason = Array.isArray(response.degradation_reasons)
    && response.degradation_reasons.some((reason) => typeof reason === 'string' && reason.toLowerCase().includes('premsa'));
  const noPremsaSources = groupedSources.premsa.length === 0;
  const premsaDegraded = degradedByFlag || degradedByReason;

  let premsaUnavailableMessage: string | undefined;
  if (premsaDegraded) {
    premsaUnavailableMessage = 'La part de premsa no està disponible ara mateix; et mostrem la resposta amb les fonts de plens disponibles.';
  } else if (noPremsaSources) {
    premsaUnavailableMessage = 'No s’han trobat fonts de premsa per a aquesta consulta.';
  }

  return {
    answer,
    flatSources,
    groupedSources,
    premsaDegraded,
    premsaUnavailableMessage,
  };
}
