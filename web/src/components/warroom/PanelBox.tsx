'use client';

import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';
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

export interface HelpInfo {
  title?: string;
  description: string;
  dataSource: string;
  tips: string[];
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
      background: 'var(--ink-2)', border: '1px solid var(--line)',
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

export function HelpModal({ text }: { text: string | HelpInfo }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 20,
          border: '2px solid var(--bone)', color: 'var(--bone)',
          fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
          marginLeft: 10, flexShrink: 0, userSelect: 'none',
        }}
      >
        ?
      </span>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              maxWidth: 500, width: '100%', padding: 24,
            }}
          >
            {typeof text === 'string' ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--bone)', lineHeight: 1.6, margin: '0 0 20px' }}>
                {text}
              </p>
            ) : (
              <>
                {text.title && (
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--paper)', margin: '0 0 14px', letterSpacing: '-.01em' }}>
                    {text.title}
                  </h2>
                )}
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--bone)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  {text.description}
                </p>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-phosphor)',
                  letterSpacing: '.08em', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 8 }}>●</span>
                  {text.dataSource}
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {text.tips.map((tip, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--bone)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--wr-phosphor)', flexShrink: 0, marginTop: 1 }}>→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent', border: '1px solid var(--line)', color: 'var(--fog)',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em',
                textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer',
              }}
            >
              ✕ Tancar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated Use HelpModal */
export const InfoTooltip = HelpModal;
