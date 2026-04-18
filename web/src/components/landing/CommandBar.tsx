'use client';

import { useEffect, useState } from 'react';

export function CommandBar() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = now ? now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
  const local = now ? now.toLocaleTimeString('es-ES', { hour12: false }) + ' CET' : '—';
  const items = [
    { k: 'classification', label: '◼ CONFIDENCIAL // ÚS INTERN', color: 'var(--wr-red-2)' },
    { k: 'clock', label: utc, color: 'var(--wr-phosphor)' },
    { k: 'local', label: local, color: 'var(--bone)' },
    { k: 'defcon', label: 'DEFCON · 2 · LECTURA', color: 'var(--wr-amber)' },
    { k: 'sync', label: 'SYNC T−00:04:12', color: 'var(--bone)' },
    { k: 'nodes', label: 'NODES 947/947 · 100%', color: 'var(--wr-phosphor)' },
    { k: 'pipe', label: 'PIPE OK · BATCH #4821', color: 'var(--wr-phosphor)' },
    { k: 'checksum', label: 'SHA · A7F3 9C1E · 4B22', color: 'var(--fog)' },
    { k: 'op', label: 'OP · AYTMT-26', color: 'var(--wr-red-2)' },
  ];

  if (!mounted) {
    return (
      <div style={{
        borderBottom: '1px solid var(--line)', background: '#060606',
        height: 30,
      }} />
    );
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--line)', background: '#060606',
      display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, alignItems: 'stretch',
      fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em',
      textTransform: 'uppercase', position: 'relative', overflow: 'hidden',
    }}>
      {items.map((it, i) => (
        <div key={it.k} style={{
          padding: '7px 10px', borderRight: i < items.length - 1 ? '1px solid var(--line-soft)' : 'none',
          color: it.color, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {it.k === 'classification' && <span className="pulse-dot" style={{ width: 6, height: 6, background: it.color, borderRadius: 1 }} />}
          {it.k === 'clock' && <span className="blink">●</span>}
          {it.label}
        </div>
      ))}
    </div>
  );
}
