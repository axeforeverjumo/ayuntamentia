'use client';

import { PanelBox } from '@/components/warroom/PanelBox';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { traduirTema } from '@/lib/temesCatala';
import type { TrendingTopic } from '@/types/dashboard';

interface TrendingTopicsWidgetProps {
  topics: TrendingTopic[];
  loading?: boolean;
  error?: string | null;
}

function getTopicLabel(topic: TrendingTopic): string {
  return traduirTema(topic.tema || topic.nombre || '—');
}

function getTopicMetric(topic: TrendingTopic): number {
  const score = topic.trending_score ?? topic.score?.trending_score;
  if (typeof score === 'number') {
    return score;
  }

  return topic.count ?? topic.menciones ?? 0;
}

function formatScore(value: number | null | undefined): string | null {
  if (typeof value !== 'number') {
    return null;
  }

  return value.toLocaleString('ca-ES', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function buildHint(topic: TrendingTopic): string | null {
  const hints: string[] = [];
  const scoreValue = formatScore(topic.trending_score ?? topic.score?.trending_score);
  const principalSignal = topic.principal_signal || topic.score?.principal_signal || topic.principal_source || topic.score?.principal_source;
  const penalty = topic.penalty_applied ?? topic.score?.penalty_applied;

  if (scoreValue) {
    hints.push(`score ${scoreValue}`);
  }

  if (principalSignal) {
    hints.push(`senyal principal: ${principalSignal}`);
  }

  if (typeof penalty === 'number' && penalty < 1) {
    const penaltyPct = Math.round((1 - penalty) * 100);
    if (penaltyPct > 0) {
      hints.push(`penalització aplicada: -${penaltyPct}%`);
    }
  }

  if (hints.length > 0) {
    return hints.join(' · ');
  }

  return topic.explanation_text || topic.score?.explanation_text || null;
}

export function TrendingTopicsWidget({ topics, loading = false, error = null }: TrendingTopicsWidgetProps) {
  const visibleTopics = topics.slice(0, 8);
  const maxValue = visibleTopics.length > 0
    ? Math.max(...visibleTopics.map((topic) => Math.max(getTopicMetric(topic), 1)))
    : 1;

  return (
    <PanelBox title="Temes en tendència" subtitle={`top ${Math.min(topics.length, 8)}`} tone="amber">
      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Carregant temes en tendència...
        </div>
      ) : error ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F8A4A4', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          No s’han pogut carregar els temes
        </div>
      ) : visibleTopics.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Cap tema en tendència ara mateix
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleTopics.map((topic, index) => {
            const hint = buildHint(topic);

            return (
              <div key={`${topic.tema || topic.nombre || 'tema'}-${index}`}>
                <TrendingBar
                  label={getTopicLabel(topic)}
                  value={getTopicMetric(topic)}
                  max={maxValue}
                  tone={index < 2 ? 'red' : index < 5 ? 'amber' : 'phos'}
                />
                {hint ? (
                  <div style={{ marginTop: -2, marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)', letterSpacing: '.04em' }}>
                    {hint}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </PanelBox>
  );
}
