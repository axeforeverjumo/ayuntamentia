'use client';

import { useEffect, useState } from 'react';
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

const SENTIMENT_COLOR: Record<string, string> = {
  positivo: 'text-green-400',
  negativo: 'text-red-400',
  neutro: 'text-[#8b949e]',
};

export default function RecepcionPage() {
  const [menciones, setMenciones] = useState<Mencion[]>([]);
  const [agg, setAgg] = useState<Agg[]>([]);
  const [tema, setTema] = useState('');
  const [dias, setDias] = useState(14);

  useEffect(() => {
    const q = new URLSearchParams({ dias: String(dias), limit: '100' });
    if (tema) q.set('tema', tema);
    apiClient.get<Mencion[]>(`/api/recepcion/menciones?${q}`).then(setMenciones).catch(() => {});
    apiClient.get<Agg[]>(`/api/recepcion/agregado?dias=${dias}`).then(setAgg).catch(() => {});
  }, [tema, dias]);

  const temas = Array.from(new Set(agg.map((a) => a.tema))).sort();

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-semibold mb-2">Recepció social</h1>
      <p className="text-sm text-[#8b949e] mb-6">Eco a premsa catalana i Bluesky dels temes de l&apos;agenda.</p>

      <div className="flex gap-3 mb-6">
        <select value={tema} onChange={(e) => setTema(e.target.value)}
                className="px-3 py-2 rounded bg-[#161b22] border border-[#30363d] text-sm">
          <option value="">Tots els temes</option>
          {temas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))}
                className="px-3 py-2 rounded bg-[#161b22] border border-[#30363d] text-sm">
          <option value={7}>7 dies</option>
          <option value={14}>14 dies</option>
          <option value={30}>30 dies</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {Object.entries(
          agg.reduce<Record<string, { positivo: number; negativo: number; neutro: number }>>((acc, a) => {
            acc[a.tema] = acc[a.tema] || { positivo: 0, negativo: 0, neutro: 0 };
            acc[a.tema][a.sentiment as 'positivo' | 'negativo' | 'neutro'] = a.n;
            return acc;
          }, {}),
        )
          .sort((a, b) => (b[1].positivo + b[1].negativo + b[1].neutro) - (a[1].positivo + a[1].negativo + a[1].neutro))
          .slice(0, 12)
          .map(([t, s]) => {
            const total = s.positivo + s.negativo + s.neutro;
            return (
              <div key={t} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <p className="font-medium text-sm">{t}</p>
                <p className="text-xs text-[#8b949e] mb-2">{total} mencions</p>
                <div className="flex h-2 rounded overflow-hidden bg-[#0d1117]">
                  <div style={{ width: `${(s.positivo / total) * 100}%` }} className="bg-green-500" />
                  <div style={{ width: `${(s.neutro / total) * 100}%` }} className="bg-gray-500" />
                  <div style={{ width: `${(s.negativo / total) * 100}%` }} className="bg-red-500" />
                </div>
                <div className="flex justify-between text-xs text-[#8b949e] mt-1">
                  <span className="text-green-400">+{s.positivo}</span>
                  <span>{s.neutro}</span>
                  <span className="text-red-400">−{s.negativo}</span>
                </div>
              </div>
            );
          })}
      </div>

      <h2 className="text-sm font-semibold uppercase text-[#8b949e] mb-3">Mencions recents</h2>
      <div className="space-y-2">
        {menciones.map((m) => (
          <a key={m.id} href={m.fuente_url} target="_blank" rel="noreferrer"
             className="block bg-[#161b22] border border-[#30363d] rounded-lg p-3 hover:border-[#2563eb]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#8b949e]">
                {m.fuente} · {m.autor} · {m.publicado_at.slice(0, 16)}
              </span>
              <span className={'text-xs ' + (SENTIMENT_COLOR[m.sentiment ?? ''] ?? 'text-[#8b949e]')}>
                {m.sentiment ?? '—'} {m.tema && `· ${m.tema}`}
              </span>
            </div>
            <p className="text-sm">{m.texto.replace(/<[^>]+>/g, '').slice(0, 280)}</p>
          </a>
        ))}
        {menciones.length === 0 && <p className="text-[#8b949e] text-sm">Sense mencions encara — la ingesta corre cada 15 min.</p>}
      </div>
    </div>
  );
}
