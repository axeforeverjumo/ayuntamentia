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
  const toneColors: Record<string, string> = {
    default: 'var(--text-primary)',
    red: '#F8A4A4',
    amber: '#F5C06A',
    phos: '#6EE0A0',
  };
  const color = toneColors[tone];

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
      background: 'var(--bg-surface)',
      border: '.5px solid var(--border)',
      borderRadius: 'var(--r-md)',
      padding: '18px 20px 16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 9.5, color: 'var(--text-meta)',
        letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 10,
      }}>
        {label}
      </div>

      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 30, lineHeight: 1,
        color, fontWeight: 300, letterSpacing: '-.025em',
      }}>
        {display}{suffix && <span style={{ fontSize: 16, color: 'var(--text-meta)', marginLeft: 4 }}>{suffix}</span>}
      </div>

      {sublabel && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-timestamp)',
          marginTop: 8,
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
      gap: 12,
    }}>
      {children}
    </div>
  );
}
