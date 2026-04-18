'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { Gauge, CornerBrack, DotGrid } from '@/components/landing/primitives';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const PARTITS = ['AC', 'JxCat', 'ERC', 'PSC', 'PP', 'CUP', 'VOX', 'Comuns'];

export default function ReputacioPage() {
  const [stats, setStats] = useState<any>(null);
  const [partit, setPartit] = useState('AC');
  const [detall, setDetall] = useState<any>(null);
  const [negatius, setNegatius] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'detall' | 'neteja'>('overview');

  useEffect(() => {
    fetch(`${API}/api/reputacio/stats?dies=30`).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/reputacio/sentiment-partit?partit=${partit}&dies=30`).then(r => r.ok ? r.json() : null).then(setDetall).catch(() => {});
    fetch(`${API}/api/reputacio/temes-negatius?partit=${partit}&dies=30`).then(r => r.ok ? r.json() : null).then(d => setNegatius(d?.articles || [])).catch(() => {});
  }, [partit]);

  const TABS = [
    { id: 'overview', label: 'Panorama general', color: 'var(--wr-phosphor)' },
    { id: 'detall', label: `Detall ${partit}`, color: 'var(--wr-amber)' },
    { id: 'neteja', label: 'Neteja reputació', color: 'var(--wr-red-2)' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Reputació"
        title={<>Reputació i <em style={{ color: 'var(--wr-red-2)', fontWeight: 400 }}>premsa.</em></>}
        info="Monitoratge de premsa catalana en temps real. Sentiment per partit, evolució temporal i eines de neteja de reputació."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusLine color="var(--wr-phosphor)">
              {stats?.total_articles || 0} articles · 30d
            </StatusLine>
            <button onClick={() => fetch(`${API}/api/reputacio/ingest`, { method: 'POST' }).then(() => window.location.reload())} style={{
              padding: '6px 12px', background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}>▸ Sync ara</button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 16px', background: tab === t.id ? '#0e0e0e' : 'transparent',
            border: 'none', borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t.id ? 'var(--paper)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Partit selector */}
      <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PARTITS.map(p => (
          <button key={p} onClick={() => setPartit(p)} style={{
            padding: '6px 12px', background: partit === p ? 'var(--paper)' : 'transparent',
            color: partit === p ? 'var(--ink)' : 'var(--bone)',
            border: '1px solid ' + (partit === p ? 'var(--paper)' : 'var(--line)'),
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em',
            textTransform: 'uppercase', cursor: 'pointer', fontWeight: partit === p ? 700 : 400,
          }}>{p}</button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }}>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div>
            {stats ? (
              <>
                <KPIGrid>
                  <KPICard label="Total articles" value={stats.total_articles} tone="default" />
                  <KPICard label="Positius" value={stats.positius} tone="phos" />
                  <KPICard label="Negatius" value={stats.negatius} tone="red" />
                  <KPICard label="Neutres" value={stats.neutres} tone="default" />
                </KPIGrid>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <PanelBox title="Mencions per partit" subtitle="30 dies" tone="amber">
                    {stats.per_partit?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {stats.per_partit.map((p: any, i: number) => (
                          <TrendingBar key={i} label={p.partit} value={p.mencions}
                            max={stats.per_partit[0]?.mencions || 1}
                            tone={p.partit === 'AC' ? 'phos' : i < 3 ? 'red' : 'amber'} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState text="Esperant dades de premsa..." />
                    )}
                  </PanelBox>

                  <PanelBox title="Fonts actives" subtitle={`${stats.per_font?.length || 0} diaris`} tone="phos">
                    {stats.per_font?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {stats.per_font.map((f: any, i: number) => (
                          <TrendingBar key={i} label={f.font} value={f.articles}
                            max={stats.per_font[0]?.articles || 1} tone="phos" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState text="Cap font configurada" />
                    )}
                  </PanelBox>
                </div>
              </>
            ) : (
              <EmptyState text="Carregant estadístiques de premsa..." large />
            )}
          </div>
        )}

        {/* ── Detall per partit ── */}
        {tab === 'detall' && (
          <div>
            {detall ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <PanelBox title="Sentiment" subtitle={partit} tone={detall.negatius > detall.positius ? 'red' : 'phos'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Gauge label="Positiu" value={detall.positius + detall.negatius > 0 ? Math.round(detall.positius / (detall.positius + detall.negatius + detall.neutres) * 100) : 0} tone="phos" />
                      <Gauge label="Negatiu" value={detall.positius + detall.negatius > 0 ? Math.round(detall.negatius / (detall.positius + detall.negatius + detall.neutres) * 100) : 0} tone="red" />
                      <Gauge label="Neutre" value={detall.positius + detall.negatius > 0 ? Math.round(detall.neutres / (detall.positius + detall.negatius + detall.neutres) * 100) : 0} tone="amber" />
                    </div>
                  </PanelBox>

                  <div style={{ gridColumn: 'span 2' }}>
                    <PanelBox title="Últims articles" subtitle={`${detall.articles?.length || 0} recents`} tone="amber">
                      {detall.articles?.length > 0 ? (
                        <div>
                          {detall.articles.slice(0, 8).map((a: any, i: number) => (
                            <div key={i} style={{
                              display: 'grid', gridTemplateColumns: '70px 1fr auto',
                              gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--line-soft)',
                            }}>
                              <StatusBadge tone={a.sentiment === 'positiu' ? 'phos' : a.sentiment === 'negatiu' ? 'red' : 'bone'}>
                                {a.sentiment === 'positiu' ? '+' : a.sentiment === 'negatiu' ? '−' : '·'}
                              </StatusBadge>
                              <div>
                                <div style={{ fontSize: 12, color: 'var(--paper)', lineHeight: 1.3 }}>{a.titol}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginTop: 2 }}>
                                  {a.font} · {a.data}
                                </div>
                              </div>
                              {a.url && (
                                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
                                  fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--bone)',
                                  textDecoration: 'none', alignSelf: 'start',
                                }}>→</a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState text={`Cap article trobat per ${partit}`} />
                      )}
                    </PanelBox>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState text="Carregant detall..." large />
            )}
          </div>
        )}

        {/* ── Neteja reputació ── */}
        {tab === 'neteja' && (
          <div>
            <div style={{
              background: '#050505', border: '1px solid var(--line)', padding: '28px 24px',
              position: 'relative', overflow: 'hidden', marginBottom: 16,
            }}>
              <CornerBrack />
              <DotGrid size={24} opacity={0.04} />
              <div style={{ position: 'relative' }}>
                <StatusBadge tone="red">◼ NETEJA DE REPUTACIÓ · {partit}</StatusBadge>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontSize: 32, margin: '14px 0 10px',
                  lineHeight: 1, color: 'var(--paper)', fontWeight: 400,
                }}>
                  Temes on <em style={{ color: 'var(--wr-red-2)' }}>{partit}</em> té mala premsa.
                </h2>
                <p style={{ fontSize: 13, color: 'var(--bone)', lineHeight: 1.5, maxWidth: 500 }}>
                  Selecciona un tema negatiu i el War Room et proposarà una estratègia de millora amb accions concretes.
                </p>
              </div>
            </div>

            {negatius.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {negatius.map((a, i) => (
                  <div key={i} style={{
                    background: '#080808', border: '1px solid var(--line)', padding: '16px 18px',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 6 }}>{a.titol}</div>
                      {a.resum && <div style={{ fontSize: 12, color: 'var(--fog)', lineHeight: 1.4, marginBottom: 6 }}>{a.resum.slice(0, 200)}</div>}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>
                        {a.font} · {a.data} · score: {a.score?.toFixed(2)}
                      </div>
                    </div>
                    <Link href={`/chat?q=${encodeURIComponent(`Com millorar la reputació d'${partit} sobre: ${a.titol}? Proposa una estratègia concreta amb 3 accions.`)}`} style={{
                      padding: '8px 14px', background: 'var(--wr-red)', color: 'var(--paper)',
                      border: '1px solid var(--wr-red)', fontFamily: 'var(--font-mono)', fontSize: 10,
                      letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      boxShadow: '0 0 16px -4px rgba(255,90,60,.3)',
                    }}>
                      ◼ NETEJAR →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '60px 0', background: '#050505',
                border: '1px solid var(--line)',
              }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--paper)', marginBottom: 10 }}>
                  {negatius.length === 0 && detall ? 'Cap notícia negativa' : 'Carregant...'}
                </div>
                <p style={{ fontSize: 13, color: 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)' }}>
                  ✓ La premsa no parla negativament d&apos;{partit} en els últims 30 dies
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, large }: { text: string; large?: boolean }) {
  return (
    <div style={{
      padding: large ? '60px 0' : '30px 0', textAlign: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)',
      letterSpacing: '.1em', textTransform: 'uppercase',
    }}>
      {text}
    </div>
  );
}
