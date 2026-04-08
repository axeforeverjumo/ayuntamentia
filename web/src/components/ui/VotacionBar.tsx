import { cn } from '@/lib/utils';
import { type Votacion } from '@/lib/types';

interface VotacionBarProps {
  votacion: Votacion;
  className?: string;
}

export function VotacionBar({ votacion, className }: VotacionBarProps) {
  const total =
    votacion.votos_favor + votacion.votos_contra + votacion.abstenciones;
  const pctFavor = total > 0 ? (votacion.votos_favor / total) * 100 : 0;
  const pctContra = total > 0 ? (votacion.votos_contra / total) * 100 : 0;
  const pctAbstencion = total > 0 ? (votacion.abstenciones / total) * 100 : 0;

  const resultColors: Record<string, string> = {
    aprobada: 'text-[#4ade80]',
    rechazada: 'text-[#f87171]',
    empate: 'text-[#fbbf24]',
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Result label */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium capitalize',
            resultColors[votacion.resultado] ?? 'text-[#8b949e]',
          )}
        >
          {votacion.resultado}
        </span>
        <span className="text-xs text-[#6e7681]">Total: {total} vots</span>
      </div>

      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {pctFavor > 0 && (
          <div
            className="bg-[#16a34a] transition-all"
            style={{ width: `${pctFavor}%` }}
          />
        )}
        {pctAbstencion > 0 && (
          <div
            className="bg-[#d97706] transition-all"
            style={{ width: `${pctAbstencion}%` }}
          />
        )}
        {pctContra > 0 && (
          <div
            className="bg-[#dc2626] transition-all"
            style={{ width: `${pctContra}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[#8b949e]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16a34a] inline-block" />
          A favor: {votacion.votos_favor}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#d97706] inline-block" />
          Abstencions: {votacion.abstenciones}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block" />
          En contra: {votacion.votos_contra}
        </span>
      </div>
    </div>
  );
}
