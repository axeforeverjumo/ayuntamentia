'use client';

import { MAP_POINTS } from './data';

export function TacticalRadar() {
  const pts = MAP_POINTS;
  return (
    <svg viewBox="-100 -100 200 200" width="100%" style={{ display: 'block', maxHeight: 200 }}>
      <defs>
        <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--wr-phosphor)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--wr-phosphor)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[25, 50, 75, 95].map(r => (
        <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="var(--wr-phosphor-dim)" strokeOpacity="0.4" strokeWidth="0.5" />
      ))}
      <line x1="-100" y1="0" x2="100" y2="0" stroke="var(--wr-phosphor-dim)" strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="0" y1="-100" x2="0" y2="100" stroke="var(--wr-phosphor-dim)" strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="-71" y1="-71" x2="71" y2="71" stroke="var(--wr-phosphor-dim)" strokeOpacity="0.2" strokeWidth="0.4" />
      <line x1="71" y1="-71" x2="-71" y2="71" stroke="var(--wr-phosphor-dim)" strokeOpacity="0.2" strokeWidth="0.4" />
      <g style={{ transformOrigin: 'center', animation: 'radar-sweep 4s linear infinite' }}>
        <path d="M0,0 L100,0 A100,100 0 0,1 29,96 Z" fill="url(#sweep)" />
      </g>
      {pts.map((p, idx) => {
        const x = (p.x - 50) * 1.6;
        const y = (p.y - 65) * 1.6;
        const isHot = p.hot >= 3;
        return (
          <g key={idx}>
            {isHot && (
              <circle cx={x} cy={y} r="7" fill="var(--wr-red-2)" opacity="0.15">
                <animate attributeName="r" from="2" to="12" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={x} cy={y} r={2 + Math.min(p.hot, 4) * 0.5}
              fill={isHot ? 'var(--wr-red-2)' : p.hot >= 2 ? 'var(--wr-amber)' : 'var(--wr-phosphor)'}
              style={{ filter: isHot ? 'drop-shadow(0 0 4px var(--wr-red-2))' : 'drop-shadow(0 0 3px var(--wr-phosphor))' }}
            />
            <text x={x + 4} y={y + 3} fill={isHot ? 'var(--wr-red-2)' : 'var(--wr-phosphor)'}
              fontFamily="var(--font-mono)" fontSize="4.5" opacity="0.85">{p.m}</text>
          </g>
        );
      })}
      <circle cx="0" cy="0" r="1.5" fill="var(--paper)" />
    </svg>
  );
}
