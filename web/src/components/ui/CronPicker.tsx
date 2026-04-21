'use client';

import { useEffect, useMemo, useState } from 'react';

type Freq = 'diari' | 'setmanal' | 'mensual';
const DIAS = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

interface Props {
  value: string;
  onChange: (cron: string) => void;
}

function parse(cron: string): { freq: Freq; hour: number; dow: number; dom: number } {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return { freq: 'setmanal', hour: 8, dow: 5, dom: 1 };
  const [, h, dom, , dow] = p;
  const hour = Number(h) || 0;
  if (dow !== '*') return { freq: 'setmanal', hour, dow: Number(dow) || 5, dom: 1 };
  if (dom !== '*') return { freq: 'mensual', hour, dow: 5, dom: Number(dom) || 1 };
  return { freq: 'diari', hour, dow: 5, dom: 1 };
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg-elevated)',
  border: '.5px solid var(--border-em)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '100%',
};

export function CronPicker({ value, onChange }: Props) {
  const initial = useMemo(() => parse(value), [value]);
  const [freq, setFreq] = useState<Freq>(initial.freq);
  const [hour, setHour] = useState(initial.hour);
  const [dow, setDow] = useState(initial.dow);
  const [dom, setDom] = useState(initial.dom);

  useEffect(() => {
    let cron = '';
    if (freq === 'diari') cron = `0 ${hour} * * *`;
    else if (freq === 'setmanal') cron = `0 ${hour} * * ${dow}`;
    else cron = `0 ${hour} ${dom} * *`;
    if (cron !== value) onChange(cron);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq, hour, dow, dom]);

  const human =
    freq === 'diari'
      ? `Cada dia a les ${String(hour).padStart(2, '0')}:00`
      : freq === 'setmanal'
      ? `Cada ${DIAS[dow].toLowerCase()} a les ${String(hour).padStart(2, '0')}:00`
      : `El dia ${dom} de cada mes a les ${String(hour).padStart(2, '0')}:00`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Segment selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        border: '.5px solid var(--border-em)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}>
        {(['diari', 'setmanal', 'mensual'] as Freq[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFreq(f)}
            style={{
              padding: '8px 12px',
              background: freq === f ? 'var(--brand)' : 'transparent',
              color: freq === f ? '#fff' : 'var(--text-meta)',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: freq === f ? 500 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {freq === 'setmanal' && (
          <select value={dow} onChange={(e) => setDow(Number(e.target.value))} style={selectStyle}>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        )}
        {freq === 'mensual' && (
          <select value={dom} onChange={(e) => setDom(Number(e.target.value))} style={selectStyle}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Dia {d}</option>
            ))}
          </select>
        )}
        <select value={hour} onChange={(e) => setHour(Number(e.target.value))} style={selectStyle}>
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
        {human} · <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-timestamp)' }}>{value}</code>
      </p>
    </div>
  );
}
