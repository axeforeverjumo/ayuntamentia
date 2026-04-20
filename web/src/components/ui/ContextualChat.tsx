'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

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
          width: 52, height: 52, borderRadius: 0,
          background: 'var(--wr-red)', border: '1px solid var(--wr-red)',
          color: 'var(--paper)', cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 28px -6px rgba(255,90,60,.6)',
        }}
        title={`Preguntar sobre ${contextLabel}`}
      >
        <MessageSquare size={22} />
      </button>

      {/* Slide-in panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: 380, background: 'var(--ink-2)', borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,.4)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--line)',
          background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
              letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 2,
            }}>
              War Room · Context
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--paper)',
              fontWeight: 700, letterSpacing: '.04em', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {contextLabel}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
              width: 30, height: 30, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="thin-scroll" style={{ flex: 1, overflow: 'auto', padding: '16px 14px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)',
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16,
              }}>
                Preguntes sobre {contextLabel}
              </div>
              {[
                'Quins temes es debaten més?',
                "Quin és l'historial de votacions?",
                'Hi ha regidors amb divergències notables?',
              ].map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  display: 'block', width: '100%', padding: '8px 12px', marginBottom: 6,
                  background: 'transparent', border: '1px dashed var(--line)',
                  color: 'var(--bone)', fontFamily: 'var(--font-sans)', fontSize: 12,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  → {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {msg.role === 'user' ? (
                <div style={{
                  background: 'var(--paper)', color: 'var(--ink)',
                  padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{
                  background: 'transparent', color: 'var(--paper)',
                  padding: '10px 14px 10px 0', fontSize: 14, lineHeight: 1.6,
                  fontFamily: 'var(--font-serif)', borderLeft: '2px solid var(--wr-red)',
                  paddingLeft: 12,
                }}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: 'var(--fog)' }}>
              <Loader2 size={13} className="animate-spin" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em' }}>
                PROCESSANT...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px' }}>
          <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            background: 'var(--ink)', border: '1px solid var(--line)',
            borderTop: '3px solid var(--wr-red)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pregunta sobre aquest municipi..."
              disabled={loading}
              style={{
                background: 'transparent', border: 'none', color: 'var(--paper)',
                padding: '12px 14px', fontSize: 13, fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                background: loading ? 'var(--ink-4)' : 'var(--wr-red)',
                color: 'var(--paper)', border: 'none', padding: '0 14px',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                opacity: !input.trim() || loading ? 0.4 : 1,
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : 'Disparar →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
