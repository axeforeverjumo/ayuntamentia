'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Filter, Loader2, RefreshCw, Clock, X, Eye, Sparkles,
  TrendingUp, Building2, Tag, Plus, Zap, Edit2, Trash2, Share2,
} from 'lucide-react';
import { apiClient } from '@/lib/ApiClient';
import { PartidoChip } from '@/components/ui/PartidoChip';
import { AlertaDetailModal } from '@/components/ui/AlertaDetailModal';
import { ReglaFormModal } from '@/components/ui/ReglaFormModal';
import type { Alerta, AlertasStats, AlertSeverity, AlertEstado, AlertaRegla } from '@/lib/types';
import { cn } from '@/lib/utils';

type ListResponse = { total: number; page: number; results: Alerta[] } | Alerta[];

const SEVERITY_META: Record<AlertSeverity, {
  label: string; icon: typeof AlertTriangle; text: string; bg: string;
  border: string; glow: string; borderL: string;
}> = {
  alta: {
    label: 'Alta', icon: AlertTriangle,
    text: 'text-[#f87171]', bg: 'bg-[#2a0a0a]',
    border: 'border-[#dc2626]/40',
    borderL: 'border-l-[#dc2626]',
    glow: 'shadow-[0_0_28px_-10px_rgba(220,38,38,0.5)]',
  },
  media: {
    label: 'Mitja', icon: AlertCircle,
    text: 'text-[#fbbf24]', bg: 'bg-[#2a1f08]',
    border: 'border-[#d97706]/40',
    borderL: 'border-l-[#d97706]',
    glow: 'shadow-[0_0_28px_-10px_rgba(217,119,6,0.4)]',
  },
  baja: {
    label: 'Baixa', icon: Info,
    text: 'text-[#4ade80]', bg: 'bg-[#052e16]',
    border: 'border-[#16a34a]/40',
    borderL: 'border-l-[#16a34a]',
    glow: 'shadow-[0_0_28px_-10px_rgba(22,163,74,0.4)]',
  },
};

const TIPO_LABEL: Record<string, string> = {
  incoherencia_interna: 'Incoherència interna',
  tendencia_emergente: 'Tendència emergent',
  contradiccion_rival: 'Contradicció rival',
  voto_polemic: 'Vot polèmic',
  promesa_incumplida: 'Promesa incomplerta',
};

function formatFechaLarga(fecha?: string | null): string {
  if (!fecha) return '';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return new Intl.DateTimeFormat('ca-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch {
    return fecha;
  }
}

function extractPartido(titulo: string): string | null {
  const m = titulo.match(/\b(AC|ERC|PSC|CUP|PP|VOX|Cs|JxCat|Junts|Comuns|Aliança\s+Catalana)\b/i);
  return m ? m[1] : null;
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [stats, setStats] = useState<AlertasStats | null>(null);
  const [reglas, setReglas] = useState<AlertaRegla[]>([]);
  const [tab, setTab] = useState<'alertas' | 'reglas'>('alertas');
  const [filter, setFilter] = useState<AlertSeverity | 'totes'>('totes');
  const [tipoFilter, setTipoFilter] = useState<string>('tots');
  const [estadoFilter, setEstadoFilter] = useState<'nueva' | 'todas'>('nueva');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modales
  const [selectedAlertaId, setSelectedAlertaId] = useState<number | null>(null);
  const [reglaFormOpen, setReglaFormOpen] = useState(false);
  const [reglaEditing, setReglaEditing] = useState<AlertaRegla | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = estadoFilter === 'nueva' ? '?estado=nueva' : '';
      const [listResp, statsData, reglasData] = await Promise.all([
        apiClient.get<ListResponse>(`/api/alertas/${params}`),
        apiClient.get<AlertasStats>('/api/alertas/stats/resumen'),
        apiClient.get<AlertaRegla[]>('/api/alertas/reglas/').catch(() => [] as AlertaRegla[]),
      ]);
      const list = Array.isArray(listResp) ? listResp : (listResp.results || []);
      setAlertas(list);
      setStats(statsData);
      setReglas(reglasData);
    } catch {
      setError('No s\'han pogut carregar les alertes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [estadoFilter]);

  const openNewRegla = () => { setReglaEditing(null); setReglaFormOpen(true); };
  const openEditRegla = (r: AlertaRegla) => { setReglaEditing(r); setReglaFormOpen(true); };
  const onReglaSaved = () => { setReglaFormOpen(false); loadData(); };

  const deleteRegla = async (id: number) => {
    if (!confirm('Eliminar aquesta regla? Les alertes generades es mantenen.')) return;
    try {
      await apiClient.delete(`/api/alertas/reglas/${id}`);
      loadData();
    } catch {
      // silently fail
    }
  };

  const toggleRegla = async (r: AlertaRegla) => {
    try {
      await apiClient.put(`/api/alertas/reglas/${r.id}`, {
        ...r, activa: !r.activa,
      });
      loadData();
    } catch {}
  };

  const updateEstado = (id: number, estado: AlertEstado) => {
    startTransition(async () => {
      try {
        await apiClient.patch(`/api/alertas/${id}/estado?estado=${estado}`, null);
        setAlertas((prev) =>
          estadoFilter === 'nueva'
            ? prev.filter((a) => a.id !== id)
            : prev.map((a) => a.id === id ? { ...a, estado } : a)
        );
        if (stats) {
          setStats({
            ...stats,
            nuevas: Math.max(0, stats.nuevas - 1),
          });
        }
      } catch {
        // silently fail
      }
    });
  };

  const filteredAlertas = useMemo(
    () => alertas.filter((a) =>
      (filter === 'totes' || a.severidad === filter) &&
      (tipoFilter === 'tots' || a.tipo === tipoFilter)
    ),
    [alertas, filter, tipoFilter],
  );

  const counts = useMemo(() => {
    const c: Record<AlertSeverity, number> = { alta: 0, media: 0, baja: 0 };
    for (const a of alertas) c[a.severidad] = (c[a.severidad] || 0) + 1;
    return c;
  }, [alertas]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      {/* War Room Header */}
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>
              Operacions / Alertes
            </div>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.1, margin: 0, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 14 }}>
              Alertes <span style={{ color: 'var(--brand-l)' }}>actives.</span>
              {stats && stats.nuevas > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '4px 10px', background: 'rgba(212,58,31,.08)', border: '1px solid rgba(212,58,31,.3)', color: 'var(--wr-red-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="pulse-dot" style={{ width: 6, height: 6, background: 'var(--wr-red-2)', borderRadius: 6 }} />
                  {stats.nuevas} noves
                </span>
              )}
              {stats && stats.nuevas === 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '4px 10px', background: 'rgba(139,211,91,.06)', border: '1px solid rgba(139,211,91,.3)', color: 'var(--wr-phosphor)' }}>
                  ✓ Cap alerta crítica
                </span>
              )}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openNewRegla}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'var(--brand)', color: '#E8F1F9', border: '1px solid var(--brand)',
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
                textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 0 20px -6px rgba(15,76,129,.3)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova regla
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'transparent', border: '1px solid var(--line)', color: 'var(--bone)',
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em',
                textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Actualitzar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginTop: 8 }}>
          {(['alertas', 'reglas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid var(--brand-l)' : '2px solid transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-meta)',
                fontSize: 12, fontWeight: 500, letterSpacing: '.06em',
                textTransform: 'uppercase', cursor: 'pointer', transition: 'color .15s',
              }}
            >
              {t === 'alertas' ? <Bell className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {t === 'alertas'
                ? <>Alertes {stats && <span style={{ fontSize: 10, color: 'var(--text-meta)', marginLeft: 3 }}>({stats.nuevas})</span>}</>
                : <>Les meves regles <span style={{ fontSize: 10, color: 'var(--text-meta)', marginLeft: 3 }}>({reglas.length})</span></>
              }
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
            {[
              { icon: Bell, label: 'Totals', value: stats.total, sub: `${stats.nuevas} sense revisar`, color: 'var(--brand-l)', border: 'rgba(15,76,129,.3)' },
              { icon: AlertTriangle, label: 'Alta prioritat', value: stats.altas_nuevas, sub: 'requereixen atenció', color: '#f87171', border: 'rgba(220,38,38,.4)' },
              { icon: AlertCircle, label: 'Prioritat mitja', value: stats.medias_nuevas, sub: 'patrons a vigilar', color: '#fbbf24', border: 'rgba(217,119,6,.4)' },
              { icon: TrendingUp, label: 'Aquesta setmana', value: stats.semana, sub: 'alertes noves', color: '#4ade80', border: 'rgba(22,163,74,.4)' },
            ].map(({ icon: Icon, label, value, sub, color, border }) => (
              <div key={label} style={{
                background: 'var(--bg-surface)', border: `.5px solid ${border}`,
                borderRadius: 'var(--r-lg)', padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Icon style={{ width: 16, height: 16, color }} />
                  <span style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-meta)' }}>{label}</span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'alertas' && (<>
        {/* Filters row 1: severity + estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <Filter style={{ width: 16, height: 16, color: 'var(--text-meta)', flexShrink: 0 }} />
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 4, gap: 2 }}>
            {(['totes', 'alta', 'media', 'baja'] as const).map((f) => {
              const count = f === 'totes' ? alertas.length : counts[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--r-md)',
                    fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: filter === f ? 'var(--brand)' : 'transparent',
                    color: filter === f ? '#E8F1F9' : 'var(--text-secondary)',
                    transition: 'all .15s',
                  }}
                >
                  {f === 'totes' ? 'Totes' : SEVERITY_META[f].label}
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: .7 }}>({count})</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 4, gap: 2, marginLeft: 'auto' }}>
            {([['nueva', 'Sense revisar'], ['todas', 'Totes']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setEstadoFilter(v)}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--r-md)',
                  fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: estadoFilter === v ? 'var(--brand)' : 'transparent',
                  color: estadoFilter === v ? '#E8F1F9' : 'var(--text-secondary)',
                  transition: 'all .15s',
                }}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Filters row 2: tipus */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Tipus</span>
          {([
            { value: 'tots', label: 'Tots', color: 'var(--bone)' },
            { value: 'incoherencia_interna', label: 'Incoherència interna', color: 'var(--wr-phosphor)' },
            { value: 'contradiccion_rival', label: 'Contradicció rival', color: 'var(--wr-red-2)' },
            { value: 'tendencia_emergente', label: 'Tendència emergent', color: 'var(--wr-amber)' },
            { value: 'voto_polemic', label: 'Vot polèmic', color: 'var(--bone)' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setTipoFilter(opt.value)}
              style={{
                padding: '4px 10px',
                background: tipoFilter === opt.value
                  ? `color-mix(in srgb, ${opt.color} 14%, transparent)`
                  : 'transparent',
                border: `1px solid ${tipoFilter === opt.value ? opt.color : 'var(--line)'}`,
                color: tipoFilter === opt.value ? opt.color : 'var(--fog)',
                fontFamily: 'var(--font-mono)', fontSize: 9.5,
                letterSpacing: '.1em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 'var(--r-lg)', background: 'rgba(192,57,43,.08)', border: '.5px solid rgba(192,57,43,.4)' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Loader2 style={{ width: 20, height: 20, color: 'var(--brand-l)' }} className="animate-spin" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Carregant alertes…</span>
            </div>
          </div>
        )}

        {/* Alerts list */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {filteredAlertas.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: 'rgba(22,163,74,.1)', border: '.5px solid rgba(22,163,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <CheckCircle2 style={{ width: 24, height: 24, color: '#4ade80' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  {estadoFilter === 'nueva' ? 'Cap alerta pendent' : 'Cap alerta'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-meta)', margin: 0 }}>
                  {filter !== 'totes' ? `No hi ha alertes de prioritat ${SEVERITY_META[filter].label.toLowerCase()}` : 'Sistema net'}
                </p>
              </div>
            ) : (
              filteredAlertas.map((alerta) => (
                <AlertaCard
                  key={alerta.id}
                  alerta={alerta}
                  onClick={() => setSelectedAlertaId(alerta.id)}
                  onMarkViewed={(id) => updateEstado(id, 'vista')}
                  onDismiss={(id) => updateEstado(id, 'descartada')}
                  onResolve={(id) => updateEstado(id, 'resuelta')}
                  isPending={isPending}
                />
              ))
            )}
          </div>
        )}
        </>)}

        {tab === 'reglas' && (
          <ReglasList
            reglas={reglas}
            loading={loading}
            onCreate={openNewRegla}
            onEdit={openEditRegla}
            onDelete={deleteRegla}
            onToggle={toggleRegla}
          />
        )}
      </div>

      <AlertaDetailModal
        alertaId={selectedAlertaId}
        onClose={() => setSelectedAlertaId(null)}
        onUpdated={loadData}
      />
      <ReglaFormModal
        open={reglaFormOpen}
        initial={reglaEditing}
        onClose={() => setReglaFormOpen(false)}
        onSaved={onReglaSaved}
      />
    </div>
  );
}

function ReglasList({
  reglas, loading, onCreate, onEdit, onDelete, onToggle,
}: {
  reglas: AlertaRegla[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (r: AlertaRegla) => void;
  onDelete: (id: number) => void;
  onToggle: (r: AlertaRegla) => void;
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
        <Loader2 style={{ width: 20, height: 20, color: 'var(--brand-l)' }} className="animate-spin" />
      </div>
    );
  }
  if (reglas.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', marginTop: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: 'rgba(15,76,129,.1)', border: '.5px solid rgba(15,76,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Zap style={{ width: 24, height: 24, color: 'var(--brand-l)' }} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>Cap regla configurada</p>
        <p style={{ fontSize: 12, color: 'var(--text-meta)', margin: '0 0 16px', maxWidth: 360, textAlign: 'center' }}>
          Crea regles per vigilar partits, temes, regidors o paraules clau.
          T&apos;avisarem quan hi hagi coincidències noves als plens.
        </p>
        <button
          onClick={onCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: 'var(--brand)', color: '#E8F1F9', border: '1px solid var(--brand)',
            borderRadius: 'var(--r-md)', fontSize: 12, cursor: 'pointer',
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Crea la primera regla
        </button>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
      {reglas.map((r) => (
        <ReglaCard key={r.id} regla={r} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
      ))}
    </div>
  );
}

function ReglaCard({
  regla, onEdit, onDelete, onToggle,
}: {
  regla: AlertaRegla;
  onEdit: (r: AlertaRegla) => void;
  onDelete: (id: number) => void;
  onToggle: (r: AlertaRegla) => void;
}) {
  const hasAny = (regla.partidos?.length || 0) + (regla.temas?.length || 0) +
                  (regla.concejales?.length || 0) + (regla.palabras_clave?.length || 0);
  return (
    <div style={{
      position: 'relative', borderRadius: 'var(--r-lg)', padding: 16,
      background: 'var(--bg-surface)',
      border: `.5px solid ${regla.activa ? 'rgba(15,76,129,.4)' : 'var(--border)'}`,
      opacity: regla.activa ? 1 : 0.7, overflow: 'hidden',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{regla.nombre}</h3>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 500,
              background: regla.activa ? 'rgba(22,163,74,.12)' : 'var(--bg-elevated)',
              color: regla.activa ? '#4ade80' : 'var(--text-meta)',
              border: `.5px solid ${regla.activa ? 'rgba(22,163,74,.3)' : 'var(--border)'}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: regla.activa ? '#4ade80' : 'var(--text-meta)' }} />
              {regla.activa ? 'Activa' : 'Pausada'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { onClick: () => onToggle(regla), title: regla.activa ? 'Pausar' : 'Activar', icon: regla.activa ? <X style={{ width: 12, height: 12 }} /> : <Zap style={{ width: 12, height: 12 }} /> },
              { onClick: () => onEdit(regla), title: 'Editar', icon: <Edit2 style={{ width: 12, height: 12 }} /> },
              { onClick: () => onDelete(regla.id), title: 'Eliminar', icon: <Trash2 style={{ width: 12, height: 12 }} /> },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} title={btn.title} style={{
                width: 28, height: 28, borderRadius: 'var(--r-md)',
                border: '.5px solid var(--border)', color: 'var(--text-meta)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', cursor: 'pointer',
              }}>{btn.icon}</button>
            ))}
          </div>
        </div>

        {regla.descripcion && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{regla.descripcion}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {regla.partidos?.map((p) => <PartidoChip key={`p-${p}`} partido={p} size="xs" />)}
          {regla.temas?.map((t) => (
            <span key={`t-${t}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, background: 'rgba(217,119,6,.1)', border: '.5px solid rgba(217,119,6,.3)', color: '#fbbf24' }}>
              <Tag style={{ width: 10, height: 10 }} />{t.replace(/_/g, ' ')}
            </span>
          ))}
          {regla.concejales?.map((c) => (
            <span key={`c-${c}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, background: 'rgba(15,76,129,.1)', border: '.5px solid rgba(15,76,129,.3)', color: 'var(--brand-l)' }}>
              👤 {c}
            </span>
          ))}
          {regla.palabras_clave?.map((k) => (
            <span key={`k-${k}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-secondary)' }}>
              💬 {k}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-meta)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Bell style={{ width: 10, height: 10 }} />
            {regla.total_alertas ?? 0} alertes
            {(regla.alertas_nuevas ?? 0) > 0 && (
              <span style={{ marginLeft: 2, color: '#fbbf24' }}>({regla.alertas_nuevas} noves)</span>
            )}
          </span>
          {regla.last_run_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 10, height: 10 }} />
              Última: {new Date(regla.last_run_at).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {hasAny === 0 && (
            <span style={{ color: '#f87171', marginLeft: 'auto' }}>⚠️ Sense filtres</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertaCard({
  alerta, onClick, onMarkViewed, onDismiss, onResolve, isPending,
}: {
  alerta: Alerta;
  onClick: () => void;
  onMarkViewed: (id: number) => void;
  onDismiss: (id: number) => void;
  onResolve: (id: number) => void;
  isPending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const meta = SEVERITY_META[alerta.severidad];
  const SeverityIcon = meta.icon;
  const partido = extractPartido(alerta.titulo);
  const tipoLabel = TIPO_LABEL[alerta.tipo] || alerta.tipo;
  const isResolved = alerta.estado === 'resuelta' || alerta.estado === 'descartada';

  const severityBg = alerta.severidad === 'alta' ? 'rgba(220,38,38,.08)' : alerta.severidad === 'media' ? 'rgba(217,119,6,.08)' : 'rgba(22,163,74,.08)';
  const severityBorder = alerta.severidad === 'alta' ? 'rgba(220,38,38,.4)' : alerta.severidad === 'media' ? 'rgba(217,119,6,.4)' : 'rgba(22,163,74,.4)';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)',
        border: `.5px solid ${severityBorder}`, borderLeft: `3px solid ${alerta.severidad === 'alta' ? '#dc2626' : alerta.severidad === 'media' ? '#d97706' : '#16a34a'}`,
        padding: 16, cursor: 'pointer', background: 'var(--bg-surface)',
        opacity: isResolved ? 0.5 : 1, transition: 'border-color .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: severityBg, border: `.5px solid ${severityBorder}`,
        }}>
          <SeverityIcon className={cn('w-4 h-4', meta.text)} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.06em',
              background: severityBg, border: `.5px solid ${severityBorder}`,
            }} className={meta.text}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {meta.label}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 500,
              ...(alerta.tipo === 'incoherencia_interna'
                ? { background: 'rgba(161,255,90,.08)', border: '.5px solid rgba(161,255,90,.3)', color: 'var(--wr-phosphor)' }
                : { background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)' }),
            }}>
              {alerta.tipo === 'incoherencia_interna' ? '◆ ' : ''}<Tag style={{ width: 10, height: 10 }} />
              {tipoLabel}
            </span>
            {partido && <PartidoChip partido={partido} size="xs" />}
            {alerta.estado === 'vista' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, background: 'rgba(15,76,129,.1)', border: '.5px solid rgba(15,76,129,.3)', color: 'var(--brand-l)' }}>
                <Eye style={{ width: 10, height: 10 }} />Vista
              </span>
            )}
            {alerta.estado === 'resuelta' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 10, background: 'rgba(22,163,74,.1)', border: '.5px solid rgba(22,163,74,.3)', color: '#4ade80' }}>
                <CheckCircle2 style={{ width: 10, height: 10 }} />Resolta
              </span>
            )}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.3 }}>
            {alerta.titulo}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
            {alerta.descripcion}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-meta)', flexWrap: 'wrap' }}>
            {alerta.municipio && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Building2 style={{ width: 12, height: 12 }} />{alerta.municipio}
              </span>
            )}
            {alerta.punto_titulo && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '32rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Sparkles style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alerta.punto_titulo}</span>
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Clock style={{ width: 12, height: 12 }} />{formatFechaLarga(alerta.created_at)}
            </span>
          </div>
        </div>

        {!isResolved && (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = `${window.location.origin}/alertas?id=${alerta.id}`;
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Compartir alerta"
              style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)', cursor: 'pointer' }}
            >
              {copied ? <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--wr-phosphor)' }}>✓</span> : <Share2 style={{ width: 14, height: 14 }} />}
            </button>
            {alerta.estado === 'nueva' && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkViewed(alerta.id); }}
                disabled={isPending}
                title="Marcar com a vista"
                style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)', cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}
              >
                <Eye style={{ width: 14, height: 14 }} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(alerta.id); }}
              disabled={isPending}
              title="Marcar com a resolta"
              style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)', cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}
            >
              <CheckCircle2 style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alerta.id); }}
              disabled={isPending}
              title="Descartar"
              style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', color: 'var(--text-meta)', cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
