'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/ApiClient';
import { PageHeader } from '@/components/warroom/PageHeader';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { Gauge } from '@/components/landing/primitives';
import { traduirTema } from '@/lib/temesCatala';

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
    apiClient.get<Ranking[]>(`/api/intel/ranking-concejales?${q}`).then(setRanking).catch(() => {});
    apiClient.get<Tendencia[]>('/api/intel/tendencias').then(setTend).catch(() => {});
    apiClient.get<Promesa[]>('/api/intel/promesas-incumplidas').then(setProm).catch(() => {});
  }, [partido, order]);

  const maxTend = tend.length > 0 ? Math.max(...tend.map(t => t.actual)) : 1;
  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Intel·ligència"
        title={<>Intel·ligència <em style={{ color: 'var(--wr-amber)', fontWeight: 400 }}>estratègica.</em></>}
        actions={<StatusLine color="var(--wr-phosphor)">947 municipis · anàlisi continu</StatusLine>}
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
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }}>

        {tab === 'ranking' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input placeholder="Filtra per partit (ex: AC, PSC)"
                value={partido} onChange={(e) => setPartido(e.target.value)}
                style={{
                  padding: '8px 14px', background: '#050505', border: '1px solid var(--line)',
                  color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none',
                  width: 260,
                }}
              />
              <select value={order} onChange={(e) => setOrder(e.target.value as 'divergencia' | 'alineacion')}
                style={{
                  padding: '8px 14px', background: '#050505', border: '1px solid var(--line)',
                  color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12,
                }}>
                <option value="divergencia">Més divergents primer</option>
                <option value="alineacion">Més alineats primer</option>
              </select>
            </div>

            <div style={{ border: '1px solid var(--line)', background: '#050505' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 120px 70px 80px 100px',
                padding: '10px 14px', borderBottom: '1px solid var(--line)',
                fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
                letterSpacing: '.14em', textTransform: 'uppercase',
              }}>
                <span>Regidor</span><span>Partit</span><span>Municipi</span>
                <span style={{ textAlign: 'right' }}>Vots</span>
                <span style={{ textAlign: 'right' }}>Diverg.</span>
                <span style={{ textAlign: 'right' }}>% Alineació</span>
              </div>
              {ranking.map((r, i) => {
                const danger = r.pct_alineacion < 70;
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 120px 70px 80px 100px',
                    padding: '10px 14px', borderBottom: '1px dashed var(--line-soft)',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--paper)', fontWeight: 500 }}>{r.nombre}</span>
                    <StatusBadge tone="bone">{r.partido}</StatusBadge>
                    <span style={{ color: 'var(--fog)', fontSize: 12 }}>{r.municipio}</span>
                    <span style={{ textAlign: 'right', color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.votos_total}</span>
                    <span style={{ textAlign: 'right', color: 'var(--wr-amber)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{r.divergencias}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                        color: danger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
                      }}>
                        {r.pct_alineacion}%
                      </span>
                      <div style={{ height: 3, background: 'var(--line)', marginTop: 4, marginLeft: 'auto', width: 60 }}>
                        <div style={{
                          height: '100%', width: `${r.pct_alineacion}%`,
                          background: danger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
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
        )}

        {tab === 'tendencies' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PanelBox title="Temes en creixement" subtitle="30 dies" tone="amber">
              {tend.filter(t => t.delta > 0).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tend.filter(t => t.delta > 0).slice(0, 10).map((t, i) => (
                    <TrendingBar key={i} label={traduirTema(t.tema)} value={t.actual} max={maxTend} tone={i < 3 ? 'red' : 'amber'} />
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>
                  Encara no hi ha prou història
                </div>
              )}
            </PanelBox>

            <PanelBox title="Temes en descens" subtitle="30 dies" tone="phos">
              {tend.filter(t => t.delta < 0).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tend.filter(t => t.delta < 0).slice(0, 10).map((t, i) => (
                    <TrendingBar key={i} label={traduirTema(t.tema)} value={t.actual} max={maxTend} tone="phos" />
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>
                  Cap tema en descens detectat
                </div>
              )}
            </PanelBox>

            <div style={{ gridColumn: '1 / -1' }}>
              <PanelBox title="Evolució completa" subtitle={`${tend.length} temes`} tone="amber">
                <div style={{ border: '1px solid var(--line)', background: '#050505' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px',
                    padding: '10px 14px', borderBottom: '1px solid var(--line)',
                    fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
                    letterSpacing: '.14em', textTransform: 'uppercase',
                  }}>
                    <span>Tema</span><span style={{ textAlign: 'right' }}>Actual</span>
                    <span style={{ textAlign: 'right' }}>Previ</span>
                    <span style={{ textAlign: 'right' }}>Δ</span>
                    <span style={{ textAlign: 'right' }}>% Creixement</span>
                  </div>
                  {tend.map((t, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px',
                      padding: '8px 14px', borderBottom: '1px dashed var(--line-soft)', fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--paper)' }}>{traduirTema(t.tema)}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>{t.actual}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fog)' }}>{t.previo}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.delta > 0 ? 'var(--wr-phosphor)' : 'var(--wr-red-2)' }}>
                        {t.delta > 0 ? '+' : ''}{t.delta}
                      </span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--bone)' }}>
                        {t.pct_crecimiento !== null ? `${t.pct_crecimiento}%` : '—'}
                      </span>
                    </div>
                  ))}
                  {tend.length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>
                      Encara no hi ha prou història per detectar tendències
                    </div>
                  )}
                </div>
              </PanelBox>
            </div>
          </div>
        )}

        {tab === 'competencia' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 12 }}>
              Properament
            </div>
            <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Vigilància de rivals: votacions per municipi, contradiccions entre discurs nacional i acció municipal, arguments usats.
            </p>
            <StatusBadge tone="amber">◼ EN DESENVOLUPAMENT</StatusBadge>
          </div>
        )}

        {tab === 'promeses' && (
          <div>
            {prom.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {prom.map((p, i) => (
                  <div key={i} style={{ background: '#080808', border: '1px solid var(--line)', padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--paper)' }}>{p.tema}</span>
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
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--paper)', marginBottom: 10 }}>
                  Sense dades del Parlament
                </div>
                <p style={{ fontSize: 13, color: 'var(--fog)', maxWidth: 400, margin: '0 auto' }}>
                  Quan es processin sessions parlamentàries, les contradiccions apareixeran aquí.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
