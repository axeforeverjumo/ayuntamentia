'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { Gauge } from '@/components/landing/primitives';
import { conversaPath } from '@/lib/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const PARTITS = ['AC', 'JxCat', 'ERC', 'PSC', 'PP', 'CUP', 'VOX', 'Comuns'];

const PARTIT_COLORS: Record<string, string> = {
  AC: '#0F4C81', JxCat: '#00b2a9', ERC: '#f8b400', PSC: '#e30613',
  PP: '#1d71b8', CUP: '#ffd700', VOX: '#63be21', Comuns: '#6a2c70', Cs: '#eb6109',
};

function SentimentDot({ sentiment }: { sentiment: string }) {
  const color = sentiment === 'positiu' ? '#1A7A4A' : sentiment === 'negatiu' ? '#C0392B' : 'var(--fog)';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: color, boxShadow: sentiment !== 'neutre' ? `0 0 6px ${color}` : 'none' }} />;
}

function SentimentMeter({ positius, negatius, neutres }: { positius: number; negatius: number; neutres: number }) {
  const total = positius + negatius + neutres || 1;
  const pPos = (positius / total) * 100;
  const pNeg = (negatius / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', height: 10, border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pPos}%`, background: '#1A7A4A', transition: 'width .8s' }} />
        <div style={{ flex: 1, background: 'var(--ink-3)' }} />
        <div style={{ width: `${pNeg}%`, background: '#C0392B', transition: 'width .8s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        <span style={{ color: '#1A7A4A' }}>+ {positius} positius</span>
        <span style={{ color: 'var(--fog)' }}>{neutres} neutres</span>
        <span style={{ color: '#C0392B' }}>− {negatius} negatius</span>
      </div>
    </div>
  );
}

function ArticleCard({ article, partit, compact }: { article: any; partit?: string; compact?: boolean }) {
  const sentColor = article.sentiment === 'positiu' ? '#1A7A4A' : article.sentiment === 'negatiu' ? '#C0392B' : 'var(--fog)';
  const sentBg = article.sentiment === 'positiu' ? 'rgba(26,122,74,.04)' : article.sentiment === 'negatiu' ? 'rgba(192,57,43,.04)' : 'transparent';
  return (
    <div style={{
      background: sentBg, borderLeft: `3px solid ${sentColor}`,
      padding: compact ? '10px 14px' : '14px 18px', marginBottom: 6,
      border: `1px solid var(--line)`, borderLeftWidth: 3, borderLeftColor: sentColor,
      borderRadius: 'var(--r-lg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compact ? 12 : 14, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 4 }}>
            {article.titol}
          </div>
          {!compact && article.resum && (
            <div style={{ fontSize: 11, color: 'var(--fog)', lineHeight: 1.4, marginBottom: 6, maxHeight: 40, overflow: 'hidden' }}>
              {article.resum.replace(/<[^>]*>/g, '').slice(0, 160)}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>
            <SentimentDot sentiment={article.sentiment} />
            <span style={{ color: sentColor, fontWeight: 700 }}>{article.sentiment?.toUpperCase()}</span>
            <span>·</span>
            <span>{article.font}</span>
            <span>·</span>
            <span>{article.data}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '4px 8px', background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 9,
              textDecoration: 'none', textAlign: 'center',
            }}>Llegir →</a>
          )}
          {partit && (
            <Link href={conversaPath({ mode: 'monitor', q: buildAnalitzaPrompt(partit, article) })} style={{
              padding: '4px 8px', background: 'rgba(212,58,31,.08)', border: '1px solid rgba(212,58,31,.3)',
              color: 'var(--wr-red-2)', fontFamily: 'var(--font-mono)', fontSize: 9,
              textDecoration: 'none', textAlign: 'center',
            }}>Analitzar</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function cleanResum(html?: string) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
}

function buildAnalitzaPrompt(partit: string, a: any) {
  const resum = cleanResum(a.resum);
  return [
    `Analitza aquesta notícia sobre ${partit}:`,
    ``,
    `TITULAR: "${a.titol}"`,
    a.font ? `FONT: ${a.font}` : '',
    a.data ? `DATA: ${a.data}` : '',
    a.sentiment ? `SENTIMENT DETECTAT: ${a.sentiment}` : '',
    resum ? `RESUM: ${resum}` : '',
    a.url ? `URL: ${a.url}` : '',
    ``,
    `Dona'm:`,
    `1) Context i enquadrament polític (per què surt ara).`,
    `2) Impacte real sobre ${partit} i electorat objectiu.`,
    `3) Riscos i oportunitats immediates (72h).`,
    `4) Resposta recomanada: to, portaveu, canals.`,
  ].filter(Boolean).join('\n');
}

function buildNetejaPrompt(partit: string, a: any) {
  const resum = cleanResum(a.resum);
  return [
    `MISSIÓ: Neteja reputacional. La premsa parla negativament de ${partit}.`,
    ``,
    `TITULAR: "${a.titol}"`,
    a.font ? `FONT: ${a.font}` : '',
    a.data ? `DATA: ${a.data}` : '',
    typeof a.score === 'number' ? `SCORE NEGATIVITAT: ${a.score.toFixed(2)}` : '',
    resum ? `RESUM: ${resum}` : '',
    a.url ? `URL: ${a.url}` : '',
    ``,
    `Entrega un pla operatiu complet en català:`,
    `1) DIAGNÒSTIC (2–3 línies): quin frame fa mal i per què.`,
    `2) NARRATIVA ALTERNATIVA: 3 enfocaments que desplacen el focus sense negar fets.`,
    `3) MISSATGES CLAU (×3): frases curtes llestes per portaveu.`,
    `4) XARXES: 1 tweet (≤260c), 1 post Instagram, 1 guió TikTok 20s.`,
    `5) ACCIONS 72h: pas a pas amb responsables suggerits (portaveu, alcaldia, grup municipal).`,
    `6) SEGUIMENT: indicadors per saber si la neteja funciona (mencions, sentiment, cobertura).`,
    `7) RISCOS: què NO s'ha de dir i per què.`,
  ].filter(Boolean).join('\n');
}

export default function ReputacioPage() {
  const [stats, setStats] = useState<any>(null);
  const [partit, setPartit] = useState('AC');
  const [detall, setDetall] = useState<any>(null);
  const [negatius, setNegatius] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'detall' | 'neteja'>('overview');
  const [sentimentFilter, setSentimentFilter] = useState<'tots' | 'positiu' | 'neutre' | 'negatiu'>('tots');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const refreshInFlightRef = useRef(false);

  const loadStats = () =>
    fetch(`${API}/api/reputacio/stats?dies=30`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setStats(data);
        return data;
      })
      .catch(() => null);

  const loadDetall = (selectedPartit: string) =>
    Promise.all([
      fetch(`${API}/api/reputacio/sentiment-partit?partit=${selectedPartit}&dies=30`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/api/reputacio/temes-negatius?partit=${selectedPartit}&dies=30`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([detallData, negatiusData]) => {
      setDetall(detallData);
      setNegatius(negatiusData?.articles || []);
      return { detallData, negatiusData };
    });

  const loadDiagnostic = (selectedPartit: string) =>
    fetch(`${API}/api/reputacio/diagnostic?partit=${selectedPartit}&dies=30`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setDiagnostic(data);
        return data;
      })
      .catch(() => null);

  const refreshAll = async (selectedPartit: string) => {
    if (refreshInFlightRef.current) {
      return null;
    }
    refreshInFlightRef.current = true;
    try {
      const [statsData, detailBundle, diagnosticData] = await Promise.all([
        loadStats(),
        loadDetall(selectedPartit),
        loadDiagnostic(selectedPartit),
      ]);
      return {
        statsData,
        detallData: detailBundle.detallData,
        negatiusData: detailBundle.negatiusData,
        diagnosticData,
      };
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    refreshAll(partit);
  }, []);

  useEffect(() => {
    refreshAll(partit);
  }, [partit]);

  useEffect(() => {
    const handleFocus = () => {
      refreshAll(partit);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAll(partit);
      }
    };

    const interval = window.setInterval(() => {
      refreshAll(partit);
    }, 30000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [partit]);

  const withinWindow = (dateText?: string | null, days: number = 30) => {
    if (!dateText) return false;
    const normalizedDate = String(dateText).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return false;
    const parsed = new Date(`${normalizedDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return false;

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const cutoff = new Date(todayUtc);
    cutoff.setUTCDate(cutoff.getUTCDate() - days);

    return parsed >= cutoff && parsed <= todayUtc;
  };

  const filteredArticles = useMemo(() => {
    const articles = (detall?.articles || []).filter((article: any) => withinWindow(article?.data, 30));
    return articles;
  }, [detall]);

  const filteredNegatius = useMemo(() => {
    return (negatius || []).filter((article: any) => withinWindow(article?.data, 30));
  }, [negatius]);

  const latestVisibleArticleDate = useMemo(() => {
    const candidates = [
      ...filteredArticles.map((article: any) => article?.data).filter(Boolean),
      ...filteredNegatius.map((article: any) => article?.data).filter(Boolean),
    ] as string[];
    if (!candidates.length) return null;
    return candidates.sort().at(-1) || null;
  }, [filteredArticles, filteredNegatius]);

  const articleAgeLabel = useMemo(() => {
    if (!latestVisibleArticleDate) return null;
    const latest = new Date(`${latestVisibleArticleDate}T00:00:00`);
    if (Number.isNaN(latest.getTime())) return null;
    const diffMs = Date.now() - latest.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'actualitzat avui';
    return `última notícia visible fa ${diffDays} dies`;
  }, [latestVisibleArticleDate]);

  const handleSync = async () => {
    setIsSyncing(true);
    setDiagnosticError(null);
    try {
      const response = await fetch(`${API}/api/reputacio/ingest`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`sync_failed_${response.status}`);
      }
      await refreshAll(partit);
      setLastSyncAt(new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setDiagnosticError('No s\'ha pogut refrescar la reputació ara mateix.');
    } finally {
      setIsSyncing(false);
    }
  };

  const TABS = [
    { id: 'overview' as const, label: 'Panorama general', color: 'var(--wr-phosphor)' },
    { id: 'detall' as const, label: 'Detall partits', color: 'var(--wr-amber)' },
    { id: 'neteja' as const, label: 'Neteja reputació', color: 'var(--wr-red-2)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Reputació"
        title={<>Reputació i <span style={{ color: 'var(--brand-l)', fontWeight: 400, fontStyle: 'italic' }}>premsa.</span></>}
        info={{
          title: 'Reputació i premsa',
          description: "Monitoratge de 9 diaris catalans en temps real. Veu què diu la premsa de cada partit, detecta articles negatius i proposa estratègies de millora amb la Sala d'Intel·ligència. La funció 'Neteja' és l'arma secreta: selecciona un article negatiu i la IA et proposa 3 accions concretes.",
          dataSource: 'Vilaweb, ARA, NacióDigital, El Punt Avui, ACN, Betevé, La Vanguardia, El Periódico, Catalunya Press · actualització cada 30 min',
          tips: [
            "Clica un partit a les barres de mencions per veure'n el detall",
            "Al tab 'Neteja', el botó 'Netejar' obre la Sala d'Intel·ligència amb una estratègia de millora automàtica",
            "Fes sync manual amb el botó 'Sync ara' per obtenir els últims articles",
          ],
        }}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatusLine color="var(--wr-phosphor)">
              {stats?.total_articles || 0} articles · 30d
            </StatusLine>
            {latestVisibleArticleDate && (
              <StatusLine color="var(--wr-amber)">
                Última visible: {latestVisibleArticleDate}{articleAgeLabel ? ` · ${articleAgeLabel}` : ''}
              </StatusLine>
            )}
            {lastSyncAt && (
              <StatusLine color="var(--fog)">
                Refrescat a les {lastSyncAt}
              </StatusLine>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                padding: '6px 12px', background: 'transparent', border: '1px solid var(--line)',
                color: isSyncing ? 'var(--fog)' : 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '.08em', textTransform: 'uppercase', cursor: isSyncing ? 'wait' : 'pointer',
                opacity: isSyncing ? 0.7 : 1,
              }}
            >{isSyncing ? '▸ Syncant…' : '▸ Sync ara'}</button>
          </div>
        }
      />

      {diagnosticError && (
        <div style={{ padding: '12px 26px 0' }}>
          <div style={{
            padding: '10px 12px', border: '1px solid rgba(212,58,31,.35)', background: 'rgba(212,58,31,.08)',
            color: 'var(--wr-red-2)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            {diagnosticError}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 16px', background: tab === t.id ? 'var(--ink-3)' : 'transparent',
            border: 'none', borderBottom: tab === t.id ? `2px solid var(--brand-l)` : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t.id ? 'var(--paper)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Partit selector — only in detall/neteja tabs */}
      {tab !== 'overview' && (
        <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PARTITS.map(p => (
            <button key={p} onClick={() => setPartit(p)} style={{
              padding: '6px 14px', background: partit === p ? PARTIT_COLORS[p] || 'var(--paper)' : 'transparent',
              color: partit === p ? '#fff' : 'var(--bone)',
              border: `1px solid ${partit === p ? PARTIT_COLORS[p] || 'var(--paper)' : 'var(--line)'}`,
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em',
              textTransform: 'uppercase', cursor: 'pointer', fontWeight: partit === p ? 700 : 400,
            }}>{p}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '20px 26px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && stats && (
          <div>
            <KPIGrid>
              <KPICard label="Total articles" value={stats.total_articles} tone="default" sublabel="últims 30 dies" />
              <KPICard label="Positius" value={stats.positius} tone="phos" sublabel={`${stats.total_articles > 0 ? Math.round(stats.positius / stats.total_articles * 100) : 0}% del total`} />
              <KPICard label="Negatius" value={stats.negatius} tone="red" sublabel={`${stats.total_articles > 0 ? Math.round(stats.negatius / stats.total_articles * 100) : 0}% del total`} />
              <KPICard label="Neutres" value={stats.neutres} tone="default" sublabel="sense càrrega política" />
            </KPIGrid>

            {/* Sentiment meter global */}
            <div style={{ marginTop: 16, padding: '18px 20px', background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                Balanç de sentiment global · 30 dies
              </div>
              <SentimentMeter positius={stats.positius} negatius={stats.negatius} neutres={stats.neutres} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginTop: 16 }}>
              {/* Mencions per partit */}
              <PanelBox title="Mencions per partit" subtitle="30 dies" tone="amber">
                {stats.per_partit?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stats.per_partit.map((p: any, i: number) => {
                      const color = PARTIT_COLORS[p.partit] || 'var(--bone)';
                      return (
                        <div key={i} style={{ cursor: 'pointer' }} onClick={() => { setPartit(p.partit); setTab('detall'); }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 10, height: 10, background: color, display: 'inline-block', flexShrink: 0 }} />
                              {p.partit}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>{p.mencions}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--line)' }}>
                            <div style={{ height: '100%', width: `${(p.mencions / (stats.per_partit[0]?.mencions || 1)) * 100}%`, background: color, transition: 'width .8s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState text="Esperant dades de premsa..." />
                )}
              </PanelBox>

              {/* Fonts */}
              <PanelBox title="Fonts actives" subtitle={`${stats.per_font?.length || 0} diaris`} tone="phos">
                {stats.per_font?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stats.per_font.map((f: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: '1px dashed var(--line-soft)',
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--paper)' }}>{f.font}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--wr-phosphor)' }}>{f.articles}</span>
                          <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: 5, background: 'var(--wr-phosphor)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Cap font activa" />
                )}
              </PanelBox>
            </div>

            {diagnostic && (
              <div style={{ marginTop: 16, padding: '18px 20px', background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Diagnòstic automàtic del feed
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fog)', marginBottom: 4 }}>Última data a BD</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--paper)' }}>{diagnostic.db?.max_data_publicacio || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fog)', marginBottom: 4 }}>Articles fora de finestra</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: diagnostic.db?.old_articles_outside_window ? 'var(--wr-amber)' : 'var(--wr-phosphor)' }}>{diagnostic.db?.old_articles_outside_window ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fog)', marginBottom: 4 }}>Refresc client</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--paper)' }}>cada {diagnostic.scheduler?.client_auto_refresh_seconds || 30}s</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(diagnostic.feeds || []).slice(0, 9).map((feed: any) => {
                    const broken = !feed.entries || (typeof feed.status === 'number' && feed.status >= 400) || feed.status === 'error';
                    return (
                      <div key={feed.font} style={{ display: 'grid', gridTemplateColumns: '180px 80px 80px 1fr', gap: 10, fontSize: 11, borderTop: '1px dashed var(--line-soft)', paddingTop: 6 }}>
                        <span style={{ color: 'var(--paper)' }}>{feed.font}</span>
                        <span style={{ color: broken ? 'var(--wr-red-2)' : 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)' }}>{feed.status ?? '—'}</span>
                        <span style={{ color: 'var(--fog)', fontFamily: 'var(--font-mono)' }}>{feed.entries} entr.</span>
                        <span style={{ color: 'var(--fog)' }}>{feed.latest_published || feed.error || 'Sense dades'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DETALL PER PARTIT ── */}
        {tab === 'detall' && (
          <div>
            {detall ? (
              <>
                {/* Sentiment summary */}
                <div style={{ marginBottom: 16, padding: '20px', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', position: 'relative' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 36, fontWeight: 700, color: PARTIT_COLORS[partit] || 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
                        {partit}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                        Anàlisi de sentiment · 30 dies
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Gauge label="Premsa positiva" value={detall.positius + detall.negatius > 0 ? Math.round(detall.positius / (detall.positius + detall.negatius + detall.neutres) * 100) : 0} tone="phos" />
                        <Gauge label="Premsa negativa" value={detall.positius + detall.negatius > 0 ? Math.round(detall.negatius / (detall.positius + detall.negatius + detall.neutres) * 100) : 0} tone="red" />
                      </div>
                    </div>
                    <div>
                      <SentimentMeter positius={detall.positius} negatius={detall.negatius} neutres={detall.neutres} />
                      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
                        {[
                          { label: 'Positius', value: detall.positius, color: '#1A7A4A' },
                          { label: 'Neutres', value: detall.neutres, color: 'var(--fog)' },
                          { label: 'Negatius', value: detall.negatius, color: '#C0392B' },
                        ].map((k, i) => (
                          <div key={i} style={{ background: 'var(--bg-elevated)', padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 600, color: k.color, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Articles */}
                <PanelBox title={`Últims articles · ${partit}`} subtitle={`${filteredArticles.length || 0} recents`} tone="amber">
                  {detall.articles?.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {(['tots', 'positiu', 'neutre', 'negatiu'] as const).map(s => {
                          const active = sentimentFilter === s;
                          const color = s === 'positiu' ? '#1A7A4A' : s === 'negatiu' ? '#C0392B' : s === 'neutre' ? 'var(--fog)' : 'var(--bone)';
                          return (
                            <button key={s} onClick={() => setSentimentFilter(s)} style={{
                              padding: '4px 12px', borderRadius: 'var(--r-full)',
                              background: active ? color : 'transparent',
                              border: `1px solid ${active ? color : 'var(--line)'}`,
                              color: active ? '#fff' : color,
                              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', textTransform: 'capitalize',
                            }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                      {filteredArticles
                        .filter((a: any) => sentimentFilter === 'tots' || a.sentiment === sentimentFilter)
                        .map((a: any, i: number) => (
                          <ArticleCard key={i} article={a} partit={partit} />
                        ))}
                    </div>
                  ) : (
                    <EmptyState text={`Cap article trobat per ${partit} en 30 dies`} />
                  )}
                </PanelBox>
              </>
            ) : (
              <EmptyState text="Carregant..." large />
            )}
          </div>
        )}

        {/* ── NETEJA REPUTACIÓ ── */}
        {tab === 'neteja' && (
          <div>
            {/* Hero */}
            <div style={{
              background: 'var(--bg-surface)', border: '.5px solid var(--border)', padding: '28px 24px',
              borderRadius: 'var(--r-lg)', marginBottom: 16,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
                <div>
                  <StatusBadge tone="red">◼ NETEJA DE REPUTACIÓ · INTEL·LIGÈNCIA ACTIVA</StatusBadge>
                  <h2 style={{
                    fontFamily: 'var(--font-sans)', fontSize: 26, margin: '14px 0 10px',
                    lineHeight: 1.1, color: 'var(--text-primary)', fontWeight: 500,
                  }}>
                    On tenen <span style={{ color: 'var(--brand-l)', fontStyle: 'italic' }}>mala premsa?</span>
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--bone)', lineHeight: 1.5, maxWidth: 500, margin: 0 }}>
                    Articles amb sentiment negatiu sobre <strong style={{ color: 'var(--paper)' }}>{partit}</strong>. Clica &quot;Netejar&quot; per obrir la Sala d'Intel·ligència amb una estratègia de millora automàtica — accions concretes, narratives alternatives i seguiment.
                  </p>
                </div>
                <div style={{
                  width: 100, height: 100, border: '.5px solid var(--border)',
                  display: 'grid', placeItems: 'center', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--r-lg)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 36, fontWeight: 700, color: '#C0392B', lineHeight: 1 }}>
                      {filteredNegatius.length}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>negatius</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Articles negatius */}
            {filteredNegatius.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredNegatius.map((a, i) => (
                  <div key={i} style={{
                    background: 'rgba(212,58,31,.03)', border: '1px solid rgba(212,58,31,.2)',
                    borderLeft: '3px solid var(--wr-red-2)', padding: '16px 20px',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start',
                  }}>
                    <div>
                      <div style={{ fontSize: 15, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 6, fontWeight: 500 }}>{a.titol}</div>
                      {a.resum && <div style={{ fontSize: 12, color: 'var(--fog)', lineHeight: 1.4, marginBottom: 8 }}>{a.resum.replace(/<[^>]*>/g, '').slice(0, 200)}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>
                        <SentimentDot sentiment="negatiu" />
                        <span style={{ color: 'var(--wr-red-2)' }}>NEGATIU</span>
                        <span>·</span>
                        <span>{a.font}</span>
                        <span>·</span>
                        <span>{a.data}</span>
                        <span>·</span>
                        <span>score: {a.score?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
                          padding: '6px 12px', background: 'transparent', border: '1px solid var(--line)',
                          color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
                          textDecoration: 'none', textAlign: 'center',
                        }}>Llegir →</a>
                      )}
                      <Link href={conversaPath({ mode: 'netejar', q: buildNetejaPrompt(partit, a) })} style={{
                        padding: '6px 12px', background: 'var(--brand)', color: '#E8F1F9',
                        border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: 10,
                        letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700,
                        textDecoration: 'none', textAlign: 'center',
                        boxShadow: '0 0 12px -3px rgba(15,76,129,.3)',
                      }}>◼ Netejar</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '60px 0', background: 'var(--ink-2)', border: '1px solid var(--line)',
              }}>
                <div className="pulse-dot" style={{ width: 10, height: 10, borderRadius: 10, background: 'var(--wr-phosphor)', margin: '0 auto 14px' }} />
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Cap notícia negativa
                </div>
                <p style={{ fontSize: 13, color: 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)', letterSpacing: '.06em' }}>
                  ✓ {partit} no té premsa negativa detectada en els últims 30 dies
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty overview */}
        {tab === 'overview' && !stats && <EmptyState text="Carregant estadístiques..." large />}
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
      <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 8, background: 'var(--wr-phosphor)', margin: '0 auto 10px' }} />
      {text}
    </div>
  );
}
