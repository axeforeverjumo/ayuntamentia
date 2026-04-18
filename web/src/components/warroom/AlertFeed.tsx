'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from './StatusBadge';

interface AlertItem {
  time: string;
  severity: 'alta' | 'media' | 'baja';
  type: string;
  text: string;
  municipio?: string;
}

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
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--wr-phosphor)',
        letterSpacing: '.1em', textTransform: 'uppercase',
      }}>
        ✓ Cap alerta crítica · sistema operatiu
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
      {visible.map((item, i) => {
        const sevTone = item.severity === 'alta' ? 'red' as const : item.severity === 'media' ? 'amber' as const : 'phos' as const;
        return (
          <div key={idx + '-' + i} className="fade-up" style={{
            display: 'grid', gridTemplateColumns: '50px 1fr',
            gap: 10, padding: '8px 0',
            borderBottom: '1px dashed var(--line-soft)',
          }}>
            <span style={{ color: 'var(--fog)', fontSize: 9.5 }}>{item.time}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <StatusBadge tone={sevTone}>{item.type}</StatusBadge>
                {item.municipio && <span style={{ color: 'var(--fog)', fontSize: 9 }}>{item.municipio}</span>}
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--paper)' }}>{item.text}</div>
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
  const color = tone === 'red' ? 'var(--wr-red-2)' : tone === 'amber' ? 'var(--wr-amber)' : 'var(--wr-phosphor)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '6px 0' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--paper)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color }}>{value.toLocaleString('es-ES')}</span>
        </div>
        <div style={{ height: 4, background: 'var(--line)', position: 'relative' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, transparent, ${color})`,
            boxShadow: `0 0 6px ${color}40`,
            transition: 'width 1s ease-out',
          }} />
        </div>
      </div>
    </div>
  );
}
