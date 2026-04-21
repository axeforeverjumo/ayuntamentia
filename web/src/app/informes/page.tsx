'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/warroom/PageHeader';
import { StatusLine } from '@/components/warroom/StatusBadge';
import apiClient from '@/lib/ApiClient';
import { CronPicker } from '@/components/ui/CronPicker';
import { traduirTema } from '@/lib/temesCatala';
import type { HelpInfo } from '@/components/warroom/PanelBox';

const TEMAS = [
  'medio_ambiente', 'comercio', 'pesca', 'agricultura', 'caza',
  'urbanismo', 'seguridad', 'servicios_sociales', 'vivienda',
  'educacion', 'salud', 'transporte', 'cultura', 'mociones',
];

type Sub = {
  id: number;
  nombre: string;
  temas: string[];
  prompt_libre: string | null;
  canal: 'email' | 'telegram' | 'both';
  cron_expr: string;
  activo: boolean;
  last_sent_at: string | null;
};

const INFO: HelpInfo = {
  title: 'Informes i subscripcions',
  description: "Gestió de briefs automàtics per email o Telegram. Cada subscripció vigila els temes que t'interessen i t'envia un resum periòdic generat per IA.",
  dataSource: 'Generació automàtica basada en les actes processades',
  tips: [
    "Les subscripcions actives s'envien automàticament segons la freqüència configurada",
    'Configura una subscripció per rebre un brief cada dilluns amb el resum setmanal',
    'Pots personalitzar els temes i la consulta lliure de cada subscripció',
  ],
};

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;
  const [min, hour, , , dow] = parts;
  const dies: Record<string, string> = {
    '0': 'Diumenge', '1': 'Dilluns', '2': 'Dimarts', '3': 'Dimecres',
    '4': 'Dijous', '5': 'Divendres', '6': 'Dissabte', '7': 'Diumenge',
    '*': 'Cada dia',
  };
  const diaStr = dow.includes(',')
    ? dow.split(',').map(d => dies[d] || d).join(', ')
    : dies[dow] || dow;
  const h = hour.padStart(2, '0');
  const m = min.padStart(2, '0');
  return `${diaStr} a les ${h}:${m}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--ink)', border: '1px solid var(--line)',
  color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 13,
  padding: '10px 12px', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
  color: 'var(--fog)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6,
};

export default function InformesPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [nombre, setNombre] = useState('');
  const [modo, setModo] = useState<'temas' | 'libre'>('temas');
  const [temas, setTemas] = useState<string[]>([]);
  const [promptLibre, setPromptLibre] = useState('');
  const [canal, setCanal] = useState<'email' | 'telegram' | 'both'>('telegram');
  const [cron, setCron] = useState('0 8 * * 5');
  const [creating, setCreating] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Sub | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.get<Sub[]>('/api/subscripciones');
      setSubs(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen]);

  const canCreate = !!nombre && (
    (modo === 'temas' && temas.length > 0) ||
    (modo === 'libre' && promptLibre.trim().length >= 10)
  );

  async function create() {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      await apiClient.post('/api/subscripciones', {
        nombre,
        temas: modo === 'temas' ? temas : [],
        municipios: [],
        prompt_libre: modo === 'libre' ? promptLibre.trim() : null,
        ventana_dias: 7,
        canal,
        cron_expr: cron,
        activo: true,
      });
      setNombre(''); setTemas([]); setPromptLibre('');
      setModalOpen(false);
      load();
    } catch {}
    setCreating(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Informes"
        title={<>Informes.</>}
        info={INFO}
        actions={
          <button onClick={() => setModalOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--brand)', color: '#E8F1F9',
            border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', padding: '10px 16px',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 0 20px -6px rgba(15,76,129,.4)',
          }}>
            ◼ GENERAR INFORME →
          </button>
        }
      />

      <div style={{ padding: '20px 26px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--wr-phosphor)' }} />
          </div>
        ) : subs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Sense subscripcions actives
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--bone)', marginBottom: 24 }}>
              Crea la teva primera subscripció per rebre briefs automàtics.
            </p>
            <button onClick={() => setModalOpen(true)} style={{
              background: 'var(--brand)', color: '#E8F1F9',
              border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', padding: '10px 16px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
              cursor: 'pointer',
            }}>
              ◼ CREAR SUBSCRIPCIÓ →
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2.5fr 80px 1.5fr 1.5fr 80px',
              padding: '8px 14px', borderBottom: '1px solid var(--line)',
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
              letterSpacing: '.12em', textTransform: 'uppercase',
            }}>
              <span>Nom</span>
              <span>Temes / Consulta</span>
              <span>Canal</span>
              <span>Freqüència</span>
              <span>Última enviada</span>
              <span>Estat</span>
            </div>
            {subs.map((s, i) => (
              <div key={s.id} onClick={() => setSelectedSub(s)} style={{
                display: 'grid', gridTemplateColumns: '2fr 2.5fr 80px 1.5fr 1.5fr 80px',
                padding: '12px 14px', alignItems: 'center',
                borderBottom: i < subs.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer', transition: 'background .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}>
                  {s.nombre}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bone)', letterSpacing: '.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.prompt_libre
                    ? `"${s.prompt_libre.slice(0, 60)}${s.prompt_libre.length > 60 ? '…' : ''}"`
                    : s.temas.map(t => traduirTema(t)).join(', ') || '—'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bone)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {s.canal}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--bone)' }}>
                  {cronToHuman(s.cron_expr)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)' }}>
                  {s.last_sent_at ? s.last_sent_at.slice(0, 16) : '—'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: s.activo ? 'var(--wr-phosphor)' : 'var(--fog)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: s.activo ? 'var(--wr-phosphor)' : 'var(--fog)', marginRight: 6, flexShrink: 0 }} />
                  {s.activo ? 'Actiu' : 'Inactiu'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedSub && (
        <div
          onClick={() => setSelectedSub(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)',
              width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                {selectedSub.nombre}
              </h2>
              <button onClick={() => setSelectedSub(null)} style={{
                background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                ✕
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={labelStyle}>Canal</div>
                  <div style={{ color: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>{selectedSub.canal}</div>
                </div>
                <div>
                  <div style={labelStyle}>Freqüència</div>
                  <div style={{ color: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>{cronToHuman(selectedSub.cron_expr)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Estat</div>
                  <div style={{ color: selectedSub.activo ? 'var(--wr-phosphor)' : 'var(--fog)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {selectedSub.activo ? '● Actiu' : '○ Inactiu'}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Última enviada</div>
                  <div style={{ color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {selectedSub.last_sent_at ? selectedSub.last_sent_at.slice(0, 16).replace('T', ' ') : 'Mai'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>Temes / Consulta</div>
                {selectedSub.prompt_libre ? (
                  <p style={{ color: 'var(--bone)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                    &ldquo;{selectedSub.prompt_libre}&rdquo;
                  </p>
                ) : selectedSub.temas.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedSub.temas.map(t => (
                      <span key={t} style={{
                        padding: '4px 10px', background: 'var(--ink)',
                        border: '1px solid var(--line)', color: 'var(--bone)',
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                      }}>
                        {traduirTema(t)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: 'var(--fog)', fontSize: 12 }}>—</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => {
                  try {
                    await apiClient.patch(`/api/subscripciones/${selectedSub.id}`, { activo: !selectedSub.activo });
                    setSelectedSub(null);
                    load();
                  } catch {}
                }} style={{
                  flex: 1, padding: '10px 16px',
                  background: selectedSub.activo ? 'var(--ink)' : 'var(--wr-phosphor)',
                  color: selectedSub.activo ? 'var(--fog)' : 'var(--ink)',
                  border: `1px solid ${selectedSub.activo ? 'var(--line)' : 'var(--wr-phosphor)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  {selectedSub.activo ? '◻ Pausar' : '◼ Activar'}
                </button>
                <button onClick={async () => {
                  try {
                    await apiClient.delete(`/api/subscripciones/${selectedSub.id}`);
                    setSelectedSub(null);
                    load();
                  } catch {}
                }} style={{
                  padding: '10px 16px', background: 'transparent',
                  border: '1px solid var(--wr-red-2)', color: 'var(--wr-red-2)',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)',
              width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: 'var(--ink-2)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', margin: 0, letterSpacing: '-.01em' }}>
                Nova subscripció
              </h2>
              <button onClick={() => setModalOpen(false)} style={{
                background: 'none', border: '1px solid var(--line)', color: 'var(--fog)',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nom</label>
                <input
                  placeholder="Ex: Brief setmanal medi ambient"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12, display: 'flex', gap: 1 }}>
                {(['temas', 'libre'] as const).map(m => (
                  <button key={m} onClick={() => setModo(m)} style={{
                    flex: 1, padding: '8px 12px',
                    background: modo === m ? 'var(--brand)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    color: modo === m ? 'var(--paper)' : 'var(--fog)',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>
                    {m === 'temas' ? 'Temes predefinits' : 'Consulta lliure'}
                  </button>
                ))}
              </div>

              {modo === 'temas' ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Temes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TEMAS.map(t => (
                      <button
                        key={t}
                        onClick={() => setTemas(temas.includes(t) ? temas.filter(x => x !== t) : [...temas, t])}
                        style={{
                          padding: '4px 10px',
                          background: temas.includes(t) ? 'var(--brand)' : 'var(--ink)',
                          border: `1px solid ${temas.includes(t) ? 'var(--brand)' : 'var(--line)'}`,
                          color: temas.includes(t) ? 'var(--paper)' : 'var(--fog)',
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          letterSpacing: '.06em', cursor: 'pointer',
                        }}
                      >
                        {traduirTema(t)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Consulta en llenguatge natural</div>
                  <textarea
                    value={promptLibre}
                    onChange={e => setPromptLibre(e.target.value)}
                    rows={3}
                    placeholder="Ex: Tot el que es parli d'Aliança Catalana..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Canal</label>
                <select
                  value={canal}
                  onChange={e => setCanal(e.target.value as 'email' | 'telegram' | 'both')}
                  style={{ ...inputStyle }}
                >
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="both">Tots dos</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Quan s&apos;enviarà</label>
                <CronPicker value={cron} onChange={setCron} />
              </div>

              <button
                onClick={create}
                disabled={!canCreate || creating}
                style={{
                  width: '100%', background: 'var(--brand)', color: '#E8F1F9',
                  border: '1px solid var(--brand)', borderRadius: 'var(--r-md)', padding: '12px 16px',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                  cursor: canCreate && !creating ? 'pointer' : 'not-allowed',
                  opacity: canCreate && !creating ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxSizing: 'border-box', boxShadow: '0 0 20px -6px rgba(15,76,129,.4)',
                }}
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                ◼ CREAR SUBSCRIPCIÓ →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
