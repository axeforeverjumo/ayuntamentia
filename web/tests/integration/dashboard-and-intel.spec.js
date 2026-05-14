const test = require('node:test');
const assert = require('node:assert/strict');

function traduirTema(tema) {
  const map = {
    procedimiento: 'procediment',
    hacienda: 'hisenda',
    urbanismo: 'urbanisme',
    medio_ambiente: 'medi ambient',
    servicios_sociales: 'serveis socials',
    educacion: 'educació',
    seguridad: 'seguretat',
    transporte: 'transport',
    comercio: 'comerç',
    vivienda: 'habitatge',
    salud: 'salut',
    hisenda: 'hisenda',
    habitatge: 'habitatge',
  };
  const lower = String(tema || '').toLowerCase().trim();
  return map[lower] || tema;
}

function buildTrendingHint(topic) {
  const hints = [];
  const score = topic.trending_score ?? topic.score?.trending_score;
  const principalSignal = topic.principal_signal || topic.score?.principal_signal || topic.principal_source || topic.score?.principal_source;
  const penalty = topic.penalty_applied ?? topic.score?.penalty_applied;

  if (typeof score === 'number') hints.push(`score ${score.toLocaleString('ca-ES', { maximumFractionDigits: 1 })}`);
  if (principalSignal) hints.push(`senyal principal: ${principalSignal}`);
  if (typeof penalty === 'number' && penalty < 1) {
    const penaltyPct = Math.round((1 - penalty) * 100);
    if (penaltyPct > 0) hints.push(`penalització aplicada: -${penaltyPct}%`);
  }
  return hints.join(' · ');
}

function renderTrendingTopicsWidget(topics) {
  const visible = topics.slice(0, 8);
  return {
    title: 'Temes en tendència',
    labels: visible.map((topic) => traduirTema(topic.tema || topic.nombre || '—')),
    hints: visible.map(buildTrendingHint),
  };
}

function renderMeetingsBanner(meetings) {
  return meetings.map((meeting) => ({
    badge: meeting.status === 'danger' ? 'Urgent' : 'Avís',
    title: meeting.title,
    municipality: meeting.municipality,
    message: meeting.message,
  }));
}

function normalizeIntelResponse(response) {
  const plens = Array.isArray(response.sources?.plens) ? response.sources.plens : [];
  const premsa = Array.isArray(response.sources?.premsa) ? response.sources.premsa : [];
  const degradedByFlag = response.degraded === true;
  const degradedByReason = Array.isArray(response.degradation_reasons)
    && response.degradation_reasons.some((reason) => typeof reason === 'string' && reason.toLowerCase().includes('premsa'));
  const premsaDegraded = degradedByFlag || degradedByReason;

  let premsaUnavailableMessage;
  if (premsaDegraded) {
    premsaUnavailableMessage = 'La part de premsa no està disponible ara mateix; et mostrem la resposta amb les fonts de plens disponibles.';
  } else if (premsa.length === 0) {
    premsaUnavailableMessage = 'No s’han trobat fonts de premsa per a aquesta consulta.';
  }

  return {
    groupedSources: { plens, premsa },
    premsaDegraded,
    premsaUnavailableMessage,
  };
}

test('tauler smoke: tendències renderitza ordre i penalització editorial visible', () => {
  const widget = renderTrendingTopicsWidget([
    { tema: 'habitatge', count: 5, trending_score: 7.5, score: { trending_score: 7.5, penalty_applied: 1 } },
    { tema: 'hisenda', count: 9, trending_score: 6.0, score: { trending_score: 6.0, penalty_applied: 0.5 } },
  ]);

  assert.equal(widget.title, 'Temes en tendència');
  assert.deepEqual(widget.labels, ['habitatge', 'hisenda']);
  assert.match(widget.hints[1], /penalització aplicada: -50%/i);
});

test('tauler reunions: cas groc i cas vermell exposen els badges esperats', () => {
  const rendered = renderMeetingsBanner([
    {
      title: 'Ple ordinari',
      municipality: 'Vic',
      status: 'warning',
      message: 'Reunió propera a Vic amb marge limitat.',
    },
    {
      title: 'Comissió urgent',
      municipality: 'Manlleu',
      status: 'danger',
      message: 'Reunió imminent o superada a Manlleu.',
    },
  ]);

  assert.deepEqual(rendered[0], {
    badge: 'Avís',
    title: 'Ple ordinari',
    municipality: 'Vic',
    message: 'Reunió propera a Vic amb marge limitat.',
  });
  assert.deepEqual(rendered[1], {
    badge: 'Urgent',
    title: 'Comissió urgent',
    municipality: 'Manlleu',
    message: 'Reunió imminent o superada a Manlleu.',
  });
});

test('mapa MVP: la validació documental exigeix absència de watermark visible', () => {
  const mapMarkup = '<div data-map="catalunya"><div class="legend">AC present</div></div>';
  assert.doesNotMatch(mapMarkup, /leaflet-control-attribution|openstreetmap|carto/i);
});

test('sala-intelligencia: resposta dual manté seccions PLENS i PREMSA visibles', () => {
  const normalized = normalizeIntelResponse({
    degraded: false,
    sources: {
      plens: [{ label: '📄 Ple Pressupost 2025 | 2025-01-10', title: 'Pressupost 2025' }],
      premsa: [{ label: '📰 Premsa La premsa destaca el debat | 2025-01-11', title: 'La premsa destaca el debat' }],
    },
  });

  assert.equal(normalized.groupedSources.plens[0].title, 'Pressupost 2025');
  assert.equal(normalized.groupedSources.premsa[0].title, 'La premsa destaca el debat');
  assert.equal(normalized.premsaDegraded, false);
});

test('sala-intelligencia: degradació de premsa no tomba la resposta i manté PLENS', () => {
  const normalized = normalizeIntelResponse({
    degraded: true,
    degradation_reasons: ['premsa_unavailable'],
    sources: {
      plens: [{ label: '📄 Ple Ple resilient | 2025-02-01', title: 'Ple resilient' }],
      premsa: [],
    },
  });

  assert.equal(normalized.premsaDegraded, true);
  assert.equal(normalized.groupedSources.plens[0].title, 'Ple resilient');
  assert.equal(normalized.groupedSources.premsa.length, 0);
  assert.match(normalized.premsaUnavailableMessage, /premsa no està disponible/i);
});
