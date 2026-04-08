import { cn } from '@/lib/utils';
import { type AlertSeverity } from '@/lib/types';

interface AlertBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

const severityConfig: Record<
  AlertSeverity,
  { label: string; className: string }
> = {
  alta: {
    label: 'Alta',
    className:
      'bg-[#450a0a] text-[#f87171] border border-[#7f1d1d]',
  },
  media: {
    label: 'Mitja',
    className:
      'bg-[#451a03] text-[#fbbf24] border border-[#78350f]',
  },
  baja: {
    label: 'Baixa',
    className:
      'bg-[#052e16] text-[#4ade80] border border-[#14532d]',
  },
};

export function AlertBadge({ severity, className }: AlertBadgeProps) {
  const config = severityConfig[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
