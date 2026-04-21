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
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.1, margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
          Parlament de <span style={{ color: 'var(--brand-l)', fontStyle: 'italic' }}>Catalunya.</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', marginTop: 8 }}>Sessions plenàries, comissions i DSPC</p>
      </div>
      <div style={{ padding: '20px 26px', maxWidth: 1100 }}>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', background: tab === t ? 'var(--ink-3)' : 'transparent',
            border: 'none', borderBottom: tab === t ? '2px solid var(--brand-l)' : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t ? 'var(--text-primary)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Sessions' && (
        sesiones.length > 0 ? (
          <div style={{ border: '.5px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 100px', padding: '10px 14px', borderBottom: '.5px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-meta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              <span>Data</span><span>Tipus</span><span>Títol</span><span>Estat</span>
            </div>
            {sesiones.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 100px', padding: '10px 14px', borderBottom: '.5px solid var(--border)', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-meta)' }}>{s.fecha}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{s.tipo}</span>
                <span style={{ color: 'var(--text-primary)' }}>{s.titulo}</span>
                <span style={{ color: 'var(--text-meta)' }}>{s.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 72, height: 72, margin: '0 auto 20px', border: '.5px solid var(--border)', display: 'grid', placeItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-l)" strokeWidth="1.2">
                <path d="M3 21V5l9-3 9 3v16M3 21h18M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>
              Properament
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Monitoratge del Parlament de Catalunya: sessions plenàries, comissions, DSPC. Comparativa entre discurs nacional i acció municipal.
            </p>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'transparent', border: '.5px solid var(--brand)', color: 'var(--brand-l)',
              borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              ◼ Notifica&apos;m quan estigui disponible
            </button>
          </div>
        )
      )}

      {tab === 'Punts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {puntos.map((p) => (
            <div key={p.id} style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{p.titulo}</p>
                {p.resultado && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)' }}>
                    {p.resultado}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-meta)', margin: '0 0 6px' }}>{p.fecha} · {p.tema ?? '—'} · {p.partido_proponente ?? ''}</p>
              {p.resumen && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{p.resumen}</p>}
            </div>
          ))}
          {puntos.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-meta)' }}>No hi ha punts estructurats encara.</p>}
        </div>
      )}

      {tab === 'Contradiccions' && (
        <div style={{ border: '.5px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 140px', padding: '10px 16px', borderBottom: '.5px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-meta)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            <span>Tema</span><span>Partit (Parlament)</span><span style={{ textAlign: 'right' }}>Rebutjades mun.</span><span style={{ textAlign: 'right' }}>Aprovades mun.</span>
          </div>
          {contras.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 140px', padding: '10px 16px', borderBottom: '.5px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-primary)' }}>{c.tema}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{c.partido_parlament}</span>
              <span style={{ textAlign: 'right', color: '#dc2626', fontFamily: 'var(--font-mono)' }}>{c.rechazadas_municipal}</span>
              <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{c.aprobadas_municipal}</span>
            </div>
          ))}
          {contras.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: 'var(--text-meta)' }}>
              No s&apos;han detectat contradiccions encara.
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
