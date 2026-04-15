'use client';

import { Swords, Shield, Scale, Lightbulb, Radar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PoliticalMode = 'atacar' | 'defender' | 'comparar' | 'oportunidad' | 'monitor';

interface ModeCard {
  id: PoliticalMode;
  label: string;
  description: string;
  icon: typeof Swords;
  gradient: string;
  border: string;
  iconColor: string;
  accentBg: string;
  questions: string[];
}

const MODES: ModeCard[] = [
  {
    id: 'monitor',
    label: 'Monitoritzar',
    description: 'Què es diu d\'un partit o tema',
    icon: Radar,
    gradient: 'from-[#052e16] via-[#0a1e26] to-[#0d1117]',
    border: 'border-[#16a34a]/40',
    iconColor: 'text-[#4ade80]',
    accentBg: 'bg-[#16a34a]',
    questions: [
      "Què s'ha dit d'Aliança Catalana aquest mes?",
      "Tot sobre ERC al març 2026",
      "Activitat de Junts aquesta setmana",
      "Què han parlat del PSC els últims 60 dies?",
    ],
  },
  {
    id: 'atacar',
    label: 'Atacar',
    description: 'Munició contra rivals',
    icon: Swords,
    gradient: 'from-[#2a0a0a] via-[#1f0d14] to-[#0d1117]',
    border: 'border-[#dc2626]/40',
    iconColor: 'text-[#f87171]',
    accentBg: 'bg-[#dc2626]',
    questions: [
      'Dossier complet contra Junts sobre civisme',
      "Contradiccions d'ERC en habitatge aquest any",
      'Votacions polèmiques del PSC en seguretat 2026',
      'Punts dèbils de la CUP en hisenda',
    ],
  },
  {
    id: 'defender',
    label: 'Defensar',
    description: 'Argumentari per AC',
    icon: Shield,
    gradient: 'from-[#0a1930] via-[#0d1b24] to-[#0d1117]',
    border: 'border-[#1e40af]/40',
    iconColor: 'text-[#93c5fd]',
    accentBg: 'bg-[#1e40af]',
    questions: [
      "Com respondre a crítiques d'ERC sobre immigració?",
      "Com defensar el vot d'AC sobre civisme?",
      "Punts forts d'AC en seguretat per rebatre",
      'Dades favorables a AC en habitatge 2026',
    ],
  },
  {
    id: 'comparar',
    label: 'Comparar',
    description: 'Posicionament vs rivals',
    icon: Scale,
    gradient: 'from-[#1a0b2e] via-[#0a1e26] to-[#0d1117]',
    border: 'border-[#7c3aed]/40',
    iconColor: 'text-[#c4b5fd]',
    accentBg: 'bg-[#7c3aed]',
    questions: [
      'ERC vs Junts en immigració 2026',
      'AC vs PSC en ordenances de civisme',
      'Qui vota més a favor de més policia local?',
      'Diferència entre CUP i ERC en habitatge',
    ],
  },
  {
    id: 'oportunidad',
    label: 'Oportunitat',
    description: 'Temes calents sense cobrir',
    icon: Lightbulb,
    gradient: 'from-[#2a1f04] via-[#1f1a0d] to-[#0d1117]',
    border: 'border-[#d97706]/40',
    iconColor: 'text-[#fbbf24]',
    accentBg: 'bg-[#d97706]',
    questions: [
      "On pot créixer AC ara mateix?",
      'Temes calents on rivals estan dividits',
      'Buits comunicatius dels 30 últims dies',
      "Municipis grans sense veu d'AC forta",
    ],
  },
];

interface Props {
  onAsk: (q: string) => void;
  disabled?: boolean;
}

export function PoliticalModes({ onAsk, disabled }: Props) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
      {MODES.map((mode, i) => {
        const Icon = mode.icon;
        const isLastOdd = i === MODES.length - 1 && MODES.length % 2 === 1;
        return (
          <div
            key={mode.id}
            className={cn(
              'relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br',
              mode.gradient, mode.border,
              isLastOdd && 'md:col-span-2',
            )}
          >
            <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-3xl pointer-events-none', mode.accentBg)} />

            <div className="relative flex items-center gap-2.5 mb-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center border',
                'bg-[#0d1117]/60', mode.border,
              )}>
                <Icon className={cn('w-4 h-4', mode.iconColor)} />
              </div>
              <div>
                <h3 className={cn('text-sm font-bold', mode.iconColor)}>
                  {mode.label}
                </h3>
                <p className="text-[10px] text-[#8b949e] -mt-0.5">
                  {mode.description}
                </p>
              </div>
            </div>

            <div className="relative space-y-1.5">
              {mode.questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAsk(q)}
                  className={cn(
                    'group w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-lg text-[11.5px]',
                    'bg-[#0d1117]/40 border border-transparent text-[#c9d1d9]',
                    'hover:border-white/10 hover:bg-[#0d1117]/80 hover:text-[#f3f6fa]',
                    'transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <span className="flex-1 truncate">{q}</span>
                  <ArrowRight className={cn(
                    'w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all',
                    mode.iconColor,
                  )} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const INTENT_META: Record<PoliticalMode | 'consulta', {
  label: string; icon: typeof Swords; color: string; bg: string; border: string;
}> = {
  monitor:    { label: 'Monitor',     icon: Radar,     color: 'text-[#4ade80]', bg: 'bg-[#052e16]', border: 'border-[#16a34a]/40' },
  atacar:     { label: 'Atac',        icon: Swords,    color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]', border: 'border-[#dc2626]/40' },
  defender:   { label: 'Defensa',     icon: Shield,    color: 'text-[#93c5fd]', bg: 'bg-[#0a1930]', border: 'border-[#1e40af]/40' },
  comparar:   { label: 'Comparació',  icon: Scale,     color: 'text-[#c4b5fd]', bg: 'bg-[#1a0b2e]', border: 'border-[#7c3aed]/40' },
  oportunidad:{ label: 'Oportunitat', icon: Lightbulb, color: 'text-[#fbbf24]', bg: 'bg-[#2a1f04]', border: 'border-[#d97706]/40' },
  consulta:   { label: 'Consulta',    icon: Scale,     color: 'text-[#8b949e]', bg: 'bg-[#161b22]', border: 'border-[#30363d]' },
};
