'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/ApiClient';

type Mencion = {
  id: number;
  fuente: string;
  fuente_url: string;
  autor: string;
  texto: string;
  publicado_at: string;
  tema: string | null;
  sentiment: string | null;
  engagement: number;
  municipio: string | null;
};

type Agg = { tema: string; sentiment: string; n: number; engagement: number };

const SENT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  positivo: { label: 'Positiu', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  negativo: { label: 'Negatiu', color: 'text-rose-400', bg: 'bg-rose-500' },
  neutro: { label: 'Neutre', color: 'text-slate-400', bg: 'bg-slate-500' },
};

export default function RecepcionPage() {
  const [menciones, setMenciones] = useState<Mencion[]>([]);
  const [agg, setAgg] = useState<Agg[]>([]);
  const [tema, setTema] = useState('');
  const [dias, setDias] = useState(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ dias: String(dias), limit: '100' });
    if (tema) q.set('tema', tema);
    Promise.all([
      apiClient.get<Mencion[]>(`/api/recepcion/menciones?${q}`).catch(() => []),
      apiClient.get<Agg[]>(`/api/recepcion/agregado?dias=${dias}`).catch(() => []),
    ]).then(([m, a]) => {
      setMenciones(m);
      setAgg(a);
      setLoading(false);
    });
  }, [tema, dias]);

  const temas = useMemo(() => Array.from(new Set(agg.map((a) => a.tema))).sort(), [agg]);

  // Totales globales
  const totals = useMemo(() => {
    const t = { positivo: 0, negativo: 0, neutro: 0, engagement: 0 };
    agg.forEach((a) => {
      if (a.sentiment === 'positivo' || a.sentiment === 'negativo' || a.sentiment === 'neutro') {
        t[a.sentiment] += a.n;
      }
      t.engagement += a.engagement || 0;
    });
    return { ...t, total: t.positivo + t.negativo + t.neutro };
  }, [agg]);

  // Agregado por tema, ordenado por volumen
  const porTema = useMemo(() => {
    const map: Record<string, { positivo: number; negativo: number; neutro: number; engagement: number }> = {};
    agg.forEach((a) => {
      if (!map[a.tema]) map[a.tema] = { positivo: 0, negativo: 0, neutro: 0, engagement: 0 };
      if (a.sentiment === 'positivo' || a.sentiment === 'negativo' || a.sentiment === 'neutro') {
        map[a.tema][a.sentiment] = a.n;
      }
      map[a.tema].engagement += a.engagement || 0;
    });
    return Object.entries(map)
      .map(([t, s]) => ({ tema: t, ...s, total: s.positivo + s.negativo + s.neutro }))
      .sort((a, b) => b.total - a.total);
  }, [agg]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Operacions / Recepció social</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1, margin: 0, letterSpacing: '-.02em', fontWeight: 400, color: 'var(--paper)' }}>
          Eco <em style={{ color: 'var(--wr-amber)' }}>social.</em>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', marginTop: 8 }}>Premsa catalana i xarxes socials · agenda municipal</p>
      </div>
      <div style={{ padding: '20px 26px', maxWidth: 1100 }}>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8b949e] uppercase tracking-wide">Mencions</span>
            <Activity className="w-3.5 h-3.5 text-[#6e7681]" />
          </div>
          <p className="text-2xl font-bold text-[#e6edf3]">{totals.total}</p>
          <p className="text-xs text-[#6e7681]">darrers {dias} dies</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8b949e] uppercase tracking-wide">Sentiment net</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#6e7681]" />
          </div>
          <p className={
            'text-2xl font-bold ' +
            (totals.positivo > totals.negativo ? 'text-emerald-400' :
             totals.negativo > totals.positivo ? 'text-rose-400' : 'text-[#e6edf3]')
          }>
            {totals.positivo - totals.negativo >= 0 ? '+' : ''}{totals.positivo - totals.negativo}
          </p>
          <p className="text-xs text-[#6e7681]">
            {totals.total > 0
              ? `${Math.round((totals.positivo / totals.total) * 100)}% positiu`
              : 'sense dades'}
          </p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <span className="text-xs text-[#8b949e] uppercase tracking-wide">Temes actius</span>
          <p className="text-2xl font-bold text-[#e6edf3] mt-1">{temas.length}</p>
          <p className="text-xs text-[#6e7681]">amb mencions</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8b949e] uppercase tracking-wide">Engagement</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#6e7681]" />
          </div>
          <p className="text-2xl font-bold text-[#e6edf3]">{totals.engagement.toLocaleString('ca')}</p>
          <p className="text-xs text-[#6e7681]">likes + shares</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select value={tema} onChange={(e) => setTema(e.target.value)}
                className="px-3 py-2 rounded bg-[#161b22] border border-[#30363d] text-sm">
          <option value="">Tots els temes</option>
          {temas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-1 p-1 bg-[#161b22] border border-[#30363d] rounded">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={
                'px-3 py-1 rounded text-xs transition ' +
                (dias === d ? 'bg-[#2563eb] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]')
              }
            >
              {d} dies
            </button>
          ))}
        </div>
      </div>

      {/* Grid temas mejorado */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
        Distribució per tema
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : porTema.length === 0 ? (
        <div className="bg-[#161b22] border border-dashed border-[#30363d] rounded-lg p-8 text-center mb-8">
          <AlertCircle className="w-8 h-8 text-[#6e7681] mx-auto mb-2" />
          <p className="text-sm text-[#8b949e]">
            Sense mencions socials en {dias} dies
          </p>
          <p className="text-xs text-[#6e7681] mt-1">
            La ingesta corre cada 15 min. Revisa fonts o amplia la finestra.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {porTema.map((s) => {
            const pctPos = s.total ? (s.positivo / s.total) * 100 : 0;
            const pctNeu = s.total ? (s.neutro / s.total) * 100 : 0;
            const pctNeg = s.total ? (s.negativo / s.total) * 100 : 0;
            return (
              <button
                key={s.tema}
                onClick={() => setTema(tema === s.tema ? '' : s.tema)}
                className={
                  'text-left bg-[#161b22] border rounded-lg p-4 transition hover:bg-[#1c2128] ' +
                  (tema === s.tema ? 'border-[#2563eb]' : 'border-[#30363d] hover:border-[#484f58]')
                }
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-semibold text-[#e6edf3] capitalize">
                    {s.tema.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xl font-bold text-[#e6edf3]">{s.total}</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-[#0d1117] mb-2">
                  <div style={{ width: `${pctPos}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${pctNeu}%` }} className="bg-slate-500" />
                  <div style={{ width: `${pctNeg}%` }} className="bg-rose-500" />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">+{s.positivo} ({Math.round(pctPos)}%)</span>
                  <span className="text-slate-400">{s.neutro}</span>
                  <span className="text-rose-400 font-medium">−{s.negativo} ({Math.round(pctNeg)}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
        Mencions recents {tema && `— ${tema}`}
      </h2>
      <div className="space-y-2">
        {menciones.map((m) => {
          const sent = SENT_LABEL[m.sentiment ?? 'neutro'] ?? SENT_LABEL.neutro;
          return (
            <a key={m.id} href={m.fuente_url} target="_blank" rel="noreferrer"
               className="block bg-[#161b22] border border-[#30363d] rounded-lg p-3 hover:border-[#2563eb] transition group">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={'inline-block w-1.5 h-1.5 rounded-full ' + sent.bg} />
                  <span className="text-xs font-medium text-[#e6edf3] truncate">{m.fuente}</span>
                  <span className="text-xs text-[#6e7681] truncate">· {m.autor}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6e7681] flex-shrink-0">
                  {m.tema && (
                    <span className="px-2 py-0.5 rounded bg-[#1c2128] border border-[#30363d] capitalize">
                      {m.tema.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span>{m.publicado_at.slice(0, 10)}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <p className="text-sm text-[#e6edf3] leading-relaxed">
                {m.texto.replace(/<[^>]+>/g, '').slice(0, 280)}
                {m.texto.length > 280 && '…'}
              </p>
            </a>
          );
        })}
        {!loading && menciones.length === 0 && (
          <div className="bg-[#161b22] border border-dashed border-[#30363d] rounded-lg p-8 text-center">
            <p className="text-sm text-[#8b949e]">Sense mencions encara en aquest filtre.</p>
            <p className="text-xs text-[#6e7681] mt-1">La ingesta corre cada 15 min.</p>
          </div>
        )}
      </div>
    </div>
  );
}
