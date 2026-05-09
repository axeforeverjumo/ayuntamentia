'use client';

import Link from 'next/link';
import {
  Building2, Calendar, FileText, Tag, ArrowUpRight,
  Landmark, Home, Shield, TreePine, HeartPulse, GraduationCap, Bus,
  Euro, Palette, Briefcase, Scale, Users,
} from 'lucide-react';
import type { Source } from '@/lib/types';
import { APP_ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const TEMA_STYLES: Record<string, { icon: typeof Building2; color: string; bg: string; border: string }> = {
  urbanismo:          { icon: Home,           color: 'text-[#fbbf24]', bg: 'bg-[#2a1f04]', border: 'border-[#d97706]/30' },
  hacienda:           { icon: Euro,           color: 'text-[#4ade80]', bg: 'bg-[#052e16]', border: 'border-[#16a34a]/30' },
  seguridad:          { icon: Shield,         color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]', border: 'border-[#dc2626]/30' },
  medio_ambiente:     { icon: TreePine,       color: 'text-[#86efac]', bg: 'bg-[#052e16]', border: 'border-[#15803d]/30' },
  cultura:            { icon: Palette,        color: 'text-[#c4b5fd]', bg: 'bg-[#1a0b2e]', border: 'border-[#7c3aed]/30' },
  transporte:         { icon: Bus,            color: 'text-[#67e8f9]', bg: 'bg-[#0a1e26]', border: 'border-[#06b6d4]/30' },
  servicios_sociales: { icon: Users,          color: 'text-[#fca5a5]', bg: 'bg-[#2a0a0a]', border: 'border-[#be123c]/30' },
  vivienda:           { icon: Home,           color: 'text-[#fed7aa]', bg: 'bg-[#2a1608]', border: 'border-[#ea580c]/30' },
  educacion:          { icon: GraduationCap,  color: 'text-[#93c5fd]', bg: 'bg-[#0a1930]', border: 'border-[#1e40af]/30' },
  salud:              { icon: HeartPulse,     color: 'text-[#fca5a5]', bg: 'bg-[#2a0a0a]', border: 'border-[#b91c1c]/30' },
  comercio:           { icon: Briefcase,      color: 'text-[#fde047]', bg: 'bg-[#2a2208]', border: 'border-[#ca8a04]/30' },
  mociones:           { icon: Scale,          color: 'text-[#c4b5fd]', bg: 'bg-[#1a0b2e]', border: 'border-[#8b5cf6]/30' },
  procedimiento:      { icon: FileText,       color: 'text-[#8b949e]', bg: 'bg-[#161b22]', border: 'border-[#30363d]' },
};

const DEFAULT_STYLE = { icon: Landmark, color: 'text-[#8b949e]', bg: 'bg-[#161b22]', border: 'border-[#30363d]' };

function formatFechaLarga(fecha?: string): string {
  if (!fecha) return '';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return fecha;
  }
}

interface SourceCardProps {
  source: Source;
}

export function SourceCard({ source }: SourceCardProps) {
  const temaKey = (source.tema || '').toLowerCase().replace(/\s+/g, '_');
  const style = TEMA_STYLES[temaKey] || DEFAULT_STYLE;
  const Icon = style.icon;

  const titulo = source.titulo || source.tema || 'Acta';
  const href = `${APP_ROUTES.cercar}?q=${encodeURIComponent(source.municipio || titulo || '')}`;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-start gap-2.5 p-2.5 rounded-xl border',
        'bg-[#0f141b] border-[#21262d]',
        'hover:bg-[#161b22] hover:border-[#484f58]',
        'transition-all duration-200',
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border',
        style.bg, style.border,
      )}>
        <Icon className={cn('w-3.5 h-3.5', style.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#e6edf3] truncate leading-snug">
          {titulo}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#8b949e]">
          {source.municipio && (
            <span className="inline-flex items-center gap-1 max-w-[120px] truncate">
              <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{source.municipio}</span>
            </span>
          )}
          {source.fecha && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
              {formatFechaLarga(source.fecha)}
            </span>
          )}
          {source.tema && source.tema !== 'procedimiento' && (
            <span className={cn('inline-flex items-center gap-1', style.color)}>
              <Tag className="w-2.5 h-2.5 flex-shrink-0" />
              {source.tema.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <ArrowUpRight className="w-3 h-3 text-[#484f58] group-hover:text-[#c9d1d9] flex-shrink-0 transition-colors mt-0.5" />
    </Link>
  );
}

interface SourcesGridProps {
  sources: Source[];
}

export function SourcesGrid({ sources }: SourcesGridProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="w-full mt-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#30363d] to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6e7681]">
          {sources.length} {sources.length === 1 ? 'font' : 'fonts'} consultades
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#30363d] to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((s, i) => (
          <SourceCard key={`${s.municipio}-${s.fecha}-${i}`} source={s} />
        ))}
      </div>
    </div>
  );
}
