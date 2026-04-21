'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Cercar...',
  className,
  onClear,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: 'var(--text-disabled)' }}
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          paddingLeft: 36,
          paddingRight: value ? 36 : 12,
          paddingTop: 9,
          paddingBottom: 9,
          borderRadius: 'var(--r-md)',
          background: 'var(--bg-elevated)',
          border: '.5px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-l)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
      {value && (
        <button
          onClick={() => { onChange(''); onClear?.(); }}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
