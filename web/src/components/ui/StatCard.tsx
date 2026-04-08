'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'amber' | 'green' | 'red';
  className?: string;
}

const variantStyles = {
  default: {
    card: 'bg-[#161b22] border-[#30363d]',
    iconBg: 'bg-[#1c2128]',
    iconColor: 'text-[#8b949e]',
    value: 'text-[#e6edf3]',
  },
  primary: {
    card: 'bg-[#161b22] border-[#1e3a8a]',
    iconBg: 'bg-[#1e3a8a]',
    iconColor: 'text-[#60a5fa]',
    value: 'text-[#60a5fa]',
  },
  amber: {
    card: 'bg-[#161b22] border-[#451a03]',
    iconBg: 'bg-[#451a03]',
    iconColor: 'text-[#fbbf24]',
    value: 'text-[#fbbf24]',
  },
  green: {
    card: 'bg-[#161b22] border-[#052e16]',
    iconBg: 'bg-[#052e16]',
    iconColor: 'text-[#4ade80]',
    value: 'text-[#4ade80]',
  },
  red: {
    card: 'bg-[#161b22] border-[#450a0a]',
    iconBg: 'bg-[#450a0a]',
    iconColor: 'text-[#f87171]',
    value: 'text-[#f87171]',
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-lg border p-5 transition-colors hover:border-[#484f58]',
        styles.card,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#8b949e] font-medium mb-1">{label}</p>
          <p className={cn('text-2xl font-bold tabular-nums', styles.value)}>
            {typeof value === 'number' ? value.toLocaleString('ca-ES') : value}
          </p>
          {trend && (
            <p className="text-xs text-[#8b949e] mt-1">
              <span
                className={cn(
                  'font-medium',
                  trend.value > 0 ? 'text-[#4ade80]' : 'text-[#f87171]',
                )}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>{' '}
              {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', styles.iconBg)}>
          <Icon className={cn('w-5 h-5', styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
