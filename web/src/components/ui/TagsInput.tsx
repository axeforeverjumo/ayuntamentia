'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function TagsInput({ value, onChange, placeholder, suggestions = [], className }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setInput('');
  };

  const removeTag = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value.length - 1);
    }
  };

  const availableSuggestions = suggestions.filter((s) =>
    !value.includes(s) && (!input || s.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 6);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] focus-within:border-[#7c3aed]/60 transition-colors"
      >
        {value.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#1a0b2e]/60 to-[#0a1e26]/60 border border-[#7c3aed]/30 text-[11px] text-[#c4b5fd]"
          >
            {t}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="hover:text-[#f87171] transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => { if (input) addTag(input); }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-[12px] text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none"
        />
      </div>

      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="px-1.5 py-0.5 rounded text-[10px] bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
