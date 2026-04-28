'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/warroom/PageHeader';
import { StatusLine } from '@/components/warroom/StatusBadge';
import { WorkspaceCard } from '@/components/ui/WorkspaceCard';
import { SpeechBuilder } from '@/components/ui/SpeechBuilder';
import { loadWorkspace, getItemsByMode, updateWorkspaceItem } from '@/lib/workspaceStorage';
import type { WorkspaceMode, WorkspaceItem } from '@/lib/workspaceStorage';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const TABS: { id: WorkspaceMode; label: string; icon: string; color: string; hint: string; emptyLabel: string }[] = [
  { id: 'monitor', label: 'Monitor', icon: '◉', color: 'var(--wr-phosphor)', hint: 'Monitoratges actius', emptyLabel: 'monitoratges' },
  { id: 'atacar', label: 'Atacar', icon: '◎', color: 'var(--wr-red-2)', hint: 'Arsenal · Speech Builder', emptyLabel: 'dossiers d\'atac' },
  { id: 'defensar', label: 'Defensar', icon: '◇', color: '#93c5fd', hint: 'Argumentaris preparats', emptyLabel: 'argumentaris' },
  { id: 'comparar', label: 'Comparar', icon: '⬡', color: '#c4b5fd', hint: 'Comparatives guardades', emptyLabel: 'comparatives' },
  { id: 'oportunitat', label: 'Oportunitat', icon: '◆', color: 'var(--wr-amber)', hint: 'Oportunitats detectades', emptyLabel: 'oportunitats' },
];

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceMode>('monitor');
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const tab = TABS.find(t => t.id === activeTab)!;

  const reload = useCallback(() => {
    setItems(getItemsByMode(activeTab));
  }, [activeTab]);

  useEffect(() => { reload(); }, [reload]);

  const allItems = useCallback(() => {
    return (loadWorkspace() as WorkspaceItem[]).filter(i => i.mode === activeTab);
  }, [activeTab]);

  const displayedItems = showArchived ? allItems() : items;

  async function refreshMonitorItem(item: WorkspaceItem) {
    setRefreshingId(item.id);
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: item.query }),
      });
      const data = await res.json();
      const content = data.answer || data.response || data.content || item.content;
      updateWorkspaceItem(item.id, { content, createdAt: new Date().toISOString() });
      reload();
    } catch {
      // silently fail
    } finally {
      setRefreshingId(null);
    }
  }

  const total = items.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Sala d'Intel·ligència / Workspace"
        title={<>Workspace. <em style={{ color: tab.color, fontWeight: 400 }}>{tab.label.toLowerCase()}</em></>}
        subtitle={`${total} element${total !== 1 ? 's' : ''} guardats · ${tab.hint}`}
        actions={
          <Link href="/chat" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', border: '1px solid var(--line)', color: 'var(--bone)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', textDecoration: 'none',
          }}>
            ← Sala d'Intel·ligència
          </Link>
        }
      />

      {/* Tab selector */}
      <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map(t => {
          const count = getItemsByMode(t.id).length;
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setShowArchived(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px',
              background: active ? 'var(--ink-4)' : 'transparent',
              border: `1px solid ${active ? t.color : 'var(--line)'}`,
              color: active ? t.color : 'var(--bone)',
              cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: '.06em', textTransform: 'uppercase', transition: 'all .15s',
            }}>
              <span>{t.icon}</span> {t.label}
              {count > 0 && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.06em',
                  padding: '1px 5px', background: active ? `color-mix(in srgb, ${t.color} 20%, transparent)` : 'var(--ink-3)',
                  border: `1px solid ${active ? t.color : 'var(--line)'}`, color: active ? t.color : 'var(--fog)',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowArchived(x => !x)}
          style={{
            marginLeft: 'auto', padding: '6px 10px',
            background: showArchived ? 'var(--ink-4)' : 'transparent',
            border: '1px solid var(--line)', color: 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {showArchived ? 'Amagar arxivats' : 'Mostrar arxivats'}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 26px', maxWidth: 860 }}>

        {/* Atacar: Speech Builder */}
        {activeTab === 'atacar' && displayedItems.length > 0 && (
          <SpeechBuilder items={displayedItems.filter(i => i.status !== 'arxivat')} />
        )}

        {/* Empty state */}
        {displayedItems.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
                letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 16,
              }}>
                {tab.icon} {tab.label} · Workspace buit
              </div>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 24, color: 'var(--text-primary)',
                margin: '0 0 12px', fontWeight: 500, lineHeight: 1.1,
              }}>
                Encara no tens <em style={{ color: tab.color }}>{tab.emptyLabel}.</em>
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fog)', margin: '0 0 28px' }}>
                Ves a la Sala d'Intel·ligència, fes una recerca en mode {tab.label} i guarda-la aquí.
              </p>
              <Link
                href={`/chat?mode=${activeTab}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', background: tab.color,
                  border: `1px solid ${tab.color}`, color: 'var(--ink)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
                  textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
                }}
              >
                <Plus style={{ width: 13, height: 13 }} />
                Anar a la Sala d'Intel·ligència · {tab.label}
              </Link>
            </div>
          </div>
        )}

        {/* Items list */}
        {displayedItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Monitor: add refresh button per item */}
            {activeTab === 'monitor' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  {displayedItems.length} monitoratge{displayedItems.length !== 1 ? 's' : ''} actiu{displayedItems.length !== 1 ? 's' : ''}
                </div>
                <StatusLine color="var(--wr-phosphor)">Live · índex al dia</StatusLine>
              </div>
            )}

            {displayedItems.map(item => (
              <div key={item.id}>
                {activeTab === 'monitor' && item.status !== 'arxivat' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <button
                      onClick={() => refreshMonitorItem(item)}
                      disabled={!!refreshingId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                        background: 'transparent', border: '1px solid var(--wr-phosphor)',
                        color: 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)', fontSize: 9,
                        letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                        opacity: refreshingId === item.id ? 0.5 : 1,
                      }}
                    >
                      <RefreshCw style={{ width: 10, height: 10, animation: refreshingId === item.id ? 'spin 1s linear infinite' : 'none' }} />
                      {refreshingId === item.id ? 'Actualitzant…' : 'Actualitzar'}
                    </button>
                  </div>
                )}
                <WorkspaceCard item={item} onChanged={reload} />
              </div>
            ))}

            <div style={{ paddingTop: 12, borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}>
              <Link href={`/chat?mode=${activeTab}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-mono)', fontSize: 10, color: tab.color,
                letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none',
              }}>
                <Plus style={{ width: 11, height: 11 }} />
                Nova recerca · {tab.label}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
