'use client';

type BadgeTone = 'red' | 'amber' | 'phos' | 'bone';

export function StatusBadge({ children, tone = 'bone' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const colors: Record<BadgeTone, { bg: string; color: string; bd: string }> = {
    red: { bg: '#1a0a08', color: '#e0684f', bd: '#5a1b10' },
    amber: { bg: '#1a1506', color: '#d4a017', bd: '#5a4310' },
    phos: { bg: '#0c160a', color: '#8bd35b', bd: '#2a4a1a' },
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
