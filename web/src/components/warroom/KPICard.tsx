'use client';

import { useEffect, useState } from 'react';

interface KPICardProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'red' | 'amber' | 'phos';
  format?: (n: number) => string;
  suffix?: string;
  sublabel?: string;
}

export function KPICard({ label, value, tone = 'default', format, suffix, sublabel }: KPICardProps) {
  const toneColors = {
    default: 'var(--paper)',
    red: 'var(--wr-red-2)',
    amber: 'var(--wr-amber)',
    phos: 'var(--wr-phosphor)',
  };
  const toneBg = {
    default: 'transparent',
    red: 'rgba(212,58,31,.04)',
    amber: 'rgba(232,168,23,.04)',
    phos: 'rgba(161,255,90,.04)',
  };
  const color = toneColors[tone];
  const bg = toneBg[tone];

  const isNumber = typeof value === 'number';
  const [display, setDisplay] = useState(isNumber ? 0 : value);

  useEffect(() => {
    if (!isNumber) { setDisplay(value); return; }
    let raf: number;
    const start = performance.now();
    const dur = 1200;
    const target = value as number;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const n = Math.round(target * e);
      setDisplay(format ? format(n) : n.toLocaleString('es-ES'));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value, isNumber, format]);

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--ink-2), ${bg})`,
      border: '1px solid var(--line)',
      padding: '18px 20px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 6, right: 8,
        width: 6, height: 6, borderRadius: 6,
        background: color, opacity: 0.6,
      }} className="pulse-dot" />

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
        letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        {label}
      </div>

      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 38, lineHeight: 1,
        color, fontStyle: tone === 'red' ? 'italic' : 'normal',
      }}>
        {display}{suffix && <span style={{ fontSize: 18, color: 'var(--fog)', marginLeft: 4 }}>{suffix}</span>}
      </div>

      {sublabel && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
          letterSpacing: '.08em', marginTop: 8,
        }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

export function KPIGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 1, background: 'var(--line)', border: '1px solid var(--line)',
    }}>
      {children}
    </div>
  );
}
