'use client';

import { useEffect, useState } from 'react';
import { INTEL_FEED } from './data';
import { Tag, Gauge } from './primitives';
import { TacticalRadar } from './TacticalRadar';

export function LiveIntelPanel() {
  const [i, setI] = useState(0);
  const [tab, setTab] = useState('feed');
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % INTEL_FEED.length), 2200);
    return () => clearInterval(t);
  }, []);
  const visible = [0, 1, 2, 3].map(k => INTEL_FEED[(i + k) % INTEL_FEED.length]);
  return (
    <div className="scanline" style={{
      background: '#080808', border: '1px solid var(--line)', position: 'relative',
      boxShadow: '0 30px 80px -40px rgba(224,104,79,.35)',
    }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--line)', background: '#050505',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em',
        color: 'var(--fog)', textTransform: 'uppercase',
      }}>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, background: 'var(--wr-phosphor)', borderRadius: 7, boxShadow: '0 0 10px var(--wr-phosphor)' }} />
          Tactical · theater catalunya
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <span>LAT 41.8 · LON 1.9</span>
          <span style={{ color: 'var(--wr-phosphor)' }}>LINK ↑</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', borderBottom: '1px solid var(--line)' }}>
        <div style={{ borderRight: '1px solid var(--line)', padding: 14, position: 'relative', background: 'radial-gradient(circle at center, #0b1409 0%, #050505 70%)' }}>
          <TacticalRadar />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--wr-phosphor-dim)', letterSpacing: '.18em', marginTop: 8, textAlign: 'center', textTransform: 'uppercase' }}>
            SWEEP · 360° · 4S
          </div>
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Gauge label="Severitat ponderada" value={74} tone="red" />
          <Gauge label="Confiança evidencial" value={92} tone="phos" />
          <Gauge label="Cobertura 947 municipis" value={100} tone="phos" />
          <Gauge label="Risc operatiu rival" value={58} tone="amber" />
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {(['feed', 'vots', 'cites'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, background: tab === t ? '#0e0e0e' : 'transparent',
            border: 'none', borderRight: '1px solid var(--line)',
            color: tab === t ? 'var(--paper)' : 'var(--fog)',
            padding: '8px 10px', fontFamily: 'var(--font-mono)',
            fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t === 'feed' ? '◉ intel stream' : t === 'vots' ? '▼ vots divergents' : '❝ cites literals'}
          </button>
        ))}
      </div>

      <div style={{ padding: '2px 0', maxHeight: 232, overflow: 'hidden' }}>
        {visible.map((row, idx) => (
          <div key={i + '-' + idx} className="fade-up" style={{
            display: 'grid', gridTemplateColumns: '46px 100px 1fr',
            gap: 10, padding: '9px 14px', borderBottom: '1px dashed var(--line-soft)',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)' }}>{row.t}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Tag tone={row.sev === 'alta' ? 'red' : row.sev === 'mitjana' ? 'amber' : 'phos'}>{row.tag}</Tag>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>{row.muni}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--paper)' }}>{row.text}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
        letterSpacing: '.1em', textTransform: 'uppercase', borderTop: '1px solid var(--line)', background: '#050505',
      }}>
        <span>12 events · buffer +4 en 0:18</span>
        <span><span style={{ color: 'var(--wr-phosphor)' }}>● </span>link estable · 2,3 Mbps</span>
      </div>
    </div>
  );
}
