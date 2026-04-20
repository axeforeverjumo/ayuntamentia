'use client';

import { useState } from 'react';
import { Star, Trash2, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { CornerBrack } from '@/components/landing/primitives';
import { StatusBadge } from '@/components/warroom/StatusBadge';
import type { WorkspaceItem, WorkspaceMode } from '@/lib/workspaceStorage';
import { updateWorkspaceItem, deleteWorkspaceItem } from '@/lib/workspaceStorage';

const MODE_COLORS: Record<WorkspaceMode, string> = {
  monitor: 'var(--wr-phosphor)',
  atacar: 'var(--wr-red-2)',
  defensar: '#93c5fd',
  comparar: '#c4b5fd',
  oportunitat: 'var(--wr-amber)',
};

const STATUS_LABELS: Record<WorkspaceItem['status'], string> = {
  actiu: 'Actiu',
  arxivat: 'Arxivat',
  usat_en_ple: 'Usat en ple',
};

interface Props {
  item: WorkspaceItem;
  onChanged: () => void;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  showCheckbox?: boolean;
}

export function WorkspaceCard({ item, onChanged, selected, onSelect, showCheckbox }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes);
  const color = MODE_COLORS[item.mode];

  function toggleStar() {
    updateWorkspaceItem(item.id, { starred: !item.starred });
    onChanged();
  }
  function archive() {
    updateWorkspaceItem(item.id, { status: item.status === 'arxivat' ? 'actiu' : 'arxivat' });
    onChanged();
  }
  function remove() {
    deleteWorkspaceItem(item.id);
    onChanged();
  }
  function setStatus(s: WorkspaceItem['status']) {
    updateWorkspaceItem(item.id, { status: s });
    onChanged();
  }
  function saveNotes() {
    updateWorkspaceItem(item.id, { notes });
    setEditingNotes(false);
    onChanged();
  }

  return (
    <div style={{
      position: 'relative',
      background: 'var(--ink-2)', border: '1px solid var(--line)',
      borderLeft: `3px solid ${color}`,
      opacity: item.status === 'arxivat' ? 0.55 : 1,
    }}>
      <CornerBrack />
      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selected}
              onChange={e => onSelect?.(item.id, e.target.checked)}
              style={{ marginTop: 3, cursor: 'pointer', accentColor: color, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--paper)',
              lineHeight: 1.2, marginBottom: 4,
            }}>
              {item.starred && <span style={{ color: 'var(--wr-amber)', marginRight: 6 }}>★</span>}
              {item.title}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
              letterSpacing: '.08em', marginBottom: 6,
            }}>
              {item.query.length > 80 ? item.query.slice(0, 80) + '…' : item.query}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge tone={
                item.status === 'usat_en_ple' ? 'phos' :
                item.status === 'arxivat' ? 'bone' : 'amber'
              }>
                {STATUS_LABELS[item.status]}
              </StatusBadge>
              {item.tags.map(t => (
                <span key={t} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em',
                  padding: '2px 6px', border: `1px solid ${color}40`, color,
                  textTransform: 'uppercase',
                }}>{t}</span>
              ))}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginLeft: 'auto' }}>
                {new Date(item.createdAt).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={toggleStar} title="Destacar" style={{
              background: 'none', border: `1px solid ${item.starred ? 'var(--wr-amber)' : 'var(--line)'}`,
              color: item.starred ? 'var(--wr-amber)' : 'var(--fog)',
              width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Star style={{ width: 12, height: 12 }} /></button>
            <button onClick={archive} title={item.status === 'arxivat' ? 'Restaurar' : 'Arxivar'} style={{
              background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
              width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Archive style={{ width: 12, height: 12 }} /></button>
            <button onClick={remove} title="Eliminar" style={{
              background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
              width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Trash2 style={{ width: 12, height: 12 }} /></button>
            <button onClick={() => setExpanded(x => !x)} style={{
              background: 'none', border: '1px solid var(--line)', color: 'var(--bone)',
              width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {expanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 4 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--bone)',
              lineHeight: 1.6, marginBottom: 12, maxHeight: 300, overflow: 'auto',
            }}>
              {item.content}
            </div>

            {/* Status change */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {(['actiu', 'usat_en_ple', 'arxivat'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  padding: '3px 8px', background: item.status === s ? color : 'transparent',
                  border: `1px solid ${item.status === s ? color : 'var(--line)'}`,
                  color: item.status === s ? 'var(--ink)' : 'var(--fog)',
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>{STATUS_LABELS[s]}</button>
              ))}
            </div>

            {/* Notes */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--ink)', border: '1px solid var(--line)',
                    color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 12,
                    padding: '8px', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={saveNotes} style={{
                    padding: '4px 12px', background: color, border: 'none', color: 'var(--ink)',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', cursor: 'pointer',
                  }}>Desar</button>
                  <button onClick={() => { setNotes(item.notes); setEditingNotes(false); }} style={{
                    padding: '4px 12px', background: 'transparent', border: '1px solid var(--line)',
                    color: 'var(--fog)', fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer',
                  }}>Cancel·lar</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                style={{
                  minHeight: 32, padding: '6px 8px', cursor: 'text',
                  border: '1px dashed var(--line)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, color: notes ? 'var(--bone)' : 'var(--fog)',
                  lineHeight: 1.4,
                }}
              >
                {notes || 'Afegeix notes…'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
