'use client';

import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PartidoChip, detectPartidos, normalizePartido } from './PartidoChip';

type Verdict = 'positive' | 'neutral' | 'negative';

interface ParsedAnswer {
  verdict: string;
  points: string;
  nextStep: string;
  rest: string;
  verdictTone: Verdict;
  detectedPartidos: ReturnType<typeof detectPartidos>;
}

const SECTION_PATTERNS: Record<keyof Omit<ParsedAnswer, 'verdictTone' | 'detectedPartidos'>, RegExp[]> = {
  verdict: [/^##\s*(Veredicto|Veredicte)\s*\n/im],
  points: [/^##\s*(Punts clau|Puntos clave|Punts|Puntos)\s*\n/im],
  nextStep: [/^##\s*(I ara què\??|Y ahora qué\??|Ara què\??|Ahora qué\??)\s*\n/im],
  rest: [],
};

function splitSections(content: string): ParsedAnswer {
  const txt = (content || '').trim();
  const indices: Array<{ key: keyof ParsedAnswer; idx: number; headerLen: number }> = [];

  for (const [key, patterns] of Object.entries(SECTION_PATTERNS) as Array<[
    keyof ParsedAnswer, RegExp[]
  ]>) {
    if (key === 'rest' || key === 'verdictTone' || key === 'detectedPartidos') continue;
    for (const re of patterns) {
      const m = re.exec(txt);
      if (m) {
        indices.push({ key, idx: m.index, headerLen: m[0].length });
        break;
      }
    }
  }

  indices.sort((a, b) => a.idx - b.idx);

  const sections: Record<string, string> = { verdict: '', points: '', nextStep: '', rest: '' };

  if (indices.length === 0) {
    sections.rest = txt;
  } else {
    const firstIdx = indices[0].idx;
    if (firstIdx > 0) sections.rest = txt.slice(0, firstIdx).trim();
    for (let i = 0; i < indices.length; i++) {
      const { key, idx, headerLen } = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1].idx : txt.length;
      sections[key] = txt.slice(idx + headerLen, end).trim();
    }
  }

  return {
    verdict: sections.verdict,
    points: sections.points,
    nextStep: sections.nextStep,
    rest: sections.rest,
    verdictTone: detectTone(sections.verdict || sections.rest),
    detectedPartidos: detectPartidos(txt),
  };
}

function detectTone(verdict: string): Verdict {
  const t = verdict.toLowerCase();
  if (/no hi ha|no hay|sense evidència|sin evidencia|no consta|no es pot|no se puede|0 result/i.test(t))
    return 'negative';
  if (/risc|riesgo|atenció|atención|advertència|advertencia|incoheren|contradicc/i.test(t))
    return 'neutral';
  return 'positive';
}

const TONE_STYLES: Record<Verdict, { bg: string; border: string; icon: typeof CheckCircle2; iconClass: string; glow: string }> = {
  positive: {
    bg: 'bg-gradient-to-br from-[#0f2a1f] via-[#0d1f1a] to-[#0d1117]',
    border: 'border-[#16a34a]/40',
    icon: CheckCircle2,
    iconClass: 'text-[#4ade80]',
    glow: 'shadow-[0_0_40px_-10px_rgba(22,163,74,0.35)]',
  },
  neutral: {
    bg: 'bg-gradient-to-br from-[#2a1f08] via-[#1f1a0d] to-[#0d1117]',
    border: 'border-[#d97706]/40',
    icon: AlertTriangle,
    iconClass: 'text-[#fbbf24]',
    glow: 'shadow-[0_0_40px_-10px_rgba(217,119,6,0.35)]',
  },
  negative: {
    bg: 'bg-gradient-to-br from-[#2a0a0a] via-[#1f0d14] to-[#0d1117]',
    border: 'border-[#dc2626]/40',
    icon: XCircle,
    iconClass: 'text-[#f87171]',
    glow: 'shadow-[0_0_40px_-10px_rgba(220,38,38,0.35)]',
  },
};

interface Props {
  content: string;
}

/** Markdown components shared by todas las secciones. */
function useMarkdownComponents(): Components {
  return useMemo<Components>(() => {
    const partyRegex = /\b(AC|ERC|JxCat|JXCAT|Junts|PSC|CUP|PP|VOX|Cs|Comuns)\b/g;

    function renderWithParties(children: React.ReactNode): React.ReactNode {
      if (typeof children !== 'string') return children;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      const re = new RegExp(partyRegex.source, partyRegex.flags);
      while ((m = re.exec(children)) !== null) {
        if (m.index > last) parts.push(children.slice(last, m.index));
        parts.push(
          <PartidoChip
            key={`p-${m.index}`}
            partido={m[0]}
            size="xs"
            className="mx-0.5 translate-y-[-1px]"
          />
        );
        last = m.index + m[0].length;
      }
      if (last < children.length) parts.push(children.slice(last));
      return parts.length ? parts : children;
    }

    return {
      p: ({ children }) => <p className="my-1.5 leading-relaxed">{renderWithParties(children as React.ReactNode)}</p>,
      strong: ({ children }) => {
        if (typeof children === 'string') {
          const key = normalizePartido(children);
          if (key !== 'INDEP') {
            return <PartidoChip partido={children} size="xs" className="mx-0.5 translate-y-[-1px]" />;
          }
          return <strong className="font-semibold text-[#f3f6fa]">{children}</strong>;
        }
        return <strong className="font-semibold text-[#f3f6fa]">{children}</strong>;
      },
      em: ({ children }) => <em className="text-[#a5b1c2] italic">{children}</em>,
      ul: ({ children }) => <ul className="space-y-1.5 my-2">{children}</ul>,
      ol: ({ children }) => <ol className="space-y-1.5 my-2 list-decimal pl-5">{children}</ol>,
      li: ({ children }) => (
        <li className="flex gap-2 text-[13px] leading-relaxed pl-0">
          <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4]" />
          <span className="flex-1">{renderWithParties(children as React.ReactNode)}</span>
        </li>
      ),
      code: ({ children }) => (
        <code className="px-1.5 py-0.5 rounded-md bg-[#1c2128] border border-[#30363d] text-[#a5b1c2] text-[12px] font-mono">
          {children}
        </code>
      ),
      a: ({ children, href }) => (
        <a href={href} className="text-[#60a5fa] hover:text-[#93c5fd] underline underline-offset-2">
          {children}
        </a>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-[#7c3aed]/60 pl-3 my-2 italic text-[#a5b1c2]">
          {children}
        </blockquote>
      ),
    };
  }, []);
}

export function AssistantAnswerCard({ content }: Props) {
  const parsed = useMemo(() => splitSections(content), [content]);
  const mdComponents = useMarkdownComponents();

  const hasSections = parsed.verdict || parsed.points || parsed.nextStep;

  if (!hasSections) {
    return (
      <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 text-[13px] text-[#e6edf3]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {parsed.rest || content}
        </ReactMarkdown>
      </div>
    );
  }

  const tone = TONE_STYLES[parsed.verdictTone];
  const VerdictIcon = tone.icon;

  return (
    <div className="space-y-3 w-full max-w-full">
      {parsed.rest && (
        <div className="rounded-xl border border-[#21262d] bg-[#0f141b] p-3 text-[13px] text-[#a5b1c2]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {parsed.rest}
          </ReactMarkdown>
        </div>
      )}

      {parsed.verdict && (
        <div
          className={cn(
            'rounded-2xl border p-4 relative overflow-hidden',
            tone.bg, tone.border, tone.glow,
          )}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"
               style={{ background: parsed.verdictTone === 'positive' ? '#16a34a' : parsed.verdictTone === 'neutral' ? '#d97706' : '#dc2626' }} />
          <div className="flex items-start gap-3 relative">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-xl bg-[#0d1117]/60 border border-white/5 flex items-center justify-center',
            )}>
              <VerdictIcon className={cn('w-4 h-4', tone.iconClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b949e]">
                  Veredicte
                </span>
                {parsed.detectedPartidos.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {parsed.detectedPartidos.slice(0, 4).map((k) => (
                      <PartidoChip key={k} partido={k} size="xs" />
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[14px] text-[#f3f6fa] leading-relaxed font-medium">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {parsed.verdict}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {parsed.points && (
        <div className="rounded-2xl border border-[#30363d] bg-gradient-to-br from-[#161b22] to-[#0f141b] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-[0.08] bg-[#7c3aed] -translate-y-1/2 pointer-events-none" />
          <div className="flex items-center gap-2 mb-3 relative">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-[#7c3aed]/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#c4b5fd]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b949e]">
              Punts clau
            </span>
          </div>
          <div className="text-[13px] text-[#e6edf3] relative">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {parsed.points}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {parsed.nextStep && (
        <div className="rounded-2xl border border-[#06b6d4]/30 bg-gradient-to-br from-[#0a1e26] via-[#0d1b24] to-[#0d1117] p-4 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(6,182,212,0.25)]">
          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-[#06b6d4] translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[#06b6d4]/20 to-[#7c3aed]/20 border border-[#06b6d4]/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#67e8f9]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#67e8f9]">
                  I ara què?
                </span>
                <ArrowRight className="w-3 h-3 text-[#67e8f9]" />
              </div>
              <div className="text-[13px] text-[#e6edf3] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {parsed.nextStep}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
