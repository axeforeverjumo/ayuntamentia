'use client';

import { useState } from 'react';
import { Loader2, Copy, ChevronUp, ChevronDown, Mic } from 'lucide-react';
import type { WorkspaceItem } from '@/lib/workspaceStorage';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Props {
  items: WorkspaceItem[];
}

export function SpeechBuilder({ items }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [speech, setSpeech] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const orderedPieces = orderedIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as WorkspaceItem[];

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setOrderedIds(next);
      setSpeech('');
      return next;
    });
  }

  function move(id: string, dir: -1 | 1) {
    setOrderedIds(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function generateSpeech() {
    if (orderedPieces.length === 0 || loading) return;
    setLoading(true);
    setSpeech('');
    const pieces = orderedPieces.map((p, i) =>
      `${i + 1}. ${p.title}: ${p.content.slice(0, 400)}`
    ).join('\n\n');
    const prompt = `Ets un assessor polític expert. Genera un speech de 3 minuts per un ple municipal utilitzant exclusivament aquestes evidències:\n\n${pieces}\n\nEl speech ha de: 1) Començar amb una afirmació contundent 2) Presentar cada evidència amb la cita literal 3) Tancar amb una pregunta retòrica al rival. To: parlamentari, formal però contundent. Idioma: català.`;
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      setSpeech(data.answer || data.response || data.content || '');
    } catch {
      setSpeech('Error generant el speech. Torna-ho a intentar.');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(speech).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (items.length === 0) return null;

  return (
    <div style={{ border: '1px solid var(--wr-red-2)', background: 'var(--ink)', marginBottom: 20 }}>
      {/* Builder header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--ink-2)',
      }}>
        <Mic style={{ width: 14, height: 14, color: 'var(--wr-red-2)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bone)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Speech Builder · {selected.length} peces seleccionades
        </span>
        {selected.length > 0 && (
          <button
            onClick={generateSpeech}
            disabled={loading}
            style={{
              marginLeft: 'auto', padding: '5px 12px',
              background: loading ? 'var(--ink-4)' : 'var(--wr-red)',
              border: `1px solid ${loading ? 'var(--line)' : 'var(--wr-red)'}`,
              color: 'var(--paper)', cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.1em',
              textTransform: 'uppercase', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> Generant…</> : 'Generar speech →'}
          </button>
        )}
      </div>

      {/* Pieces list */}
      <div style={{ padding: '10px 14px' }}>
        {items.map(item => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
            padding: '8px 0', borderBottom: '1px dashed var(--line-soft)',
          }}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              style={{ cursor: 'pointer', accentColor: 'var(--wr-red-2)' }}
            />
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--paper)' }}>{item.title}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)' }}>
                {item.content.slice(0, 80)}…
              </div>
            </div>
            {selected.includes(item.id) && (
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => move(item.id, -1)} style={{
                  background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
                  width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><ChevronUp style={{ width: 11, height: 11 }} /></button>
                <button onClick={() => move(item.id, 1)} style={{
                  background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
                  width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><ChevronDown style={{ width: 11, height: 11 }} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Order preview when items selected */}
      {orderedPieces.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px', background: 'var(--ink-3)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Ordre del speech
          </div>
          {orderedPieces.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-red-2)', minWidth: 16 }}>{i + 1}.</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--bone)' }}>{p.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Speech result */}
      {(loading || speech) && (
        <div style={{ borderTop: `1px solid var(--wr-red-2)`, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-red-2)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              Speech generat
            </span>
            {speech && (
              <button onClick={copyToClipboard} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                background: 'transparent', border: '1px solid var(--line)', color: copied ? 'var(--wr-phosphor)' : 'var(--fog)',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', cursor: 'pointer',
              }}>
                <Copy style={{ width: 10, height: 10 }} />
                {copied ? 'Copiat!' : 'Copiar'}
              </button>
            )}
          </div>
          {loading ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--fog)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Generant speech…
            </div>
          ) : (
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--paper)',
              lineHeight: 1.7, whiteSpace: 'pre-wrap',
            }}>
              {speech}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
