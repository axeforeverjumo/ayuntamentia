'use client';

import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';

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

export function PanelBox({ title, subtitle, children, style }: PanelBoxProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '.5px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '.08em',
        textTransform: 'uppercase', fontWeight: 500,
      }}>
        <span style={{ color: 'var(--text-meta)' }}>{title}</span>
        {subtitle && <span style={{ color: 'var(--text-timestamp)', fontWeight: 400 }}>{subtitle}</span>}
      </div>
      <div style={{ padding: 14 }}>
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
          width: 22, height: 22, borderRadius: 22,
          border: '.5px solid var(--border-em)', color: 'var(--text-meta)',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
          cursor: 'pointer', marginLeft: 10, flexShrink: 0, userSelect: 'none',
        }}
      >
        ?
      </span>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '.5px solid var(--border)',
              borderRadius: 'var(--r-lg)', maxWidth: 580, width: '100%', padding: 32,
            }}
          >
            {typeof text === 'string' ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
                {text}
              </p>
            ) : (
              <>
                {text.title && (
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px', letterSpacing: '-.01em' }}>
                    {text.title}
                  </h2>
                )}
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 14px' }}>
                  {text.description}
                </p>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--brand-l)',
                  letterSpacing: '.06em', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 8 }}>●</span>
                  {text.dataSource}
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {text.tips.map((tip, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--brand-l)', flexShrink: 0, marginTop: 1 }}>→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent', border: '.5px solid var(--border)', color: 'var(--text-meta)',
                borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                padding: '8px 18px', cursor: 'pointer',
              }}
            >
              Tancar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** @deprecated Use HelpModal */
export const InfoTooltip = HelpModal;
