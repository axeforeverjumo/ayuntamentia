'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/ApiClient';

type Ranking = {
  nombre: string; cargo: string | null; partido: string; municipio: string; comarca: string | null;
  votos_total: number; coincidentes: number; divergencias: number; pct_alineacion: number;
};
type Tendencia = { tema: string; actual: number; previo: number; delta: number; pct_crecimiento: number | null };
type Promesa = {
  tema: string; partido_parlament: string;
  rechazadas: number; aprobadas: number; municipios_contradictores: string[] | null;
};

const TABS = ['Ranking concejals', 'Tendències', 'Promeses incomplertes'] as const;

export default function IntelPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Ranking concejals');
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

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-semibold mb-2">Intel·ligència</h1>
      <p className="text-sm text-[#8b949e] mb-6">
        Rànquing d&apos;alineació, tendències emergents i contradiccions rivals.
      </p>

      <div className="flex gap-4 border-b border-[#30363d] mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={'px-3 py-2 text-sm border-b-2 -mb-px ' +
                    (tab === t ? 'border-[#2563eb] text-white' : 'border-transparent text-[#8b949e]')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ranking concejals' && (
        <>
          <div className="flex gap-3 mb-4">
            <input placeholder="Filtra per partit (ex: AC, PSC)"
                   value={partido} onChange={(e) => setPartido(e.target.value)}
                   className="px-3 py-2 rounded bg-[#161b22] border border-[#30363d] text-sm" />
            <select value={order} onChange={(e) => setOrder(e.target.value as 'divergencia' | 'alineacion')}
                    className="px-3 py-2 rounded bg-[#161b22] border border-[#30363d] text-sm">
              <option value="divergencia">Més divergents primer</option>
              <option value="alineacion">Més alineats primer</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-[#8b949e] uppercase">
              <tr>
                <th className="text-left py-2">Concejal</th>
                <th className="text-left">Partit</th>
                <th className="text-left">Municipi</th>
                <th className="text-right">Vots</th>
                <th className="text-right">Divergents</th>
                <th className="text-right">% Alineació</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={i} className="border-t border-[#21262d]">
                  <td className="py-2">{r.nombre}</td>
                  <td>{r.partido}</td>
                  <td>{r.municipio}</td>
                  <td className="text-right">{r.votos_total}</td>
                  <td className="text-right text-amber-400">{r.divergencias}</td>
                  <td className={'text-right ' + (r.pct_alineacion < 70 ? 'text-red-400' : 'text-green-400')}>
                    {r.pct_alineacion}%
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[#8b949e]">Sense dades suficients encara.</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {tab === 'Tendències' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr>
              <th className="text-left py-2">Tema</th>
              <th className="text-right">Actual 30d</th>
              <th className="text-right">Previ 30d</th>
              <th className="text-right">Δ</th>
              <th className="text-right">% creixement</th>
            </tr>
          </thead>
          <tbody>
            {tend.map((t, i) => (
              <tr key={i} className="border-t border-[#21262d]">
                <td className="py-2">{t.tema}</td>
                <td className="text-right">{t.actual}</td>
                <td className="text-right text-[#8b949e]">{t.previo}</td>
                <td className={'text-right ' + (t.delta > 0 ? 'text-green-400' : 'text-red-400')}>{t.delta > 0 ? '+' : ''}{t.delta}</td>
                <td className="text-right">{t.pct_crecimiento !== null ? `${t.pct_crecimiento}%` : '—'}</td>
              </tr>
            ))}
            {tend.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[#8b949e]">Encara no hi ha prou història per detectar tendències.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === 'Promeses incomplertes' && (
        <div className="space-y-3">
          {prom.map((p, i) => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{p.tema}</p>
                <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300">
                  {p.rechazadas} rebutjades en municipis
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                <strong>{p.partido_parlament}</strong> ho proposa al Parlament
                {p.aprobadas > 0 && ` (aprovat en ${p.aprobadas} municipis) `}
                però rebutjat a: {(p.municipios_contradictores || []).slice(0, 8).join(', ')}
                {(p.municipios_contradictores || []).length > 8 && '…'}
              </p>
            </div>
          ))}
          {prom.length === 0 && <p className="text-[#8b949e] text-sm">Encara no hi ha prou dades del Parlament per detectar contradiccions.</p>}
        </div>
      )}
    </div>
  );
}
