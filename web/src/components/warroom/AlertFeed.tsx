'use client';

import { useEffect, useState } from 'react';

interface AlertItem {
  time: string;
  severity: 'alta' | 'media' | 'baja';
  type: string;
  text: string;
  municipio?: string;
}

const sevColors = {
  alta:  { bg: '#3B0A0A', color: '#F8A4A4', dot: '#F8A4A4' },
  media: { bg: '#2D1A00', color: '#F5C06A', dot: '#F5C06A' },
  baja:  { bg: '#062315', color: '#6EE0A0', dot: '#6EE0A0' },
};

export function AlertFeed({ items, maxVisible = 5 }: { items: AlertItem[]; maxVisible?: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= maxVisible) return;
    const id = setInterval(() => setIdx(x => (x + 1) % items.length), 3000);
    return () => clearInterval(id);
  }, [items.length, maxVisible]);

  const visible = items.length <= maxVisible
    ? items
    : Array.from({ length: maxVisible }, (_, i) => items[(idx + i) % items.length]);

  if (items.length === 0) {
    return (
      <div style={{
        padding: '24px 14px', textAlign: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)',
      }}>
        Cap alerta crítica · sistema operatiu
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((item, i) => {
        const sev = sevColors[item.severity];
        return (
          <div key={idx + '-' + i} className="fade-up" style={{
            padding: '10px 12px',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg-surface)',
            border: '.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                padding: '2px 7px', borderRadius: 999,
                background: sev.bg, color: sev.color,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: sev.dot, display: 'inline-block', flexShrink: 0 }} />
                {item.type}
                {item.municipio && <span style={{ opacity: .7 }}>· {item.municipio}</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-timestamp)' }}>
                {item.time}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
              {item.type}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrendingBar({ label, value, max, tone = 'phos' }: {
  label: string; value: number; max: number; tone?: 'red' | 'amber' | 'phos';
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = tone === 'red' ? '#F8A4A4' : tone === 'amber' ? '#F5C06A' : '#6EE0A0';
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>{value.toLocaleString('es-ES')}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, position: 'relative' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: color,
          transition: 'width 1s ease-out',
        }} />
      </div>
    </div>
  );
}
