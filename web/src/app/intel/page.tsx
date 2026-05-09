'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { Gauge } from '@/components/landing/primitives';
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
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minVisibleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loaderShownAtRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
    if (minVisibleTimerRef.current) clearTimeout(minVisibleTimerRef.current);

    loaderTimerRef.current = setTimeout(() => {
      if (!isMounted) return;
      setShowLoader(true);
      loaderShownAtRef.current = Date.now();
    }, 250);

    const q = new URLSearchParams({ order, limit: '50' });
    if (partido) q.set('partido', partido);

    Promise.allSettled([
      fetch(`${API}/api/intel/ranking-concejales?${q}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          if (!isMounted) return;
          setRanking(Array.isArray(d) ? d : []);
        }),
      fetch(`${API}/api/intel/tendencias`)
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          if (!isMounted) return;
          setTend(Array.isArray(d) ? d : []);
        }),
      fetch(`${API}/api/intel/promesas-incumplidas`)
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          if (!isMounted) return;
          setProm(Array.isArray(d) ? d : []);
        }),
    ]).finally(() => {
      if (!isMounted) return;

      setIsLoading(false);

      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
        loaderTimerRef.current = null;
      }

      if (!showLoader) return;

      const shownAt = loaderShownAtRef.current;
      const elapsed = shownAt ? Date.now() - shownAt : 0;
      const minVisibleMs = 700;
      const remaining = Math.max(0, minVisibleMs - elapsed);

      if (remaining === 0) {
        setShowLoader(false);
        loaderShownAtRef.current = null;
      } else {
        minVisibleTimerRef.current = setTimeout(() => {
          if (!isMounted) return;
          setShowLoader(false);
          loaderShownAtRef.current = null;
        }, remaining);
      }
    });

    return () => {
      isMounted = false;
      if (loaderTimerRef.current) clearTimeout(loaderTimerRef.current);
      if (minVisibleTimerRef.current) clearTimeout(minVisibleTimerRef.current);
    };
  }, [partido, order, showLoader]);

  const maxTend = tend.length > 0 ? Math.max(...tend.map(t => t.actual)) : 1;

  // Derived stats for ranking tab
  const dangerCount = ranking.filter(r => r.pct_alineacion < 70).length;
  const avgAlineacion = ranking.length > 0
    ? Math.round(ranking.reduce((s, r) => s + r.pct_alineacion, 0) / ranking.length)
    : 0;
  const top5Divergents = [...ranking].sort((a, b) => a.pct_alineacion - b.pct_alineacion).slice(0, 5);

  // Derived stats for competencia tab (exclude AC)
  const partitStats = ranking.reduce((acc: Record<string, { total: number; divergents: number; sumAlin: number; sumVotos: number }>, r) => {
    if (r.partido === 'AC' || r.partido.includes('ALIAN')) return acc;
    if (!acc[r.partido]) acc[r.partido] = { total: 0, divergents: 0, sumAlin: 0, sumVotos: 0 };
    acc[r.partido].total++;
    if (r.pct_alineacion < 70) acc[r.partido].divergents++;
    acc[r.partido].sumAlin += r.pct_alineacion;
    acc[r.partido].sumVotos += r.votos_total;
    return acc;
  }, {});

  const partitList = Object.entries(partitStats)
    .map(([name, s]) => ({
      name,
      total: s.total,
      divergents: s.divergents,
      avgAlin: Math.round(s.sumAlin / s.total),
      vulnerabilitat: Math.round((s.divergents / s.total) * 100),
      senseDades: s.divergents === 0 && s.sumVotos === 0,
    }))
    .sort((a, b) => b.vulnerabilitat - a.vulnerabilitat)
    .slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Intel·ligència"
        title={<>Intel·ligència <span style={{ color: 'var(--brand-l)', fontWeight: 400, fontStyle: 'italic' }}>estratègica.</span></>}
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

      {showLoader && (
        <div
          role="status"
          aria-live="polite"
          aria-busy={isLoading}
          aria-label="Carregant intel·ligència estratègica"
          style={{
          margin: '12px 26px 0',
          padding: '16px 18px',
          border: '1px solid var(--line)',
          background: 'linear-gradient(90deg, rgba(255,255,255,.02), rgba(255,255,255,.06), rgba(255,255,255,.02))',
          backgroundSize: '200% 100%',
          animation: 'intelPulseLoad 1.4s ease-in-out infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--brand-l)',
              boxShadow: '0 0 0 0 rgba(95,169,235,.6)',
              animation: 'intelPulseDot 1.1s ease-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--paper)',
            }}>
              Carregant intel·ligència estratègica…
            </span>
          </div>
          <StatusBadge tone="phos">PROCESSANT DADES</StatusBadge>
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
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }}>
...SNIP...
      </div>
      <style jsx global>{`
        @keyframes intelPulseLoad {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes intelPulseDot {
          0% { box-shadow: 0 0 0 0 rgba(95,169,235,.55); opacity: .95; }
          70% { box-shadow: 0 0 0 8px rgba(95,169,235,0); opacity: .7; }
          100% { box-shadow: 0 0 0 0 rgba(95,169,235,0); opacity: .95; }
        }
      `}</style>
    </div>
  );
}
