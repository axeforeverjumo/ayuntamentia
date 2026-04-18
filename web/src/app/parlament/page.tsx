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

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', background: tab === t ? '#0e0e0e' : 'transparent',
            border: 'none', borderBottom: tab === t ? '2px solid var(--wr-amber)' : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t ? 'var(--paper)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Sessions' && (
        sesiones.length > 0 ? (
          <div style={{ border: '1px solid var(--line)', background: '#050505' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 100px', padding: '10px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              <span>Data</span><span>Tipus</span><span>Títol</span><span>Estat</span>
            </div>
            {sesiones.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 100px', padding: '10px 14px', borderBottom: '1px dashed var(--line-soft)', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fog)' }}>{s.fecha}</span>
                <span style={{ color: 'var(--bone)' }}>{s.tipo}</span>
                <span style={{ color: 'var(--paper)' }}>{s.titulo}</span>
                <span style={{ color: 'var(--fog)' }}>{s.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 20px', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', background: '#080808' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wr-amber)" strokeWidth="1.2">
                <path d="M3 21V5l9-3 9 3v16M3 21h18M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 10 }}>
              Properament
            </div>
            <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Monitoratge del Parlament de Catalunya: sessions plenàries, comissions, DSPC. Comparativa entre discurs nacional i acció municipal.
            </p>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'transparent', border: '1px solid var(--wr-amber)', color: 'var(--wr-amber)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              ◼ Notifica&apos;m quan estigui disponible
            </button>
          </div>
        )
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
    </div>
  );
}
