'use client';

import { useEffect, useState } from 'react';
import { Search, Database, Brain, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  label: string;
  icon: typeof Search;
  minMs: number;
}

const STAGES: Stage[] = [
  { id: 'search',   label: 'Cercant en 947 municipis…',     icon: Search,   minMs: 0 },
  { id: 'fetch',    label: 'Recuperant actes rellevants…',  icon: Database, minMs: 900 },
  { id: 'analyze',  label: 'Analitzant patrons polítics…',  icon: Brain,    minMs: 2400 },
  { id: 'compose',  label: 'Redactant conclusions…',        icon: FileText, minMs: 4200 },
];

export function ProgressiveLoader() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 200);
    return () => clearInterval(id);
  }, []);

  const activeIdx = STAGES.reduce((acc, s, i) => (elapsed >= s.minMs ? i : acc), 0);

  return (
    <div className="flex gap-3 group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-[#7c3aed]/30 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] animate-pulse" />
      </div>

      <div className="flex-1 max-w-md">
        <div className="rounded-2xl border border-[#30363d] bg-gradient-to-br from-[#161b22] to-[#0f141b] p-3.5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#7c3aed]/5 to-transparent animate-[shimmer_2s_linear_infinite] pointer-events-none" />
          <ul className="space-y-2 relative">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isDone = i < activeIdx;
              const isActive = i === activeIdx;
              return (
                <li
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-2.5 text-[12px] transition-all duration-300',
                    isDone && 'text-[#6e7681]',
                    isActive && 'text-[#e6edf3] font-medium',
                    !isDone && !isActive && 'text-[#484f58] opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center border flex-shrink-0 transition-colors',
                      isDone && 'bg-[#052e16] border-[#16a34a]/40',
                      isActive && 'bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border-[#7c3aed]/50',
                      !isDone && !isActive && 'bg-[#0f141b] border-[#21262d]',
                    )}
                  >
                    {isDone ? (
                      <Check className="w-3 h-3 text-[#4ade80]" />
                    ) : isActive ? (
                      <Icon className="w-3 h-3 text-[#c4b5fd] animate-pulse" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                  </div>
                  <span className={cn(isActive && 'bg-gradient-to-r from-[#c4b5fd] to-[#67e8f9] bg-clip-text text-transparent')}>
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
