'use client';

import { useState } from 'react';
import { X, BookmarkPlus } from 'lucide-react';
import { addWorkspaceItem, autoDetectTags } from '@/lib/workspaceStorage';
import type { WorkspaceMode } from '@/lib/workspaceStorage';

const MODES: { id: WorkspaceMode; label: string; color: string }[] = [
  { id: 'monitor', label: 'Monitor', color: 'var(--wr-phosphor)' },
  { id: 'atacar', label: 'Atacar', color: 'var(--wr-red-2)' },
  { id: 'defensar', label: 'Defensar', color: '#93c5fd' },
  { id: 'comparar', label: 'Comparar', color: '#c4b5fd' },
  { id: 'oportunitat', label: 'Oportunitat', color: 'var(--wr-amber)' },
];

interface Props {
  open: boolean;
  defaultMode: string;
  content: string;
  query: string;
  sources: string[];
  onClose: () => void;
  onSaved: (mode: WorkspaceMode) => void;
}

export function SaveToWorkspaceModal({ open, defaultMode, content, query, sources, onClose, onSaved }: Props) {
  const validMode = MODES.find(m => m.id === defaultMode)?.id || 'monitor';
  const [mode, setMode] = useState<WorkspaceMode>(validMode);
  const [title, setTitle] = useState(query.slice(0, 60));
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>(() => autoDetectTags(content));

  if (!open) return null;

  const modeColor = MODES.find(m => m.id === mode)?.color || 'var(--bone)';

  function save() {
    addWorkspaceItem({ mode, title: title || query.slice(0, 60), content, query, sources, tags, starred: false, notes, status: 'actiu' });
    onSaved(mode);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
      <div style={{
        position: 'relative', width: 480, background: 'var(--ink-2)',
        border: `1px solid var(--line)`, borderTop: `3px solid ${modeColor}`,
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookmarkPlus style={{ width: 16, height: 16, color: modeColor }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Guardar al workspace
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fog)', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '18px' }}>
          {/* Mode selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>Mode</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  padding: '5px 10px', cursor: 'pointer',
                  background: mode === m.id ? `color-mix(in srgb, ${m.color} 14%, transparent)` : 'transparent',
                  border: `1px solid ${mode === m.id ? m.color : 'var(--line)'}`,
                  color: mode === m.id ? m.color : 'var(--fog)',
                  fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase',
                }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Títol</div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{
                width: '100%', background: 'var(--ink)', border: '1px solid var(--line)',
                color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 13,
                padding: '8px 12px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              Etiquetes (detecció automàtica)
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.length === 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)' }}>Cap</span>
              )}
              {tags.map(t => (
                <button key={t} onClick={() => setTags(prev => prev.filter(x => x !== t))} style={{
                  padding: '2px 8px', background: `color-mix(in srgb, ${modeColor} 12%, transparent)`,
                  border: `1px solid ${modeColor}`, color: modeColor,
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {t} ×
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Notes (opcional)</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Perquè serveix aquesta recerca, context…"
              style={{
                width: '100%', background: 'var(--ink)', border: '1px solid var(--line)',
                color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 12,
                padding: '8px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Cancel·lar</button>
            <button onClick={save} style={{
              padding: '8px 18px', background: modeColor, border: `1px solid ${modeColor}`,
              color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700,
            }}>Desar →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
