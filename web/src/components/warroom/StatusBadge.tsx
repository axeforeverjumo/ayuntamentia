'use client';

type BadgeTone = 'red' | 'amber' | 'phos' | 'bone';

const darkColors: Record<BadgeTone, { bg: string; color: string }> = {
  red:  { bg: '#3B0A0A', color: '#F8A4A4' },
  amber:{ bg: '#2D1A00', color: '#F5C06A' },
  phos: { bg: '#062315', color: '#6EE0A0' },
  bone: { bg: '#1E2023', color: '#9AA3AD' },
};

const dotColors: Record<BadgeTone, string> = {
  red: '#F8A4A4',
  amber: '#F5C06A',
  phos: '#6EE0A0',
  bone: '#9AA3AD',
};

export function StatusBadge({ children, tone = 'bone' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const c = darkColors[tone];
  const dot = dotColors[tone];
  return (
    <span style={{
      fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.02em',
      fontWeight: 500, padding: '3px 8px',
      borderRadius: 'var(--r-full)',
      background: c.bg, color: c.color,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: dot, flexShrink: 0, display: 'inline-block' }} />
      {children}
    </span>
  );
}

export function LiveDot({ color = 'var(--brand-l)' }: { color?: string }) {
  return (
    <span className="pulse-dot" style={{
      width: 7, height: 7, borderRadius: 7,
      background: color,
      display: 'inline-block',
    }} />
  );
}

export function StatusLine({ color = 'var(--brand-l)', children }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)',
    }}>
      <LiveDot color={color} />
      {children}
    </div>
  );
}
