"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Loader2, Sparkles, MessageSquare,
  Plus, Trash2,
} from "lucide-react";
import { ChatMessage } from "@/components/ui/ChatMessage";
import { ProgressiveLoader } from "@/components/ui/ProgressiveLoader";
import { PoliticalModes } from "@/components/ui/PoliticalModes";
import { apiClient } from "@/lib/ApiClient";
import type { ChatMessage as ChatMessageType, ChatResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageType[];
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ayuntamentia_chats");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem("ayuntamentia_chats", JSON.stringify(convs));
}

function titleFromMessage(msg: string): string {
  return msg.length > 40 ? msg.slice(0, 40) + "..." : msg;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId);
  const messages = activeConv?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  const updateConversation = (id: string, msgs: ChatMessageType[], title?: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, messages: msgs, updatedAt: new Date().toISOString(), ...(title ? { title } : {}) }
          : c
      );
      saveConversations(updated);
      return updated;
    });
  };

  const newConversation = () => {
    const conv: Conversation = {
      id: generateId(),
      title: "Nova conversa",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => {
      const updated = [conv, ...prev];
      saveConversations(updated);
      return updated;
    });
    setActiveId(conv.id);
    setError(null);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      return updated;
    });
    if (activeId === id) {
      setActiveId(conversations.length > 1 ? conversations.find((c) => c.id !== id)?.id || null : null);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    let convId = activeId;
    // Create conversation if none active
    if (!convId) {
      const conv: Conversation = {
        id: generateId(),
        title: titleFromMessage(content),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => {
        const updated = [conv, ...prev];
        saveConversations(updated);
        return updated;
      });
      convId = conv.id;
      setActiveId(convId);
    }

    const userMsg: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentMsgs = conversations.find((c) => c.id === convId)?.messages || [];
    const newMsgs = [...currentMsgs, userMsg];
    const isFirst = currentMsgs.length === 0;
    updateConversation(convId, newMsgs, isFirst ? titleFromMessage(content) : undefined);

    setInput("");
    setIsLoading(true);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const history = currentMsgs.map((m) => ({ role: m.role, content: m.content }));
      const response = await apiClient.post<ChatResponse>("/api/chat/", {
        message: content.trim(),
        history,
      });

      const assistantMsg: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        followUps: response.follow_ups,
        intent: response.intent,
        timestamp: new Date().toISOString(),
      };

      updateConversation(convId, [...newMsgs, assistantMsg]);
    } catch {
      setError("No s'ha pogut connectar amb el servidor.");
      updateConversation(convId, currentMsgs); // rollback
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-screen relative">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#7c3aed] opacity-[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#06b6d4] opacity-[0.05] blur-[120px]" />
      </div>

      {/* Sidebar - conversation history */}
      <div className="w-64 border-r border-[#21262d] bg-[#0a0d12]/80 backdrop-blur-sm flex flex-col relative z-10">
        <div className="p-3">
          <button
            onClick={newConversation}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl",
              "bg-gradient-to-r from-[#1a0b2e]/50 to-[#0a1e26]/50",
              "border border-[#7c3aed]/30 text-[#c4b5fd]",
              "hover:border-[#7c3aed]/60 hover:from-[#1a0b2e] hover:to-[#0a1e26] hover:text-[#e6edf3]",
              "transition-all duration-200",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#6e7681] text-center py-8 px-3">
              Encara no hi ha converses
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                  activeId === conv.id
                    ? "bg-gradient-to-r from-[#1a0b2e]/60 to-[#0a1e26]/60 text-[#e6edf3] border-l-2 border-[#7c3aed]"
                    : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
                )}
                onClick={() => { setActiveId(conv.id); setError(null); }}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{conv.title}</p>
                  <p className="text-[10px] text-[#6e7681]">
                    {conv.messages.length} missatges
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#f87171] transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0a0d12]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-[#7c3aed]/30 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#7c3aed]/10 to-[#06b6d4]/10 blur-md" />
              <Sparkles className="w-4 h-4 text-[#c4b5fd] relative" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
                {activeConv?.title || "AyuntamentIA"}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#052e16] border border-[#16a34a]/30 text-[9px] font-semibold uppercase tracking-wider text-[#4ade80]">
                  <span className="w-1 h-1 rounded-full bg-[#4ade80] animate-pulse" />
                  Live
                </span>
              </h1>
              <p className="text-[11px] text-[#8b949e]">
                Intel·ligència política · 947 municipis de Catalunya
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] blur-2xl opacity-40" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1a0b2e] to-[#0a1e26] border border-[#7c3aed]/40 flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-[#c4b5fd]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#c4b5fd] via-[#f3f6fa] to-[#67e8f9] bg-clip-text text-transparent mb-2">
                L'arma política d'Aliança Catalana
              </h2>
              <p className="text-sm text-[#8b949e] leading-relaxed mb-6 max-w-md">
                Tria el mode. Pregunta com un polític: ataca rivals, defensa posicions,
                compara partits o detecta oportunitats — sobre dades reals de 947 municipis.
              </p>
              <PoliticalModes onAsk={sendMessage} disabled={isLoading} />
              <p className="text-[10px] text-[#6e7681] mt-5">
                O escriu la teva pregunta sota 👇
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onFollowUp={sendMessage}
                  followUpDisabled={isLoading}
                />
              ))}
              {isLoading && <ProgressiveLoader />}
              {error && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#450a0a] to-[#2a0a0a] border border-[#dc2626]/40">
                  <MessageSquare className="w-4 h-4 text-[#f87171] flex-shrink-0" />
                  <p className="text-sm text-[#fca5a5]">{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#21262d] bg-[#0a0d12]/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "flex items-end gap-3 p-3 rounded-2xl border transition-all relative",
              "bg-gradient-to-br from-[#0f141b] to-[#161b22]",
              "border-[#21262d] focus-within:border-[#7c3aed]/50",
              "focus-within:shadow-[0_0_32px_-8px_rgba(124,58,237,0.35)]",
            )}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = textareaRef.current;
                  if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre política municipal…"
                rows={1}
                className="flex-1 bg-transparent text-[13px] text-[#f3f6fa] placeholder:text-[#6e7681] resize-none focus:outline-none leading-relaxed"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                  input.trim() && !isLoading
                    ? "bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white hover:from-[#8b5cf6] hover:to-[#22d3ee] shadow-lg shadow-[#7c3aed]/30"
                    : "bg-[#1c2128] text-[#6e7681] cursor-not-allowed",
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-[#6e7681] mt-2 text-center">
              <kbd className="px-1 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-[9px]">Enter</kbd> enviar ·{" "}
              <kbd className="px-1 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-[9px]">Shift+Enter</kbd> nova línia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
