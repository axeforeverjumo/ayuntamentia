'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/ApiClient';

type Sesion = {
  id: number;
  tipo: string;
  titulo: string;
  fecha: string;
  status: string;
  structured_at: string | null;
};

type Punto = {
  id: number;
  titulo: string;
  tema: string | null;
  resumen: string | null;
  resultado: string | null;
  partido_proponente: string | null;
  fecha: string;
};

type Contradiccion = {
  tema: string;
  partido_parlament: string;
  rechazadas_municipal: number;
  aprobadas_municipal: number;
  total_apariciones: number;
};

const TABS = ['Sessions', 'Punts', 'Contradiccions'] as const;

export default function ParlamentPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Sessions');
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [contras, setContras] = useState<Contradiccion[]>([]);

  useEffect(() => {
    apiClient.get<Sesion[]>('/api/parlament/sesiones?limit=100').then(setSesiones).catch(() => {});
    apiClient.get<Punto[]>('/api/parlament/puntos?limit=100').then(setPuntos).catch(() => {});
    apiClient.get<Contradiccion[]>('/api/parlament/contradicciones').then(setContras).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>Operacions / Parlament</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1, margin: 0, letterSpacing: '-.02em', fontWeight: 400, color: 'var(--paper)' }}>
          Parlament de <em style={{ color: 'var(--wr-amber)' }}>Catalunya.</em>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', marginTop: 8 }}>Sessions plenàries, comissions i DSPC</p>
      </div>
      <div style={{ padding: '20px 26px', maxWidth: 1100 }}>

      <div className="flex gap-4 border-b border-[#30363d] mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={'px-3 py-2 text-sm border-b-2 -mb-px ' +
                    (tab === t ? 'border-[#2563eb] text-white' : 'border-transparent text-[#8b949e]')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Sessions' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr><th className="text-left py-2">Data</th><th className="text-left">Tipus</th><th className="text-left">Títol</th><th className="text-left">Estat</th></tr>
          </thead>
          <tbody>
            {sesiones.map((s) => (
              <tr key={s.id} className="border-t border-[#21262d]">
                <td className="py-2 whitespace-nowrap">{s.fecha}</td>
                <td>{s.tipo}</td>
                <td className="text-[#e6edf3]">{s.titulo}</td>
                <td className="text-[#8b949e]">{s.status}</td>
              </tr>
            ))}
            {sesiones.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[#8b949e]">No hi ha sessions encara — el descobridor s&apos;executa cada nit.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === 'Punts' && (
        <div className="space-y-3">
          {puntos.map((p) => (
            <div key={p.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{p.titulo}</p>
                {p.resultado && <span className="text-xs px-2 py-0.5 rounded bg-[#21262d]">{p.resultado}</span>}
              </div>
              <p className="text-xs text-[#8b949e]">{p.fecha} · {p.tema ?? '—'} · {p.partido_proponente ?? ''}</p>
              {p.resumen && <p className="text-sm text-[#8b949e] mt-2">{p.resumen}</p>}
            </div>
          ))}
          {puntos.length === 0 && <p className="text-[#8b949e] text-sm">No hi ha punts estructurats encara.</p>}
        </div>
      )}

      {tab === 'Contradiccions' && (
        <table className="w-full text-sm">
          <thead className="text-xs text-[#8b949e] uppercase">
            <tr><th className="text-left py-2">Tema</th><th className="text-left">Partit (Parlament)</th><th className="text-right">Rebutjades municipal</th><th className="text-right">Aprovades municipal</th></tr>
          </thead>
          <tbody>
            {contras.map((c, i) => (
              <tr key={i} className="border-t border-[#21262d]">
                <td className="py-2">{c.tema}</td>
                <td>{c.partido_parlament}</td>
                <td className="text-right text-red-400">{c.rechazadas_municipal}</td>
                <td className="text-right">{c.aprobadas_municipal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
