'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  RotateCcw,
  Loader2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { ChatMessage } from '@/components/ui/ChatMessage';
import { apiClient } from '@/lib/ApiClient';
import type { ChatMessage as ChatMessageType, ChatResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

const SUGGESTION_CHIPS = [
  "Quines votacions hi ha hagut sobre habitatge aquest any?",
  "Mostra'm els temes més debatuts a Barcelona",
  "Qui ha votat contra la línia del seu partit?",
  "Resum de l'activitat municipal de la setmana",
  "Quins municipis han aprovat nous pressupostos?",
  "Alertes de coherència actives",
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiClient.post<ChatResponse>('/api/chat/', {
        message: content.trim(),
        history,
      });

      const assistantMessage: ChatMessageType = {
        id: generateId(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError(
        'No s\'ha pogut connectar amb el servidor. Torna-ho a intentar.',
      );
      // Remove the user message that failed
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#8b949e]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#e6edf3]">Chat IA</h1>
            <p className="text-xs text-[#8b949e]">
              Intel·ligència política municipal
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Nova conversa
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-[#2563eb]" />
            </div>
            <h2 className="text-lg font-bold text-[#e6edf3] mb-2">
              Com puc ajudar-te?
            </h2>
            <p className="text-sm text-[#8b949e] leading-relaxed mb-8">
              Pregunta sobre actes, votacions, concejals o qualsevol
              aspecte de l&apos;activitat municipal a Catalunya.
            </p>

            <div className="w-full space-y-2">
              <p className="text-xs text-[#6e7681] font-medium text-left mb-2">
                Suggeriments:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="px-3 py-2.5 text-xs text-left rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3] hover:bg-[#1c2128] transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-[#8b949e]" />
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-[#8b949e] animate-spin" />
                    <span className="text-xs text-[#8b949e]">
                      Generant resposta...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#450a0a] border border-[#7f1d1d]">
                <MessageSquare className="w-4 h-4 text-[#f87171] flex-shrink-0" />
                <p className="text-sm text-[#f87171]">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-[#21262d] bg-[#0d1117]">
        <div className="max-w-3xl mx-auto">
          <div
            className={cn(
              'flex items-end gap-3 p-3 rounded-xl border transition-colors',
              'bg-[#161b22] border-[#30363d]',
              'focus-within:border-[#2563eb]',
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Fes una pregunta sobre els plens municipals..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder:text-[#6e7681] resize-none focus:outline-none leading-relaxed"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                input.trim() && !isLoading
                  ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                  : 'bg-[#1c2128] text-[#6e7681] cursor-not-allowed',
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-[#6e7681] mt-2 text-center">
            Prem Enter per enviar · Shift+Enter per nova línia
          </p>
        </div>
      </div>
    </div>
  );
}
