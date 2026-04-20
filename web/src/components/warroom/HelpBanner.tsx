'use client';

import { useState, useEffect } from 'react';

interface HelpBannerProps {
  pageKey: string;
  title: string;
  description: string;
  dataSource: string;
  tips: string[];
}

export function HelpBanner({ pageKey, title, description, dataSource, tips }: HelpBannerProps) {
  const storageKey = `help_dismissed_${pageKey}`;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
    setExpanded(!dismissed);
  }, [storageKey]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next) localStorage.setItem(storageKey, '1');
    else localStorage.removeItem(storageKey);
  }

  return (
    <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--ink-2)' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 26px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fog)',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
        }}
      >
        <span>ℹ Ajuda</span>
        <span style={{ fontSize: 12, letterSpacing: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? 500 : 0,
          transition: 'max-height 0.25s ease',
        }}
      >
        <div style={{ padding: '20px 26px 24px', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 12 }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 400,
              margin: 0,
              color: 'var(--paper)',
              letterSpacing: '-.01em',
            }}>
              {title}
            </h2>
            <button
              onClick={toggle}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fog)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '4px 8px',
                flexShrink: 0,
              }}
            >
              ✕ Tancar
            </button>
          </div>

          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--bone)',
            lineHeight: 1.6,
            margin: '0 0 16px',
            maxWidth: 760,
          }}>
            {description}
          </p>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--wr-phosphor)',
            letterSpacing: '.08em',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 8 }}>●</span>
            {dataSource}
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tips.map((tip, i) => (
              <li key={i} style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--bone)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}>
                <span style={{ color: 'var(--wr-phosphor)', flexShrink: 0, marginTop: 1 }}>→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
