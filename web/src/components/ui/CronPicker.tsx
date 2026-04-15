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
  const [min, h, dom, , dow] = p;
  const hour = Number(h) || 0;
  if (dow !== '*') return { freq: 'setmanal', hour, dow: Number(dow) || 5, dom: 1 };
  if (dom !== '*') return { freq: 'mensual', hour, dow: 5, dom: Number(dom) || 1 };
  return { freq: 'diari', hour, dow: 5, dom: 1 };
}

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
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {(['diari', 'setmanal', 'mensual'] as Freq[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFreq(f)}
            className={
              'px-3 py-2 rounded text-xs border capitalize ' +
              (freq === f
                ? 'bg-[#2563eb] border-[#2563eb] text-white'
                : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58]')
            }
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {freq === 'setmanal' && (
          <select
            value={dow}
            onChange={(e) => setDow(Number(e.target.value))}
            className="px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
          >
            {DIAS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        )}
        {freq === 'mensual' && (
          <select
            value={dom}
            onChange={(e) => setDom(Number(e.target.value))}
            className="px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Dia {d}</option>
            ))}
          </select>
        )}
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
        >
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-[#8b949e]">
        {human} · <code className="text-[10px] text-[#6e7681]">{value}</code>
      </p>
    </div>
  );
}
