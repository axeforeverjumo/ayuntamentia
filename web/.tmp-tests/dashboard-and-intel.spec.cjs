const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { LastProcessedPlensWidget } = require('../src/components/dashboard/LastProcessedPlensWidget');
const { TrendingTopicsWidget } = require('../src/components/dashboard/TrendingTopicsWidget');
const { SourcesGrid } = require('../src/components/ui/SourceCard');
const { normalizeIntelResponse } = require('../src/lib/intel');

const activity = [
  {
    id: 1,
    municipio: 'Vic',
    tipo: 'Ordinari',
    num_puntos: 12,
    fecha: '2026-05-14',
  },
];

test('tauler smoke: widgets renderitzen tendències, cas groc i mapa sense watermark visible', async () => {
  const { MapaCatalunyaLeaflet } = await import('../src/components/features/MapaCatalunyaLeaflet.tsx');

  const topics = [
    { tema: 'habitatge', count: 5, trending_score: 7.5, score: { trending_score: 7.5, penalty_applied: 1 } },
    { tema: 'hisenda', count: 9, trending_score: 6.0, score: { trending_score: 6.0, penalty_applied: 0.5 } },
  ];

  const warningOverview = {
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
    React.createElement(TrendingTopicsWidget, { topics, loading: false, error: null }),
  );
  const meetingsMarkup = renderToStaticMarkup(
    React.createElement(LastProcessedPlensWidget, { activity, overview: warningOverview }),
  );
  const mapMarkup = renderToStaticMarkup(React.createElement(MapaCatalunyaLeaflet));

  assert.match(trendingMarkup, /Temes en tendència/);
  assert.match(trendingMarkup, /habitatge/i);
  assert.match(trendingMarkup, /hisenda/i);
  assert.match(meetingsMarkup, /Avís/);
  assert.match(meetingsMarkup, /Ple ordinari/);
  assert.doesNotMatch(mapMarkup, /leaflet-control-attribution|openstreetmap|carto/i);
});

test('tauler reunions: cas vermell renderitza estat urgent', () => {
  const dangerOverview = {
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

test('sala-intelligencia: resposta dual mostra PLENS i PREMSA visibles', () => {
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

test('sala-intelligencia: degradació de premsa manté plens i avís parcial', () => {
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
