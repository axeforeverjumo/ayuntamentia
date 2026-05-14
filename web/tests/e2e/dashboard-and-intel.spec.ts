import test from 'node:test';
import assert from 'node:assert/strict';
import { LastProcessedPlensWidget } from '@/components/dashboard/LastProcessedPlensWidget';
import { TrendingTopicsWidget } from '@/components/dashboard/TrendingTopicsWidget';
import { SourcesGrid } from '@/components/ui/SourceCard';
import { normalizeIntelResponse } from '@/lib/intel';
import type { DashboardOverview, TrendingTopic } from '@/types/dashboard';
import { MapaCatalunyaLeaflet } from '@/components/features/MapaCatalunyaLeaflet';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const activity = [
  {
    id: 1,
    municipio: 'Vic',
    tipo: 'Ordinari',
    num_puntos: 12,
    fecha: '2026-05-14',
  },
];

test('smoke tauler widgets render trending, reunions warning i mapa sense watermark visible', () => {
  const topics: TrendingTopic[] = [
    { tema: 'habitatge', count: 5, trending_score: 7.5, score: { trending_score: 7.5, penalty_applied: 1 } },
    { tema: 'hisenda', count: 9, trending_score: 6.0, score: { trending_score: 6.0, penalty_applied: 0.5 } },
  ];

  const warningOverview: DashboardOverview = {
    upcoming_meetings_banner: {
      status: 'warning',
      meetings: [
        {
          rule_id: 11,
          title: 'Ple ordinari',
          municipality: 'Vic',
          meeting_at: '2026-05-20T10:00:00+00:00',
          status: 'warning',
          message: 'Reunió propera a Vic amb marge limitat.',
        },
      ],
      total: 1,
    },
  };

  const trendingMarkup = renderToStaticMarkup(
    React.createElement(TrendingTopicsWidget, {
      topics,
      loading: false,
      error: null,
    }),
  );
  const meetingsMarkup = renderToStaticMarkup(
    React.createElement(LastProcessedPlensWidget, { activity, overview: warningOverview }),
  );
  const mapMarkup = renderToStaticMarkup(React.createElement(MapaCatalunyaLeaflet));

  assert.match(trendingMarkup, /Temes en tendència/);
  assert.match(trendingMarkup, /habitatge/i);
  assert.match(meetingsMarkup, /Avís/);
  assert.match(meetingsMarkup, /Ple ordinari/);
  assert.doesNotMatch(mapMarkup, /leaflet-control-attribution|openstreetmap|carto/i);
});

test('tauler reunions cas vermell renderitza estat urgent', () => {
  const dangerOverview: DashboardOverview = {
    upcoming_meetings_banner: {
      status: 'danger',
      meetings: [
        {
          rule_id: 12,
          title: 'Comissió urgent',
          municipality: 'Manlleu',
          meeting_at: '2026-05-19T08:00:00+00:00',
          status: 'danger',
          message: 'Reunió imminent o superada a Manlleu.',
        },
      ],
      total: 1,
    },
  };

  const markup = renderToStaticMarkup(
    React.createElement(LastProcessedPlensWidget, { activity, overview: dangerOverview }),
  );

  assert.match(markup, /Urgent/);
  assert.match(markup, /Comissió urgent/);
  assert.match(markup, /Manlleu/);
});

test('sala-intelligencia mostra fonts visibles PLENS i PREMSA', () => {
  const normalized = normalizeIntelResponse({
    answer: 'Resposta amb doble context',
    text: 'Resposta amb doble context',
    sources: {
      plens: [
        {
          label: '📄 Ple Pressupost 2025 | 2025-01-10',
          title: 'Pressupost 2025',
          date: '2025-01-10',
          url: 'https://example.com/ple-1',
          source_type: 'plens',
        },
      ],
      premsa: [
        {
          label: '📰 Premsa La premsa destaca el debat | 2025-01-11',
          title: 'La premsa destaca el debat',
          date: '2025-01-11',
          url: 'https://example.com/premsa-1',
          source_type: 'premsa',
        },
      ],
    },
  });

  const markup = renderToStaticMarkup(
    React.createElement(SourcesGrid, {
      sources: normalized.flatSources,
      groupedSources: normalized.groupedSources,
      premsaDegraded: normalized.premsaDegraded,
      premsaUnavailableMessage: normalized.premsaUnavailableMessage,
    }),
  );

  assert.match(markup, /PLENS/);
  assert.match(markup, /PREMSA/);
  assert.match(markup, /Pressupost 2025/);
  assert.match(markup, /La premsa destaca el debat/);
});

test('sala-intelligencia degrada bé si falla premsa i manté plens visibles', () => {
  const normalized = normalizeIntelResponse({
    answer: 'Resposta només amb fonts de plens',
    text: 'Resposta només amb fonts de plens',
    degraded: true,
    degradation_reasons: ['premsa_unavailable'],
    sources: {
      plens: [
        {
          label: '📄 Ple Ple resilient | 2025-02-01',
          title: 'Ple resilient',
          date: '2025-02-01',
          url: 'https://example.com/ple-7',
          source_type: 'plens',
        },
      ],
      premsa: [],
    },
  });

  const markup = renderToStaticMarkup(
    React.createElement(SourcesGrid, {
      sources: normalized.flatSources,
      groupedSources: normalized.groupedSources,
      premsaDegraded: normalized.premsaDegraded,
      premsaUnavailableMessage: normalized.premsaUnavailableMessage,
    }),
  );

  assert.equal(normalized.premsaDegraded, true);
  assert.match(markup, /PLENS/);
  assert.match(markup, /Ple resilient/);
  assert.match(markup, /La part de premsa no està disponible ara mateix/i);
});
