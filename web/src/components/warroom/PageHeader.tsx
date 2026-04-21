'use client';

import { type ReactNode } from 'react';
import { HelpModal, type HelpInfo } from './PanelBox';

interface PageHeaderProps {
  crumb: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  info?: string | HelpInfo;
}

export function PageHeader({ crumb, title, subtitle, actions, info }: PageHeaderProps) {
  return (
    <div style={{
      padding: '22px 26px 18px',
      borderBottom: '.5px solid var(--border)',
      background: 'var(--bg-base)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-meta)',
            letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8,
          }}>
            {crumb}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.2,
            margin: 0, letterSpacing: '-.015em', fontWeight: 500, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center',
          }}>
            {title}
            {info && <HelpModal text={info} />}
          </h1>
          {subtitle && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 8, margin: '8px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ flexShrink: 0, paddingTop: 4 }}>{actions}</div>}
      </div>
    </div>
  );
}
