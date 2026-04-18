'use client';

import { type ReactNode } from 'react';
import { InfoTooltip } from './PanelBox';

interface PageHeaderProps {
  crumb: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  info?: string;
}

export function PageHeader({ crumb, title, subtitle, actions, info }: PageHeaderProps) {
  return (
    <div style={{
      padding: '22px 26px 18px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--ink)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)',
            letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {crumb}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1,
            margin: 0, letterSpacing: '-.02em', fontWeight: 400, color: 'var(--paper)',
            display: 'flex', alignItems: 'center',
          }}>
            {title}
            {info && <InfoTooltip text={info} />}
          </h1>
          {subtitle && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fog)', marginTop: 8, margin: '8px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ flexShrink: 0, paddingTop: 4 }}>{actions}</div>}
      </div>
    </div>
  );
}
