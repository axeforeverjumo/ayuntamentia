import apiClient from '@/lib/ApiClient';
import type { TrendingTopic } from '@/types/dashboard';

function normalizeTrendingTopic(item: unknown): TrendingTopic | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const score = candidate.score && typeof candidate.score === 'object'
    ? candidate.score as Record<string, unknown>
    : null;

  return {
    tema: typeof candidate.tema === 'string' ? candidate.tema : null,
    nombre: typeof candidate.nombre === 'string' ? candidate.nombre : null,
    count: typeof candidate.count === 'number' ? candidate.count : null,
    menciones: typeof candidate.menciones === 'number' ? candidate.menciones : null,
    trending_score: typeof candidate.trending_score === 'number' ? candidate.trending_score : null,
    principal_signal: typeof candidate.principal_signal === 'string'
      ? candidate.principal_signal
      : typeof score?.principal_signal === 'string'
        ? score.principal_signal
        : null,
    principal_source: typeof candidate.principal_source === 'string'
      ? candidate.principal_source
      : typeof score?.principal_source === 'string'
        ? score.principal_source
        : null,
    penalty_applied: typeof candidate.penalty_applied === 'number'
      ? candidate.penalty_applied
      : typeof score?.penalty_applied === 'number'
        ? score.penalty_applied
        : null,
    penalty_label: typeof candidate.penalty_label === 'string'
      ? candidate.penalty_label
      : typeof score?.penalty_label === 'string'
        ? score.penalty_label
        : null,
    explanation_text: typeof candidate.explanation_text === 'string'
      ? candidate.explanation_text
      : typeof score?.explanation_text === 'string'
        ? score.explanation_text
        : null,
    score: score ? {
      trending_score: typeof score.trending_score === 'number' ? score.trending_score : null,
      base_score: typeof score.base_score === 'number' ? score.base_score : null,
      delta_plens: typeof score.delta_plens === 'number' ? score.delta_plens : null,
      score_premsa: typeof score.score_premsa === 'number' ? score.score_premsa : null,
      score_xarxes: typeof score.score_xarxes === 'number' ? score.score_xarxes : null,
      penalty_applied: typeof score.penalty_applied === 'number' ? score.penalty_applied : null,
      calculated_at: typeof score.calculated_at === 'string' ? score.calculated_at : null,
      principal_signal: typeof score.principal_signal === 'string' ? score.principal_signal : null,
      principal_source: typeof score.principal_source === 'string' ? score.principal_source : null,
      penalty_label: typeof score.penalty_label === 'string' ? score.penalty_label : null,
      explanation_text: typeof score.explanation_text === 'string' ? score.explanation_text : null,
    } : null,
  };
}

export async function fetchTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const response = await apiClient.get<unknown[]>('/api/dashboard/tendencias');
    if (!Array.isArray(response)) {
      return [];
    }

    return response
      .map(normalizeTrendingTopic)
      .filter((item): item is TrendingTopic => item !== null);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No s’han pogut carregar els temes en tendència');
  }
}
