'use client';

type BadgeTone = 'red' | 'amber' | 'phos' | 'bone';

export function StatusBadge({ children, tone = 'bone' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const colors: Record<BadgeTone, { bg: string; color: string; bd: string }> = {
    red: { bg: 'color-mix(in srgb, var(--wr-red-2) 12%, transparent)', color: 'var(--wr-red-2)', bd: 'color-mix(in srgb, var(--wr-red-2) 35%, transparent)' },
    amber: { bg: 'color-mix(in srgb, var(--wr-amber) 12%, transparent)', color: 'var(--wr-amber)', bd: 'color-mix(in srgb, var(--wr-amber) 35%, transparent)' },
    phos: { bg: 'color-mix(in srgb, var(--wr-phosphor) 12%, transparent)', color: 'var(--wr-phosphor)', bd: 'color-mix(in srgb, var(--wr-phosphor) 35%, transparent)' },
    bone: { bg: 'transparent', color: 'var(--bone)', bd: 'var(--line)' },
  };
  const c = colors[tone];
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em',
      textTransform: 'uppercase', padding: '3px 8px',
      border: `1px solid ${c.bd}`, background: c.bg, color: c.color,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {children}
    </span>
  );
}

export function LiveDot({ color = 'var(--wr-phosphor)' }: { color?: string }) {
  return (
    <span className="pulse-dot" style={{
      width: 7, height: 7, borderRadius: 7,
      background: color, boxShadow: `0 0 8px ${color}`,
      display: 'inline-block',
    }} />
  );
}

export function StatusLine({ color = 'var(--wr-phosphor)', children }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)',
    }}>
      <LiveDot color={color} />
      {children}
    </div>
  );
}
