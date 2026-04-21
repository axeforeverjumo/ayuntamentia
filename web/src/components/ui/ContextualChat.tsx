'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

function simpleMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ContextualChatProps {
  contextType: 'acta' | 'municipi';
  contextId: string;
  contextLabel: string;
  contextPrompt: string;
}

export function ContextualChat({ contextLabel, contextPrompt }: ContextualChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${contextPrompt}\n\nPregunta de l'usuari: ${content.trim()}`,
          history,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sense resposta.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "No s'ha pogut connectar amb el servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          width: 48, height: 48, borderRadius: 'var(--r-full)',
          background: 'var(--brand)', border: 'none',
          color: '#fff', cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(15,76,129,.35)',
        }}
        title={`Preguntar sobre ${contextLabel}`}
      >
        <MessageSquare size={20} strokeWidth={1.5} />
      </button>

      {/* Slide-in panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: 380, background: 'var(--bg-surface)', borderLeft: '.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,.2)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '.5px solid var(--border)',
          background: 'var(--bg-base)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 9.5, color: 'var(--text-meta)',
              letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 3,
            }}>
              Context · Chat
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)',
              fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {contextLabel}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none', border: '.5px solid var(--border)', color: 'var(--text-meta)',
              borderRadius: 'var(--r-sm)', width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>

        {/* Messages */}
        <div className="thin-scroll" style={{ flex: 1, overflow: 'auto', padding: '16px 14px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-meta)',
                letterSpacing: '.04em', marginBottom: 16,
              }}>
                Preguntes sobre {contextLabel}
              </div>
              {[
                'Quins temes es debaten més?',
                "Quin és l'historial de votacions?",
                'Hi ha regidors amb divergències notables?',
              ].map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  display: 'block', width: '100%', padding: '9px 12px', marginBottom: 6,
                  background: 'var(--bg-elevated)', border: '.5px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 12,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    background: 'var(--brand)',
                    borderRadius: '14px 4px 14px 14px',
                    color: '#E8F1F9',
                    padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                    fontFamily: 'var(--font-sans)', maxWidth: '85%',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: '4px 14px 14px 14px',
                    color: 'var(--text-secondary)',
                    padding: '10px 14px', maxWidth: '85%',
                  }}>
                    <div
                      className="markdown-body"
                      style={{ fontSize: 12, lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: 'var(--text-timestamp)' }}>
              <Loader2 size={12} className="animate-spin" strokeWidth={1.5} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.06em' }}>
                processant...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div style={{ borderTop: '.5px solid var(--border)', padding: '10px 14px' }}>
          <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pregunta sobre aquest municipi..."
              disabled={loading}
              style={{
                background: 'var(--bg-elevated)', border: '.5px solid var(--border-em)',
                borderRadius: 'var(--r-md)',
                color: 'var(--text-primary)', padding: '10px 14px',
                fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                background: 'var(--brand)', color: '#fff',
                border: 'none', padding: '0 16px',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12,
                fontWeight: 500,
                opacity: !input.trim() || loading ? 0.4 : 1,
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" strokeWidth={1.5} /> : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
