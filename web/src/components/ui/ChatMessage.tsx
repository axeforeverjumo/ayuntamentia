'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ChatMessage as ChatMessageType } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-[#2563eb]'
            : 'bg-[#1c2128] border border-[#30363d]',
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-[#8b949e]" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm',
            isUser
              ? 'bg-[#2563eb] text-white rounded-tr-sm'
              : 'bg-[#161b22] border border-[#30363d] text-[#e6edf3] rounded-tl-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-[#6e7681] mb-1.5 font-medium">
              Fonts consultades:
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, i) => (
                <a
                  key={`${source.municipio}-${source.fecha}-${i}`}
                  href={`/buscar?q=${encodeURIComponent(source.titulo || source.municipio || '')}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
                    'bg-[#1c2128] border border-[#30363d] text-[#8b949e]',
                    'hover:border-[#484f58] hover:text-[#e6edf3] transition-colors',
                  )}
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {source.titulo || source.tema || 'Acta'}
                    {source.municipio && ` · ${source.municipio}`}
                    {source.fecha && ` (${source.fecha})`}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#6e7681]">
          {formatDateShort(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
