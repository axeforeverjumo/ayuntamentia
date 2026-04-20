'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/warroom/PageHeader';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { Gauge } from '@/components/landing/primitives';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type Regidor = {
  nombre: string; partido: string; municipio: string; cargo?: string;
  votos_total: number; divergencias: number; pct_alineacion: number;
};

export default function RegidorsPage() {
  const [regidors, setRegidors] = useState<Regidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'propis' | 'rivals'>('propis');
  const [partido, setPartido] = useState('AC');
  const [order, setOrder] = useState<'divergencia' | 'alineacion'>('divergencia');

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ order, limit: '200' });
    if (view === 'propis') {
      q.set('partido', 'AC');
    } else if (partido && partido !== 'AC') {
      q.set('partido', partido);
    }
    fetch(`${API}/api/intel/ranking-concejales?${q}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRegidors(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view, partido, order]);

  const danger = regidors.filter(r => r.pct_alineacion < 70);
  const aligned = regidors.filter(r => r.pct_alineacion >= 70);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Regidors"
        title={<>Regidors <em style={{ color: view === 'propis' ? 'var(--wr-phosphor)' : 'var(--wr-red-2)', fontWeight: 400 }}>{view === 'propis' ? 'propis.' : 'rivals.'}</em></>}
        actions={<StatusLine color="var(--wr-phosphor)">{regidors.length} regidors carregats</StatusLine>}
      />

      {/* Toggle + filters */}
      <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {(['propis', 'rivals'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 16px', background: view === v ? 'var(--paper)' : '#050505',
              color: view === v ? 'var(--ink)' : 'var(--bone)', border: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
              textTransform: 'uppercase', cursor: 'pointer', fontWeight: view === v ? 700 : 400,
            }}>
              {v === 'propis' ? 'Propis (AC)' : 'Rivals'}
            </button>
          ))}
        </div>

        <select value={order} onChange={e => setOrder(e.target.value as 'divergencia' | 'alineacion')}
          style={{
            padding: '8px 14px', background: '#050505', border: '1px solid var(--line)',
            color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>
          <option value="divergencia">Més divergents primer</option>
          <option value="alineacion">Més alineats primer</option>
        </select>

        {view === 'rivals' && (
          <input
            placeholder="Filtrar per partit (PP, PSC, ERC...)"
            value={partido === 'AC' ? '' : partido}
            onChange={e => setPartido(e.target.value || '')}
            style={{
              padding: '8px 14px', background: '#050505', border: '1px solid var(--line)',
              color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 240, outline: 'none',
            }}
          />
        )}
      </div>

      <div style={{ padding: '20px 26px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="pulse-dot" style={{ width: 10, height: 10, borderRadius: 10, background: 'var(--wr-phosphor)', margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Carregant regidors...</div>
          </div>
        ) : regidors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 12 }}>Sense dades</div>
            <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 400, margin: '0 auto' }}>
              Quan es processin actes amb votacions, els perfils de regidors apareixeran aquí amb alineació, divergències i historial.
            </p>
          </div>
        ) : (
          <>
            {/* Alert for low alignment */}
            {view === 'propis' && danger.length > 0 && (
              <div style={{
                padding: '14px 18px', marginBottom: 16,
                background: 'rgba(212,58,31,.06)', border: '1px solid rgba(212,58,31,.3)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 8, background: 'var(--wr-red-2)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--wr-red-2)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  ⚠ {danger.length} regidors amb alineació &lt; 70% — revisar
                </span>
              </div>
            )}

            {/* Table */}
            <div style={{ border: '1px solid var(--line)', background: '#050505' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 80px 140px 70px 80px 120px',
                padding: '10px 14px', borderBottom: '1px solid var(--line)',
                fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
                letterSpacing: '.14em', textTransform: 'uppercase',
              }}>
                <span>Regidor</span><span>Partit</span><span>Municipi</span>
                <span style={{ textAlign: 'right' }}>Vots</span>
                <span style={{ textAlign: 'right' }}>Diverg.</span>
                <span style={{ textAlign: 'right' }}>% Alineació</span>
              </div>
              {regidors.map((r, i) => {
                const isDanger = r.pct_alineacion < 70;
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 80px 140px 70px 80px 120px',
                    padding: '10px 14px',
                    borderBottom: '1px dashed var(--line-soft)',
                    background: isDanger && view === 'propis' ? 'rgba(212,58,31,.03)' : 'transparent',
                    fontSize: 13,
                  }}>
                    <div>
                      <span style={{ color: 'var(--paper)', fontWeight: 500 }}>{r.nombre}</span>
                      {r.cargo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginLeft: 6 }}>{r.cargo}</span>}
                    </div>
                    <StatusBadge tone={r.partido === 'AC' ? 'phos' : 'bone'}>{r.partido}</StatusBadge>
                    <span style={{ color: 'var(--fog)', fontSize: 12 }}>{r.municipio}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)' }}>{r.votos_total}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--wr-amber)', fontWeight: 700 }}>{r.divergencias}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                        color: isDanger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
                      }}>
                        {r.pct_alineacion}%
                      </span>
                      <div style={{ height: 3, background: 'var(--line)', marginTop: 4, marginLeft: 'auto', width: 70 }}>
                        <div style={{
                          height: '100%', width: `${r.pct_alineacion}%`,
                          background: isDanger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
