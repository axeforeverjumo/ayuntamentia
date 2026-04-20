'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Trash2, Plus, BookmarkPlus } from 'lucide-react';
import { ChatMessage } from '@/components/ui/ChatMessage';
import { ProgressiveLoader } from '@/components/ui/ProgressiveLoader';
import { SaveToWorkspaceModal } from '@/components/ui/SaveToWorkspaceModal';
import { apiClient } from '@/lib/ApiClient';
import { CLIENT_CONFIG } from '@/lib/clientConfig';
import type { ChatMessage as ChatMessageType, ChatResponse } from '@/lib/types';
import type { WorkspaceMode } from '@/lib/workspaceStorage';
import { PageHeader } from '@/components/warroom/PageHeader';
import { HelpBanner } from '@/components/warroom/HelpBanner';
import { StatusBadge, LiveDot, StatusLine } from '@/components/warroom/StatusBadge';
import { Gauge, DotGrid, CornerBrack } from '@/components/landing/primitives';

const MODES = [
  { id: 'monitor', label: 'Monitor', color: 'var(--wr-phosphor)', hint: 'Què es diu de...', icon: '◉' },
  { id: 'atacar', label: 'Atacar', color: 'var(--wr-red-2)', hint: 'Munició contra rivals', icon: '◎' },
  { id: 'defensar', label: 'Defensar', color: '#93c5fd', hint: 'Argumentari pel partit', icon: '◇' },
  { id: 'netejar', label: 'Netejar', color: '#ff5a3c', hint: 'Reparar reputació', icon: '◼' },
  { id: 'comparar', label: 'Comparar', color: '#c4b5fd', hint: 'Posició vs rivals', icon: '⬡' },
  { id: 'oportunitat', label: 'Oportunitat', color: 'var(--wr-amber)', hint: "Forats d'agenda", icon: '◆' },
] as const;

const SEEDS: Record<string, string[]> = {
  monitor: ['Què ha dit el PP sobre habitatge el darrer mes?', 'Posicionament JxCat en seguretat', 'Evolució tema soroll nocturn 60 dies'],
  atacar: ['Dossier contradiccions PP · civisme', 'Promeses trencades PSC a Terrassa', 'Contradiccions ERC BES parlament vs municipal'],
  defensar: ['Com defensar el nostre vot sobre ordenança civisme?', 'Argumentari fiscalitat comercial', 'Resposta a acusació de transfuguisme'],
  netejar: ['Estratègia per neutralitzar cobertura negativa sobre AC', 'Narratives alternatives davant crítiques de civisme', 'Pla 72h davant atac mediàtic'],
  comparar: ['PP vs JxCat en urbanisme 2026', 'Dades votació habitatge · tots els partits', 'Qui ha proposat més sobre seguretat?'],
  oportunitat: ['On pot créixer el partit ara?', "Forats d'agenda sense cobrir · comarques altes", 'Temes amb menció ciutadana alta i 0 debats'],
};

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageType[];
  createdAt: string;
  updatedAt: string;
}

function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('ayuntamentia_chats') || '[]'); } catch { return []; }
}
function saveConversations(convs: Conversation[]) { localStorage.setItem('ayuntamentia_chats', JSON.stringify(convs)); }

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--fog)', padding: 24 }}>Carregant War Room…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('monitor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveTarget, setSaveTarget] = useState<{ message: ChatMessageType; query: string } | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const autoFiredRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    const qMode = searchParams.get('mode');
    if (qMode && MODES.some(m => m.id === qMode)) setMode(qMode);
    // Start a fresh conversation when coming with a pre-filled prompt from /reputacio etc.
    if (searchParams.get('q')) {
      setActiveId(null);
    } else if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }
  }, [searchParams]);

  const activeConv = conversations.find(c => c.id === activeId);
  const messages = activeConv?.messages || [];
  const modeDef = MODES.find(m => m.id === mode)!;
  const seeds = SEEDS[mode] || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  const updateConversation = (id: string, msgs: ChatMessageType[], title?: string) => {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, messages: msgs, updatedAt: new Date().toISOString(), ...(title ? { title } : {}) } : c
      );
      saveConversations(updated);
      return updated;
    });
  };

  const newConversation = () => {
    const conv: Conversation = { id: generateId(), title: 'Nova conversa', messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setConversations(prev => { const u = [conv, ...prev]; saveConversations(u); return u; });
    setActiveId(conv.id);
    setError(null);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => { const u = prev.filter(c => c.id !== id); saveConversations(u); return u; });
    if (activeId === id) setActiveId(conversations.find(c => c.id !== id)?.id || null);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    let convId = activeId;
    if (!convId) {
      const conv: Conversation = { id: generateId(), title: content.slice(0, 40), messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setConversations(prev => { const u = [conv, ...prev]; saveConversations(u); return u; });
      convId = conv.id;
      setActiveId(convId);
    }
    const userMsg: ChatMessageType = { id: generateId(), role: 'user', content: content.trim(), timestamp: new Date().toISOString() };
    const currentMsgs = conversations.find(c => c.id === convId)?.messages || [];
    const newMsgs = [...currentMsgs, userMsg];
    updateConversation(convId, newMsgs, currentMsgs.length === 0 ? content.slice(0, 40) : undefined);
    setInput('');
    setIsLoading(true);
    setError(null);
    try {
      const history = currentMsgs.map(m => ({ role: m.role, content: m.content }));
      const response = await apiClient.post<ChatResponse>('/api/chat/', { message: content.trim(), history });
      const assistantMsg: ChatMessageType = {
        id: generateId(), role: 'assistant', content: response.answer,
        sources: response.sources, followUps: response.follow_ups, intent: response.intent,
        timestamp: new Date().toISOString(),
      };
      updateConversation(convId, [...newMsgs, assistantMsg]);
    } catch {
      setError("No s'ha pogut connectar amb el servidor.");
      updateConversation(convId, currentMsgs);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fire a preformed prompt coming from /reputacio (or other modules).
  useEffect(() => {
    const q = searchParams.get('q');
    if (!q || autoFiredRef.current || isLoading) return;
    autoFiredRef.current = true;
    sendMessage(q);
    // Clean the URL so a refresh doesn't re-trigger.
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/chat');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--ink)' }}>
      {/* Conversation sidebar */}
      <div style={{
        width: 220, borderRight: '1px solid var(--line)', background: 'var(--ink-2)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '10px' }}>
          <button onClick={newConversation} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: 'transparent',
            border: '1px dashed var(--line)', color: 'var(--bone)',
            fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            <Plus size={12} /> Nova conversa
          </button>
        </div>
        <div className="thin-scroll" style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => { setActiveId(conv.id); setError(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', marginBottom: 2, cursor: 'pointer',
                background: activeId === conv.id ? 'var(--paper)' : 'transparent',
                color: activeId === conv.id ? 'var(--ink)' : 'var(--bone)',
                borderLeft: activeId === conv.id ? '3px solid var(--wr-red)' : '3px solid transparent',
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activeId === conv.id ? 700 : 400 }}>{conv.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: .5 }}>{conv.messages.length} msg</div>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2, opacity: .4 }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main war room area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader
          crumb="Operacions / War Room"
          title={<>Sala de guerra. <em style={{ color: 'var(--fog)', fontWeight: 400 }}>{modeDef.label.toLowerCase()}</em></>}
          info="Chat d'intel·ligència amb 5 modes polítics. Genera dossiers, contradiccions, speeches i anàlisis sobre dades reals de 947 municipis."
          actions={<StatusLine color="var(--wr-phosphor)">Índex al dia · últim batch 03:47</StatusLine>}
        />
        <HelpBanner
          pageKey="chat"
          title="War Room — Sala de guerra"
          description="El cor de la plataforma. Pregunta com un polític i rep respostes amb cites literals, fonts verificables i accions concretes. Tria un dels 5 modes segons el que necessitis: vigilar, atacar, defensar, comparar o detectar oportunitats."
          dataSource="Cerca en 54.410 actes, 228.124 votacions, DSPC del Parlament i premsa catalana"
          tips={[
            "Mode Monitor per seguiment diari, Mode Atacar per preparar un ple",
            "Cada resposta mostra les fonts — clica-les per verificar",
            "Guarda les respostes útils al Workspace per construir speeches i dossiers",
          ]}
        />

        {/* Mode selector */}
        <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {MODES.map(m => {
            const active = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px',
                background: active ? 'var(--ink-4)' : 'transparent',
                border: '1px solid ' + (active ? m.color : 'var(--line)'),
                color: active ? m.color : 'var(--bone)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '.06em', textTransform: 'uppercase',
              }}>
                <span style={{ fontSize: 14 }}>{m.icon}</span> {m.label}
              </button>
            );
          })}
          <Link href="/chat/workspace" style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 11px', border: '1px solid var(--line)', color: 'var(--bone)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.06em',
            textTransform: 'uppercase', textDecoration: 'none',
          }}>
            📋 Workspace
          </Link>
        </div>

        {/* Messages or empty state */}
        <div className="thin-scroll" style={{ flex: 1, overflow: 'auto', padding: '22px 26px 0' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <DotGrid size={28} opacity={0.04} />
              <div style={{ position: 'relative', maxWidth: 580 }}>
                <StatusBadge tone="red">◼ {modeDef.label.toUpperCase()} MODE · ACTIU</StatusBadge>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 64px)',
                  margin: '18px 0 14px', lineHeight: .95, letterSpacing: '-.02em',
                  color: 'var(--paper)', fontWeight: 400,
                }}>
                  {modeDef.id === 'atacar' ? <>Tria el <em style={{ color: modeDef.color }}>rival.</em></> :
                   modeDef.id === 'defensar' ? <>Prepara l&apos;<em style={{ color: modeDef.color }}>argumentari.</em></> :
                   modeDef.id === 'comparar' ? <>Qui és <em style={{ color: modeDef.color }}>millor?</em></> :
                   modeDef.id === 'oportunitat' ? <>On <em style={{ color: modeDef.color }}>ataquem?</em></> :
                   <>Què es <em style={{ color: modeDef.color }}>diu?</em></>}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--bone)', lineHeight: 1.5, margin: '0 0 28px' }}>
                  {modeDef.hint}. Sobre dades reals de 947 municipis, el Parlament i les xarxes.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                  {seeds.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} disabled={isLoading} style={{
                      display: 'block', width: '100%', padding: '10px 14px',
                      background: 'transparent', border: '1px dashed var(--line)',
                      color: 'var(--bone)', fontFamily: 'var(--font-sans)', fontSize: 13,
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      → {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {messages.map((message, idx) => (
                <div key={message.id}>
                  <ChatMessage message={message} onFollowUp={sendMessage} followUpDisabled={isLoading} />
                  {message.role === 'assistant' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, marginTop: -8 }}>
                      <button
                        onClick={() => setSaveTarget({ message, query: messages[idx - 1]?.content || '' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                          background: 'transparent', border: '1px solid var(--line)', color: 'var(--fog)',
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em',
                          textTransform: 'uppercase', cursor: 'pointer',
                        }}
                      >
                        <BookmarkPlus style={{ width: 11, height: 11 }} /> Guardar al workspace
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <ProgressiveLoader />}
              {error && (
                <div style={{
                  padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11,
                  background: 'rgba(212,58,31,.08)', border: '1px solid rgba(212,58,31,.3)',
                  color: 'var(--wr-red-2)', marginBottom: 16,
                }}>
                  ⚠ {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{
          borderTop: '1px solid var(--line)', padding: '14px 26px 18px',
          background: 'var(--ink-2)',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Quick seeds when chatting */}
            {messages.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {seeds.slice(0, 2).map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} disabled={isLoading} style={{
                    background: 'transparent', border: '1px dashed var(--line)', color: 'var(--bone)',
                    padding: '5px 9px', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              background: 'var(--ink)', border: '1px solid var(--line)',
              borderTop: `3px solid ${modeDef.color}`,
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Mode ${modeDef.label.toLowerCase()} · ${modeDef.hint}`}
                disabled={isLoading}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--paper)',
                  padding: '14px 16px', fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none',
                }}
              />
              <button type="submit" disabled={!input.trim() || isLoading} style={{
                background: isLoading ? 'var(--ink-4)' : modeDef.color,
                color: 'var(--ink)', border: 'none', padding: '0 20px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
                textTransform: 'uppercase', fontWeight: 700,
                opacity: !input.trim() || isLoading ? 0.4 : 1,
              }}>
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Disparar →'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Save to workspace modal */}
      {saveTarget && (
        <SaveToWorkspaceModal
          open
          defaultMode={mode}
          content={saveTarget.message.content}
          query={saveTarget.query}
          sources={(saveTarget.message.sources || []).map((s: any) => s.url || s.titulo || String(s))}
          onClose={() => setSaveTarget(null)}
          onSaved={(savedMode: WorkspaceMode) => {
            setSaveTarget(null);
            const label = MODES.find(m => m.id === savedMode)?.label || savedMode;
            setSavedToast(`Guardat al workspace de ${label}`);
            setTimeout(() => setSavedToast(null), 3000);
          }}
        />
      )}

      {/* Toast */}
      {savedToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: 280, zIndex: 100,
          padding: '10px 16px', background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderLeft: '3px solid var(--wr-phosphor)',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--wr-phosphor)',
          letterSpacing: '.1em', textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
        }}>
          ✓ {savedToast}
        </div>
      )}

      {/* Right panel: sources + confidence */}
      <aside className="thin-scroll" style={{
        width: 300, borderLeft: '1px solid var(--line)', background: 'var(--ink-2)',
        padding: '18px 16px', overflow: 'auto',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Fonts actives
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
          {[
            { kind: 'ACTA', label: 'Plens municipals', sub: '51.192 processades' },
            { kind: 'DSPC', label: 'Diari Sessions Parlament', sub: 'Sessions 2024-2026' },
            { kind: 'SOCIAL', label: 'Bluesky + premsa', sub: 'Cluster mencions' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--ink)', border: '1px solid var(--line)', padding: '8px 10px',
              display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8,
            }}>
              <StatusBadge tone={s.kind === 'ACTA' ? 'bone' : s.kind === 'DSPC' ? 'phos' : 'amber'}>{s.kind}</StatusBadge>
              <div>
                <div style={{ fontSize: 11, color: 'var(--paper)' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Confiança
        </div>
        <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: 14, marginBottom: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Gauge label="Evidència documental" value={92} tone="phos" />
            <Gauge label="Risc legal" value={20} tone="amber" />
            <Gauge label="Frescor dades" value={85} tone="phos" />
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Accions ràpides
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {['Desar al dossier rival', 'Exportar PDF · 4 pàg', 'Enviar a Telegram', 'Generar tweet (≤260c)', 'Afegir a brief setmanal'].map((a, i) => (
            <button key={i} style={{
              background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--paper)',
              padding: '8px 11px', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
            }}>▸ {a}</button>
          ))}
        </div>
      </aside>
    </div>
  );
}
