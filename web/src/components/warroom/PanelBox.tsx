'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { CornerBrack } from '@/components/landing/primitives';

type PanelTone = 'default' | 'red' | 'amber' | 'phos';

interface PanelBoxProps {
  title: string;
  subtitle?: string;
  tone?: PanelTone;
  children: ReactNode;
  style?: CSSProperties;
  info?: string;
}

const toneMap: Record<PanelTone, string> = {
  default: 'var(--bone)',
  red: 'var(--wr-red-2)',
  amber: 'var(--wr-amber)',
  phos: 'var(--wr-phosphor)',
};

export function PanelBox({ title, subtitle, tone = 'default', children, style, info }: PanelBoxProps) {
  const color = toneMap[tone];
  return (
    <div style={{
      background: '#080808', border: '1px solid var(--line)',
      position: 'relative', ...style,
    }}>
      <CornerBrack />
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
      }}>
        <span style={{ color: 'var(--bone)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, background: color, borderRadius: 1 }} />
          {title}
        </span>
        <span style={{ color: 'var(--fog)' }}>{subtitle}</span>
      </div>
      <div style={{ padding: '14px' }}>
        {children}
      </div>
    </div>
  );
}

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 16,
        border: '1px solid var(--line)', color: 'var(--fog)',
        fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'help',
        marginLeft: 8, flexShrink: 0,
      }}
    >
      i
    </span>
  );
}
