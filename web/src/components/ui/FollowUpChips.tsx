'use client';

import { Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUpChipsProps {
  items: string[];
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export function FollowUpChips({ items, onSelect, disabled }: FollowUpChipsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3 h-3 text-[#fbbf24]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b949e]">
          Preguntes relacionades
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((q, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className={cn(
              'group flex items-center justify-between gap-2 text-left px-3 py-2 rounded-xl text-[12px]',
              'bg-gradient-to-r from-[#0f141b] to-[#161b22]',
              'border border-[#21262d] text-[#c9d1d9]',
              'hover:border-[#7c3aed]/40 hover:from-[#1a0b2e]/40 hover:to-[#0a1e26]/40 hover:text-[#f3f6fa]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className="flex-1 truncate">{q}</span>
            <ArrowRight className="w-3 h-3 flex-shrink-0 text-[#6e7681] group-hover:text-[#67e8f9] group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
