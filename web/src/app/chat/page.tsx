"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, RotateCcw, Loader2, Sparkles, MessageSquare,
  Plus, Trash2, Clock,
} from "lucide-react";
import { ChatMessage } from "@/components/ui/ChatMessage";
import { apiClient } from "@/lib/ApiClient";
import type { ChatMessage as ChatMessageType, ChatResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTION_CHIPS = [
  "Què s'ha aprovat recentment a Ripoll?",
  "Com vota Aliança Catalana?",
  "Quins temes es debaten més als plens?",
  "Pressupostos aprovats a Ripoll",
  "Resum de l'activitat municipal recent",
  "Mocions sobre urbanisme",
];

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

  const isEmpty = messages.length === 0 && !activeId;

  return (
    <div className="flex h-screen">
      {/* Sidebar - conversation history */}
      <div className="w-64 border-r border-[#21262d] bg-[#0d1117] flex flex-col">
        <div className="p-3">
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-colors"
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
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  activeId === conv.id
                    ? "bg-[#161b22] text-[#e6edf3]"
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#8b949e]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#e6edf3]">
                {activeConv?.title || "Chat IA"}
              </h1>
              <p className="text-xs text-[#8b949e]">
                Intel·ligència política municipal
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-[#2563eb]" />
              </div>
              <h2 className="text-lg font-bold text-[#e6edf3] mb-2">Com puc ajudar-te?</h2>
              <p className="text-sm text-[#8b949e] leading-relaxed mb-8">
                Pregunta sobre actes, votacions o qualsevol aspecte dels plens municipals.
              </p>
              <div className="w-full grid grid-cols-2 gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="px-3 py-2.5 text-xs text-left rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3] transition-all"
                  >
                    {chip}
                  </button>
                ))}
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
                      <span className="text-xs text-[#8b949e]">Generant resposta...</span>
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

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#21262d] bg-[#0d1117]">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "flex items-end gap-3 p-3 rounded-xl border transition-colors",
              "bg-[#161b22] border-[#30363d] focus-within:border-[#2563eb]",
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
                placeholder="Fes una pregunta sobre els plens municipals..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder:text-[#6e7681] resize-none focus:outline-none leading-relaxed"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim() && !isLoading
                    ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                    : "bg-[#1c2128] text-[#6e7681] cursor-not-allowed",
                )}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-[#6e7681] mt-2 text-center">
              Enter per enviar · Shift+Enter per nova línia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
