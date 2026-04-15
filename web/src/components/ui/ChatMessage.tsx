'use client';

import { User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ChatMessage as ChatMessageType } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';
import { AssistantAnswerCard } from './AssistantAnswerCard';
import { SourcesGrid } from './SourceCard';
import { FollowUpChips } from './FollowUpChips';

interface ChatMessageProps {
  message: ChatMessageType;
  onFollowUp?: (q: string) => void;
  followUpDisabled?: boolean;
}

export function ChatMessage({ message, onFollowUp, followUpDisabled }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse group">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-[#7c3aed]/20">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col gap-1.5 max-w-[80%] items-end">
          <div
            className={cn(
              'rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed',
              'bg-gradient-to-br from-[#1a0b2e] to-[#0a1e26]',
              'border border-[#7c3aed]/30 text-[#f3f6fa]',
              'shadow-[0_0_24px_-8px_rgba(124,58,237,0.35)]',
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-[10px] text-[#6e7681] px-1">
            {formatDateShort(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-row group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#161b22] to-[#0f141b] border border-[#30363d] flex items-center justify-center relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 opacity-60" />
        <Sparkles className="w-4 h-4 text-[#c4b5fd] relative" />
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[min(720px,calc(100%-3rem))]">
        <AssistantAnswerCard content={message.content} />

        {message.sources && message.sources.length > 0 && (
          <SourcesGrid sources={message.sources} />
        )}

        {onFollowUp && message.followUps && message.followUps.length > 0 && (
          <FollowUpChips
            items={message.followUps}
            onSelect={onFollowUp}
            disabled={followUpDisabled}
          />
        )}

        <p className="text-[10px] text-[#6e7681] px-1">
          {formatDateShort(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
