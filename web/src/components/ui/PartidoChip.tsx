'use client';

import { cn } from '@/lib/utils';

type PartidoKey =
  | 'AC' | 'ERC' | 'JXCAT' | 'PSC' | 'CUP' | 'PP' | 'VOX' | 'CS' | 'COMUNS' | 'INDEP';

interface PaletteEntry {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const PALETTE: Record<PartidoKey, PaletteEntry> = {
  AC:     { label: 'AC',     bg: 'bg-[#2a1608]', border: 'border-[#c2410c]/60', text: 'text-[#fdba74]', dot: 'bg-[#f97316]' },
  ERC:    { label: 'ERC',    bg: 'bg-[#2a2208]', border: 'border-[#ca8a04]/60', text: 'text-[#fde047]', dot: 'bg-[#eab308]' },
  JXCAT:  { label: 'JxCat',  bg: 'bg-[#0a1930]', border: 'border-[#1e40af]/60', text: 'text-[#93c5fd]', dot: 'bg-[#3b82f6]' },
  PSC:    { label: 'PSC',    bg: 'bg-[#2a0a0a]', border: 'border-[#b91c1c]/60', text: 'text-[#fca5a5]', dot: 'bg-[#ef4444]' },
  CUP:    { label: 'CUP',    bg: 'bg-[#2a1f04]', border: 'border-[#a16207]/60', text: 'text-[#fcd34d]', dot: 'bg-[#d97706]' },
  PP:     { label: 'PP',     bg: 'bg-[#071129]', border: 'border-[#1e3a8a]/60', text: 'text-[#93c5fd]', dot: 'bg-[#1d4ed8]' },
  VOX:    { label: 'VOX',    bg: 'bg-[#052e16]', border: 'border-[#15803d]/60', text: 'text-[#86efac]', dot: 'bg-[#16a34a]' },
  CS:     { label: 'Cs',     bg: 'bg-[#2a1608]', border: 'border-[#ea580c]/50', text: 'text-[#fed7aa]', dot: 'bg-[#fb923c]' },
  COMUNS: { label: 'Comuns', bg: 'bg-[#1a0b2e]', border: 'border-[#7c3aed]/60', text: 'text-[#c4b5fd]', dot: 'bg-[#8b5cf6]' },
  INDEP:  { label: 'Indep.', bg: 'bg-[#1c2128]', border: 'border-[#484f58]/60', text: 'text-[#c9d1d9]', dot: 'bg-[#8b949e]' },
};

export function normalizePartido(raw: string): PartidoKey {
  const s = (raw || '').toUpperCase().trim();
  if (/ALIAN[ÇC]A|^AC($|[-\s])|ALIANCA/.test(s)) return 'AC';
  if (/JUNTS|JXCAT|JXC|CONVERG|^CIU$/.test(s)) return 'JXCAT';
  if (/ERC/.test(s) && !/ERC-AC/.test(s)) return 'ERC';
  if (/PSC|PSOE/.test(s)) return 'PSC';
  if (/CUP/.test(s)) return 'CUP';
  if (/VOX/.test(s)) return 'VOX';
  if (/CIUDAD|CIUTAD|^CS$|^C'S$/.test(s)) return 'CS';
  if (/COMÚ|COMU|ECP|ICV/.test(s)) return 'COMUNS';
  if (/^PP($|[-\s])/.test(s)) return 'PP';
  return 'INDEP';
}

interface PartidoChipProps {
  partido: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function PartidoChip({ partido, size = 'sm', className }: PartidoChipProps) {
  const key = normalizePartido(partido);
  const p = PALETTE[key];

  const sizeClass =
    size === 'xs'
      ? 'px-1.5 py-0 text-[10px] gap-1'
      : size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[11px] gap-1.5';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border',
        p.bg, p.border, p.text, sizeClass, className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
      {p.label}
    </span>
  );
}

/** Detecta partidos mencionados en un string (útil para resaltar en markdown). */
export function detectPartidos(text: string): PartidoKey[] {
  const found = new Set<PartidoKey>();
  const patterns: Array<[RegExp, PartidoKey]> = [
    [/\b(aliança catalana|ALIANÇA|AC)\b/gi, 'AC'],
    [/\b(junts|jxcat|jxc|convergència)\b/gi, 'JXCAT'],
    [/\bERC\b/g, 'ERC'],
    [/\b(PSC|PSOE)\b/g, 'PSC'],
    [/\bCUP\b/g, 'CUP'],
    [/\bVOX\b/g, 'VOX'],
    [/\b(ciudadanos|ciutadans|Cs)\b/gi, 'CS'],
    [/\b(comuns|en comú|ECP|ICV)\b/gi, 'COMUNS'],
    [/\bPP\b/g, 'PP'],
  ];
  for (const [re, key] of patterns) {
    if (re.test(text)) found.add(key);
  }
  return Array.from(found);
}
