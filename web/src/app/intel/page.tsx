'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { Gauge, DotGrid, CornerBrack } from '@/components/landing/primitives';
import { traduirTema } from '@/lib/temesCatala';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type Ranking = {
  nombre: string; cargo: string | null; partido: string; municipio: string; comarca: string | null;
  votos_total: number; coincidentes: number; divergencias: number; pct_alineacion: number;
};
type Tendencia = { tema: string; actual: number; previo: number; delta: number; pct_crecimiento: number | null };
type Promesa = {
  tema: string; partido_parlament: string;
  rechazadas: number; aprobadas: number; municipios_contradictores: string[] | null;
};

const TABS = [
  { id: 'ranking', label: 'Rànquing intern', color: 'var(--wr-phosphor)' },
  { id: 'tendencies', label: 'Tendències', color: 'var(--wr-amber)' },
  { id: 'competencia', label: 'Intel·ligència competitiva', color: 'var(--wr-red-2)' },
  { id: 'promeses', label: 'Promeses incomplertes', color: 'var(--wr-red-2)' },
] as const;

export default function IntelPage() {
  const [tab, setTab] = useState<string>('ranking');
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [tend, setTend] = useState<Tendencia[]>([]);
  const [prom, setProm] = useState<Promesa[]>([]);
  const [partido, setPartido] = useState('');
  const [order, setOrder] = useState<'divergencia' | 'alineacion'>('divergencia');

  useEffect(() => {
    const q = new URLSearchParams({ order, limit: '50' });
    if (partido) q.set('partido', partido);
    fetch(`${API}/api/intel/ranking-concejales?${q}`).then(r => r.ok ? r.json() : []).then(d => setRanking(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/intel/tendencias`).then(r => r.ok ? r.json() : []).then(d => setTend(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/intel/promesas-incumplidas`).then(r => r.ok ? r.json() : []).then(d => setProm(Array.isArray(d) ? d : [])).catch(() => {});
  }, [partido, order]);

  const maxTend = tend.length > 0 ? Math.max(...tend.map(t => t.actual)) : 1;

  // Derived stats for ranking tab
  const dangerCount = ranking.filter(r => r.pct_alineacion < 70).length;
  const avgAlineacion = ranking.length > 0
    ? Math.round(ranking.reduce((s, r) => s + r.pct_alineacion, 0) / ranking.length)
    : 0;
  const top5Divergents = [...ranking].sort((a, b) => a.pct_alineacion - b.pct_alineacion).slice(0, 5);

  // Derived stats for competencia tab (exclude AC)
  const partitStats = ranking.reduce((acc: Record<string, { total: number; divergents: number; sumAlin: number }>, r) => {
    if (r.partido === 'AC' || r.partido.includes('ALIAN')) return acc;
    if (!acc[r.partido]) acc[r.partido] = { total: 0, divergents: 0, sumAlin: 0 };
    acc[r.partido].total++;
    if (r.pct_alineacion < 70) acc[r.partido].divergents++;
    acc[r.partido].sumAlin += r.pct_alineacion;
    return acc;
  }, {});

  const partitList = Object.entries(partitStats)
    .map(([name, s]) => ({
      name,
      total: s.total,
      divergents: s.divergents,
      avgAlin: Math.round(s.sumAlin / s.total),
      vulnerabilitat: Math.round((s.divergents / s.total) * 100),
    }))
    .sort((a, b) => b.vulnerabilitat - a.vulnerabilitat)
    .slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Intel·ligència"
        title={<>Intel·ligència <em style={{ color: 'var(--wr-amber)', fontWeight: 400 }}>estratègica.</em></>}
        info={{
          title: 'Intel·ligència estratègica',
          description: "Anàlisi profunda del posicionament polític. Detecta qui no va alineat dins de cada partit (Rànquing), quins temes estan escalant (Tendències), la vulnerabilitat dels rivals (Competitiva) i les promeses que no es compleixen (Promeses).",
          dataSource: 'Anàlisi creuat de votacions, actes i sessions parlamentàries',
          tips: [
            "Al Rànquing, els regidors amb menys alineació són 'targets' — divergeixen del seu grup",
            'Les Tendències et diuen on posar el focus aquesta setmana',
            "Intel·ligència Competitiva agrupa rivals per vulnerabilitat — el més vulnerable és el més atacable",
          ],
        }}
        actions={<StatusLine color="var(--wr-phosphor)">947 municipis · anàlisi continu</StatusLine>}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 16px', background: tab === t.id ? 'var(--ink-3)' : 'transparent',
            border: 'none', borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t.id ? 'var(--paper)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }}>

        {/* ─── TAB 1: RÀNQUING INTERN ─── */}
        {tab === 'ranking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPIs */}
            <KPIGrid>
              <KPICard label="Regidors analitzats" value={ranking.length} tone="default" />
              <KPICard label="Alineació < 70%" value={dangerCount} tone="red"
                sublabel={ranking.length > 0 ? `${Math.round(dangerCount / ranking.length * 100)}% del total` : '—'} />
              <KPICard label="Alineació mitjana" value={avgAlineacion} tone={avgAlineacion >= 80 ? 'phos' : 'amber'} suffix="%" />
            </KPIGrid>

            {/* Threat radar — top 5 */}
            {top5Divergents.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <PanelBox title="Threat radar" subtitle="top 5 divergents" tone="red">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {top5Divergents.map((r, i) => {
                      const borderColor = r.pct_alineacion < 60
                        ? 'var(--wr-red-2)'
                        : r.pct_alineacion < 70
                          ? 'var(--wr-amber)'
                          : 'var(--wr-phosphor)';
                      return (
                        <div key={i} style={{
                          borderLeft: `3px solid ${borderColor}`,
                          paddingLeft: 12, paddingTop: 6, paddingBottom: 6,
                          background: r.pct_alineacion < 60 ? 'rgba(212,58,31,.04)' : 'transparent',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper)', lineHeight: 1 }}>
                              {r.nombre}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                              color: borderColor,
                            }}>{r.pct_alineacion}%</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <StatusBadge tone={r.partido === 'AC' ? 'phos' : 'bone'}>{r.partido}</StatusBadge>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>{r.municipio}</span>
                          </div>
                          <Gauge label="" value={r.pct_alineacion} tone={r.pct_alineacion < 60 ? 'red' : r.pct_alineacion < 70 ? 'amber' : 'phos'} />
                        </div>
                      );
                    })}
                  </div>
                </PanelBox>

                {/* Filters + table preview */}
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <input placeholder="Filtra per partit (ex: AC, PSC)"
                      value={partido} onChange={(e) => setPartido(e.target.value)}
                      style={{
                        padding: '8px 14px', background: 'var(--ink-2)', border: '1px solid var(--line)',
                        color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none',
                        flex: 1,
                      }}
                    />
                    <select value={order} onChange={(e) => setOrder(e.target.value as 'divergencia' | 'alineacion')}
                      style={{
                        padding: '8px 14px', background: 'var(--ink-2)', border: '1px solid var(--line)',
                        color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12,
                      }}>
                      <option value="divergencia">Més divergents primer</option>
                      <option value="alineacion">Més alineats primer</option>
                    </select>
                  </div>

                  <div style={{ border: '1px solid var(--line)', background: 'var(--ink-2)' }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 70px 110px 60px 70px 100px',
                      padding: '10px 14px', borderBottom: '1px solid var(--line)',
                      fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
                      letterSpacing: '.14em', textTransform: 'uppercase',
                    }}>
                      <span>Regidor</span><span>Partit</span><span>Municipi</span>
                      <span style={{ textAlign: 'right' }}>Vots</span>
                      <span style={{ textAlign: 'right' }}>Diverg.</span>
                      <span style={{ textAlign: 'right' }}>% Alin.</span>
                    </div>
                    {ranking.map((r, i) => {
                      const danger = r.pct_alineacion < 70;
                      return (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '1fr 70px 110px 60px 70px 100px',
                          padding: '9px 14px', borderBottom: '1px dashed var(--line-soft)',
                          fontSize: 12,
                          background: danger ? 'rgba(212,58,31,.03)' : 'transparent',
                          transition: 'background .15s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(212,58,31,.07)' : 'var(--ink-3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = danger ? 'rgba(212,58,31,.03)' : 'transparent')}
                        >
                          <span style={{ color: 'var(--paper)', fontWeight: 500 }}>{r.nombre}</span>
                          <StatusBadge tone="bone">{r.partido}</StatusBadge>
                          <span style={{ color: 'var(--fog)', fontSize: 11 }}>{r.municipio}</span>
                          <span style={{ textAlign: 'right', color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.votos_total}</span>
                          <span style={{ textAlign: 'right', color: 'var(--wr-amber)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{r.divergencias}</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                              color: danger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
                            }}>
                              {r.pct_alineacion}%
                            </span>
                            <div style={{ height: 2, background: 'var(--line)', marginTop: 3, marginLeft: 'auto', width: 60 }}>
                              <div style={{
                                height: '100%', width: `${r.pct_alineacion}%`,
                                background: danger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
                                transition: 'width .6s',
                              }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {ranking.length === 0 && (
                      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                        Sense dades suficients encara
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state if no data yet */}
            {top5Divergents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--paper)', marginBottom: 10 }}>Sense dades de regidors</div>
                <p style={{ fontSize: 13, color: 'var(--fog)', maxWidth: 400, margin: '0 auto' }}>
                  Quan es processin actes amb votacions, el rànquing apareixerà aquí.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: TENDÈNCIES ─── */}
        {tab === 'tendencies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Signal board */}
            <PanelBox title="Signal board" subtitle="temes actius · variació 30 dies" tone="amber">
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <CornerBrack />
                <DotGrid size={22} opacity={0.03} />
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)' }}>
                  {/* Creixement */}
                  <div style={{ background: 'var(--ink-2)', padding: '18px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-phosphor)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>↑</span> EN CREIXEMENT
                    </div>
                    {tend.filter(t => t.delta > 0).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {tend.filter(t => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 8).map((t, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--paper)', lineHeight: 1 }}>
                                {traduirTema(t.tema)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-phosphor)', fontWeight: 700 }}>
                                  +{t.delta}
                                </span>
                                {t.pct_crecimiento !== null && (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>
                                    {t.pct_crecimiento}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <TrendingBar label="" value={t.actual} max={maxTend} tone={i < 2 ? 'red' : 'amber'} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', padding: '20px 0' }}>
                        Sense temes en creixement
                      </div>
                    )}
                  </div>

                  {/* Descens */}
                  <div style={{ background: 'var(--ink-2)', padding: '18px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-red-2)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>↓</span> EN DESCENS
                    </div>
                    {tend.filter(t => t.delta < 0).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {tend.filter(t => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 8).map((t, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--paper)', lineHeight: 1 }}>
                                {traduirTema(t.tema)}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-red-2)', fontWeight: 700 }}>
                                {t.delta}
                              </span>
                            </div>
                            <TrendingBar label="" value={Math.abs(t.delta)} max={maxTend} tone="phos" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', padding: '20px 0' }}>
                        Cap tema en descens detectat
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PanelBox>

            {/* Heatmap */}
            {tend.length > 0 && (
              <PanelBox title="Mapa d'intensitat" subtitle={`${tend.length} temes · actual vs previ`} tone="amber">
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 480 }}>
                    {/* Header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px',
                      padding: '8px 12px', borderBottom: '1px solid var(--line)',
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
                      letterSpacing: '.14em', textTransform: 'uppercase',
                    }}>
                      <span>Tema</span>
                      <span style={{ textAlign: 'center' }}>Actual</span>
                      <span style={{ textAlign: 'center' }}>Previ</span>
                      <span style={{ textAlign: 'center' }}>Variació</span>
                    </div>
                    {[...tend].sort((a, b) => b.actual - a.actual).map((t, i) => {
                      const maxVal = maxTend;
                      const intensityActual = t.actual / maxVal;
                      const intensityPrev = t.previo / maxVal;
                      const heatColor = (v: number) =>
                        v > 0.7 ? 'var(--wr-red-2)' :
                        v > 0.4 ? 'var(--wr-amber)' :
                        v > 0.1 ? 'var(--wr-phosphor-dim)' :
                        'var(--line)';
                      return (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px',
                          padding: '8px 12px', borderBottom: '1px dashed var(--line-soft)',
                          alignItems: 'center',
                        }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--paper)' }}>
                            {traduirTema(t.tema)}
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 36, height: 20,
                              background: heatColor(intensityActual),
                              opacity: 0.15 + intensityActual * 0.85,
                              transition: 'all .4s',
                            }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)', minWidth: 24, textAlign: 'right' }}>{t.actual}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 36, height: 20,
                              background: heatColor(intensityPrev),
                              opacity: 0.15 + intensityPrev * 0.85,
                              transition: 'all .4s',
                            }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', minWidth: 24, textAlign: 'right' }}>{t.previo}</span>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                              color: t.delta > 0 ? 'var(--wr-phosphor)' : t.delta < 0 ? 'var(--wr-red-2)' : 'var(--fog)',
                            }}>
                              {t.delta > 0 ? '+' : ''}{t.delta}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PanelBox>
            )}

            {tend.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Sense prou historial per detectar tendències
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: INTEL·LIGÈNCIA COMPETITIVA ─── */}
        {tab === 'competencia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {partitList.length > 0 ? (
              <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Anàlisi de rivals · Dades reals del rànquing
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--paper)', fontWeight: 400 }}>
                      Partits <em style={{ color: 'var(--wr-red-2)' }}>vulnerables.</em>
                    </div>
                  </div>
                  <Link href="/chat?mode=atacar" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--wr-red)', color: 'var(--paper)', border: '1px solid var(--wr-red)',
                    padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 11,
                    letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                    textDecoration: 'none', boxShadow: '0 0 20px -6px rgba(255,90,60,.4)',
                  }}>
                    ◼ Analitzar rival al War Room →
                  </Link>
                </div>

                {/* Partits grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {partitList.map((p, i) => (
                    <div key={p.name} style={{
                      background: 'var(--ink-2)', border: '1px solid var(--line)',
                      padding: '20px 18px', position: 'relative', overflow: 'hidden',
                    }}>
                      {i === 0 && <CornerBrack />}
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', lineHeight: 1 }}>
                            {p.name}
                          </span>
                          {i === 0 && (
                            <StatusBadge tone="red">◼ MÉS VULNERABLE</StatusBadge>
                          )}
                          {i === 1 && (
                            <StatusBadge tone="amber">⚠ VIGILAR</StatusBadge>
                          )}
                        </div>

                        <Gauge
                          label={`Alineació mitjana · ${p.total} regidors`}
                          value={p.avgAlin}
                          tone={p.avgAlin < 60 ? 'red' : p.avgAlin < 75 ? 'amber' : 'phos'}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', marginTop: 12 }}>
                          <div style={{ background: 'var(--ink)', padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                              Divergents
                            </div>
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--wr-amber)', lineHeight: 1 }}>
                              {p.divergents}
                            </div>
                          </div>
                          <div style={{ background: 'var(--ink)', padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                              Vulnerabilitat
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1,
                              color: p.vulnerabilitat > 50 ? 'var(--wr-red-2)' : p.vulnerabilitat > 25 ? 'var(--wr-amber)' : 'var(--wr-phosphor)',
                              fontStyle: 'italic',
                            }}>
                              {p.vulnerabilitat}%
                            </div>
                          </div>
                        </div>

                        <Link href={`/chat?mode=atacar&q=${encodeURIComponent(`Analitza les debilitats i contradiccions internes del ${p.name}. Quins regidors no segueixen la línia del partit? On hi ha divergències municipals?`)}`}
                          style={{
                            display: 'block', marginTop: 12, padding: '8px 12px',
                            background: 'transparent', border: '1px dashed var(--line)',
                            color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
                            letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none',
                            textAlign: 'center',
                          }}>
                          → Explotar al War Room
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 12 }}>Sense dades rivals</div>
                <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
                  Quan hi hagi prou dades de regidors d&apos;altres partits, la intel·ligència competitiva apareixerà aquí.
                </p>
                <StatusBadge tone="amber">◼ EN PROCESSAMENT</StatusBadge>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: PROMESES INCOMPLERTES ─── */}
        {tab === 'promeses' && (
          <div>
            {prom.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {prom.map((p, i) => (
                  <div key={i} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--paper)' }}>{traduirTema(p.tema)}</span>
                      <StatusBadge tone="red">{p.rechazadas} rebutjades</StatusBadge>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--bone)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--paper)' }}>{p.partido_parlament}</strong> ho proposa al Parlament
                      {p.aprobadas > 0 && ` (aprovat en ${p.aprobadas} municipis) `}
                      però rebutjat a: {(p.municipios_contradictores || []).slice(0, 8).join(', ')}
                      {(p.municipios_contradictores || []).length > 8 && '…'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Rich empty state */
              <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 24 }}>
                <div style={{
                  background: 'var(--ink-2)', border: '1px solid var(--line)',
                  padding: '40px 36px', position: 'relative', overflow: 'hidden', marginBottom: 16,
                }}>
                  <CornerBrack />
                  <DotGrid size={24} opacity={0.04} />
                  <div style={{ position: 'relative', textAlign: 'center' }}>
                    {/* Parlament SVG icon */}
                    <div style={{
                      width: 72, height: 72, margin: '0 auto 24px',
                      border: '1px solid var(--line)', display: 'grid', placeItems: 'center',
                      background: 'var(--ink)',
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wr-amber)" strokeWidth="1.2">
                        <path d="M3 21V5l9-3 9 3v16M3 21h18M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/>
                      </svg>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Sistema en espera
                    </div>
                    <h2 style={{
                      fontFamily: 'var(--font-serif)', fontSize: 36, color: 'var(--paper)',
                      fontWeight: 400, margin: '0 0 16px', lineHeight: 1,
                    }}>
                      Sense dades del <em style={{ color: 'var(--wr-amber)' }}>Parlament.</em>
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--bone)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 28px' }}>
                      Quan es processin sessions parlamentàries, el sistema creuarà automàticament les propostes amb les votacions municipals per detectar incoherències entre el discurs nacional i l&apos;acció local.
                    </p>

                    <button style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                      background: 'transparent', border: '1px solid var(--wr-amber)', color: 'var(--wr-amber)',
                      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}>
                      ◼ Notifica&apos;m quan estigui disponible
                    </button>
                  </div>
                </div>

                {/* Example cards — muted */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Exemple — com es veurà quan hi hagi dades
                </div>
                {[
                  { partit: 'PSC', text: 'PSC proposa millora d\'habitatge social al Parlament → rebutjat a 3 municipis on governa (Hospitalet, Cornellà, Gavà)' },
                  { partit: 'ERC', text: 'ERC defensa reducció de taxes municipals al Parlament → vota en contra a Girona i Lleida a la pràctica' },
                ].map((ex, i) => (
                  <div key={i} style={{
                    background: 'transparent', border: '1px dashed var(--line-soft)',
                    padding: '14px 16px', marginBottom: 8, opacity: 0.45,
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
                      letterSpacing: '.12em', textTransform: 'uppercase', flexShrink: 0,
                      border: '1px solid var(--line)', padding: '2px 6px', marginTop: 2,
                    }}>EXEMPLE</span>
                    <span style={{ fontSize: 13, color: 'var(--paper)', lineHeight: 1.5 }}>{ex.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
