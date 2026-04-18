'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export function SevDot({ sev }: { sev: string }) {
  const map: Record<string, string> = { alta: '#e0684f', mitjana: '#d4a017', baixa: '#8bd35b' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, background: map[sev] || '#6b6659', borderRadius: 1 }} />;
}

type TagTone = 'bone' | 'red' | 'amber' | 'phos' | 'paper' | 'inverted';

export function Tag({ children, tone = 'bone', style }: { children: ReactNode; tone?: TagTone; style?: CSSProperties }) {
  const tones: Record<TagTone, { bg: string; color: string; bd: string }> = {
    bone: { bg: 'transparent', color: 'var(--bone)', bd: 'var(--line)' },
    red: { bg: '#1a0a08', color: '#e0684f', bd: '#5a1b10' },
    amber: { bg: '#1a1506', color: '#d4a017', bd: '#5a4310' },
    phos: { bg: '#0c160a', color: '#8bd35b', bd: '#2a4a1a' },
    paper: { bg: 'var(--paper)', color: 'var(--ink)', bd: 'var(--paper)' },
    inverted: { bg: 'var(--paper)', color: 'var(--ink)', bd: 'var(--paper)' },
  };
  const t = tones[tone] || tones.bone;
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em',
      textTransform: 'uppercase', padding: '3px 7px', border: `1px solid ${t.bd}`,
      background: t.bg, color: t.color, borderRadius: 2, ...style,
    }}>{children}</span>
  );
}

export function KVLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)',
      textTransform: 'uppercase', letterSpacing: '.12em',
    }}>{children}</div>
  );
}

export function StatusLine({ color = '#8bd35b', children }: { color?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)' }}>
      <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 8, background: color, boxShadow: `0 0 10px ${color}` }} />
      {children}
    </div>
  );
}

export function TickNumber({ value, format = (n: number) => n.toLocaleString('es-ES') }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * e));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{format(n)}</span>;
}

export function DotGrid({ size = 22, opacity = 0.12, style }: { size?: number; opacity?: number; style?: CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `radial-gradient(rgba(244,239,230,${opacity}) 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`, ...style,
    }} />
  );
}

export function CornerBrack() {
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map(p => {
        const s: CSSProperties = { position: 'absolute', width: 16, height: 16, pointerEvents: 'none' };
        const css: Record<string, CSSProperties> = {
          tl: { top: 4, left: 4, borderTop: '1px solid var(--wr-red-2)', borderLeft: '1px solid var(--wr-red-2)' },
          tr: { top: 4, right: 4, borderTop: '1px solid var(--wr-red-2)', borderRight: '1px solid var(--wr-red-2)' },
          bl: { bottom: 4, left: 4, borderBottom: '1px solid var(--wr-red-2)', borderLeft: '1px solid var(--wr-red-2)' },
          br: { bottom: 4, right: 4, borderBottom: '1px solid var(--wr-red-2)', borderRight: '1px solid var(--wr-red-2)' },
        };
        return <span key={p} style={{ ...s, ...css[p] }} />;
      })}
    </>
  );
}

export function Gauge({ label, value, tone = 'phos' }: { label: string; value: number; tone?: 'red' | 'amber' | 'phos' }) {
  const color = tone === 'red' ? 'var(--wr-red-2)' : tone === 'amber' ? 'var(--wr-amber)' : 'var(--wr-phosphor)';
  const glow = tone === 'red' ? 'rgba(224,104,79,.35)' : tone === 'amber' ? 'rgba(212,160,23,.35)' : 'rgba(139,211,91,.35)';
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 4,
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.14em',
        color: 'var(--fog)', textTransform: 'uppercase',
      }}>
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#1a1a1a', border: '1px solid var(--line-soft)' }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${value}%`,
          background: `linear-gradient(90deg, transparent, ${color})`,
          boxShadow: `0 0 8px ${glow}`,
        }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,.6) 9px 10px)' }} />
      </div>
    </div>
  );
}
