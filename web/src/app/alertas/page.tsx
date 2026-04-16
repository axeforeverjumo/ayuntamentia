'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Filter, Loader2, RefreshCw, Clock, X, Eye, Sparkles,
  TrendingUp, Building2, Tag, Plus, Zap, Edit2, Trash2,
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
    () => alertas.filter((a) => filter === 'totes' || a.severidad === filter),
    [alertas, filter],
  );

  const counts = useMemo(() => {
    const c: Record<AlertSeverity, number> = { alta: 0, media: 0, baja: 0 };
    for (const a of alertas) c[a.severidad] = (c[a.severidad] || 0) + 1;
    return c;
  }, [alertas]);

  return (
    <div className="min-h-screen p-6 relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#d97706] opacity-[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-[#dc2626] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d97706]/20 to-[#dc2626]/20 border border-[#d97706]/30 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#d97706]/10 to-[#dc2626]/10 blur-md" />
              <Bell className="w-4 h-4 text-[#fbbf24] relative" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#e6edf3] flex items-center gap-2">
                Alertes polítiques
                {stats && stats.nuevas > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a1f08] border border-[#d97706]/40 text-[10px] font-semibold uppercase tracking-wider text-[#fbbf24]">
                    <span className="w-1 h-1 rounded-full bg-[#fbbf24] animate-pulse" />
                    {stats.nuevas} noves
                  </span>
                )}
              </h1>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Incoherències, contradiccions i tendències detectades automàticament
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openNewRegla}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs rounded-xl',
                'bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white',
                'hover:from-[#8b5cf6] hover:to-[#22d3ee]',
                'shadow-lg shadow-[#7c3aed]/20 transition-all',
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova regla
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs rounded-xl',
                'bg-gradient-to-r from-[#1a0b2e]/50 to-[#0a1e26]/50',
                'border border-[#7c3aed]/30 text-[#c4b5fd]',
                'hover:border-[#7c3aed]/60 hover:text-[#e6edf3]',
                'transition-all duration-200',
                'disabled:opacity-50',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Actualitzar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gradient-to-r from-[#0f141b] to-[#161b22] border border-[#21262d] rounded-xl p-1 gap-1 w-fit">
          <button
            onClick={() => setTab('alertas')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'alertas'
                ? 'bg-gradient-to-r from-[#1a0b2e] to-[#0a1e26] text-[#e6edf3] border border-[#7c3aed]/40'
                : 'text-[#8b949e] hover:text-[#e6edf3]',
            )}
          >
            <Bell className="w-3 h-3" />
            Alertes {stats && <span className="text-[10px] text-[#6e7681]">({stats.nuevas})</span>}
          </button>
          <button
            onClick={() => setTab('reglas')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === 'reglas'
                ? 'bg-gradient-to-r from-[#1a0b2e] to-[#0a1e26] text-[#e6edf3] border border-[#7c3aed]/40'
                : 'text-[#8b949e] hover:text-[#e6edf3]',
            )}
          >
            <Zap className="w-3 h-3" />
            Les meves regles <span className="text-[10px] text-[#6e7681]">({reglas.length})</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Bell} label="Totals" value={stats.total}
              sub={`${stats.nuevas} sense revisar`}
              gradient="from-[#7c3aed]/15 to-[#06b6d4]/15"
              border="border-[#7c3aed]/30" iconColor="text-[#c4b5fd]"
            />
            <StatCard
              icon={AlertTriangle} label="Alta prioritat" value={stats.altas_nuevas}
              sub="requereixen atenció"
              gradient="from-[#dc2626]/15 to-[#2a0a0a]"
              border="border-[#dc2626]/40" iconColor="text-[#f87171]"
            />
            <StatCard
              icon={AlertCircle} label="Prioritat mitja" value={stats.medias_nuevas}
              sub="patrons a vigilar"
              gradient="from-[#d97706]/15 to-[#2a1f08]"
              border="border-[#d97706]/40" iconColor="text-[#fbbf24]"
            />
            <StatCard
              icon={TrendingUp} label="Aquesta setmana" value={stats.semana}
              sub="alertes noves"
              gradient="from-[#16a34a]/15 to-[#052e16]"
              border="border-[#16a34a]/40" iconColor="text-[#4ade80]"
            />
          </div>
        )}

        {tab === 'alertas' && (<>
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-[#8b949e]" />
          <div className="flex bg-gradient-to-r from-[#0f141b] to-[#161b22] border border-[#21262d] rounded-xl p-1 gap-1">
            {(['totes', 'alta', 'media', 'baja'] as const).map((f) => {
              const count = f === 'totes' ? alertas.length : counts[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                    filter === f
                      ? 'bg-gradient-to-r from-[#1a0b2e] to-[#0a1e26] text-[#e6edf3] border border-[#7c3aed]/40'
                      : 'text-[#8b949e] hover:text-[#e6edf3]',
                  )}
                >
                  {f === 'totes' ? 'Totes' : SEVERITY_META[f].label}
                  <span className="ml-1.5 text-[10px] text-[#6e7681]">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex bg-gradient-to-r from-[#0f141b] to-[#161b22] border border-[#21262d] rounded-xl p-1 gap-1 ml-auto">
            <button
              onClick={() => setEstadoFilter('nueva')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                estadoFilter === 'nueva'
                  ? 'bg-gradient-to-r from-[#2a1f08] to-[#1f1a0d] text-[#fbbf24] border border-[#d97706]/40'
                  : 'text-[#8b949e] hover:text-[#e6edf3]',
              )}
            >
              Sense revisar
            </button>
            <button
              onClick={() => setEstadoFilter('todas')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                estadoFilter === 'todas'
                  ? 'bg-gradient-to-r from-[#1a0b2e] to-[#0a1e26] text-[#e6edf3] border border-[#7c3aed]/40'
                  : 'text-[#8b949e] hover:text-[#e6edf3]',
              )}
            >
              Totes
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[#450a0a] to-[#2a0a0a] border border-[#dc2626]/40">
            <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" />
            <p className="text-sm text-[#fca5a5]">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#c4b5fd] animate-spin" />
              <span className="text-sm text-[#8b949e]">Carregant alertes…</span>
            </div>
          </div>
        )}

        {/* Alerts list */}
        {!loading && (
          <div className="space-y-3">
            {filteredAlertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-[#0f141b] to-[#161b22] border border-[#21262d] rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#052e16] to-[#0a1e26] border border-[#16a34a]/30 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-[#4ade80]" />
                </div>
                <p className="text-sm font-medium text-[#e6edf3]">
                  {estadoFilter === 'nueva' ? 'Cap alerta pendent' : 'Cap alerta'}
                </p>
                <p className="text-xs text-[#6e7681] mt-1">
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-[#c4b5fd] animate-spin" />
      </div>
    );
  }
  if (reglas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-[#0f141b] to-[#161b22] border border-[#21262d] rounded-2xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 border border-[#7c3aed]/30 flex items-center justify-center mb-3">
          <Zap className="w-6 h-6 text-[#c4b5fd]" />
        </div>
        <p className="text-sm font-medium text-[#e6edf3]">Cap regla configurada</p>
        <p className="text-xs text-[#6e7681] mt-1 max-w-md text-center">
          Crea regles per vigilar partits, temes, regidors o paraules clau.
          T'avisarem quan hi hagi coincidències noves als plens.
        </p>
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white hover:from-[#8b5cf6] hover:to-[#22d3ee] transition-colors shadow-lg shadow-[#7c3aed]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Crea la primera regla
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    <div className={cn(
      'relative rounded-2xl border p-4 transition-all overflow-hidden',
      'bg-gradient-to-br from-[#0f141b] to-[#161b22]',
      regla.activa ? 'border-[#7c3aed]/30' : 'border-[#21262d] opacity-70',
    )}>
      {regla.activa && (
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-[#7c3aed] pointer-events-none" />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-semibold text-[#e6edf3]">{regla.nombre}</h3>
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
              regla.activa ? 'bg-[#052e16] text-[#4ade80] border border-[#16a34a]/30' : 'bg-[#1c2128] text-[#6e7681] border border-[#30363d]',
            )}>
              <span className={cn('w-1 h-1 rounded-full', regla.activa ? 'bg-[#4ade80] animate-pulse' : 'bg-[#6e7681]')} />
              {regla.activa ? 'Activa' : 'Pausada'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(regla)}
              title={regla.activa ? 'Pausar' : 'Activar'}
              className="w-7 h-7 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#c4b5fd] hover:border-[#484f58] flex items-center justify-center transition-colors"
            >
              {regla.activa ? <X className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onEdit(regla)}
              title="Editar"
              className="w-7 h-7 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] flex items-center justify-center transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(regla.id)}
              title="Eliminar"
              className="w-7 h-7 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#f87171] hover:border-[#dc2626]/50 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {regla.descripcion && (
          <p className="text-[11px] text-[#c9d1d9] mb-2 leading-relaxed">{regla.descripcion}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-2.5">
          {regla.partidos?.map((p) => <PartidoChip key={`p-${p}`} partido={p} size="xs" />)}
          {regla.temas?.map((t) => (
            <span key={`t-${t}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#2a1f04] border border-[#d97706]/30 text-[#fbbf24]">
              <Tag className="w-2.5 h-2.5" />
              {t.replace(/_/g, ' ')}
            </span>
          ))}
          {regla.concejales?.map((c) => (
            <span key={`c-${c}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#0a1930] border border-[#1e40af]/30 text-[#93c5fd]">
              👤 {c}
            </span>
          ))}
          {regla.palabras_clave?.map((k) => (
            <span key={`k-${k}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#1a0b2e] border border-[#7c3aed]/30 text-[#c4b5fd]">
              💬 {k}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[#8b949e]">
          <span className="inline-flex items-center gap-1">
            <Bell className="w-2.5 h-2.5" />
            {regla.total_alertas ?? 0} alertes
            {(regla.alertas_nuevas ?? 0) > 0 && (
              <span className="ml-0.5 text-[#fbbf24]">({regla.alertas_nuevas} noves)</span>
            )}
          </span>
          {regla.last_run_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Última: {new Date(regla.last_run_at).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {hasAny === 0 && (
            <span className="text-[#f87171] ml-auto">⚠️ Sense filtres</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, gradient, border, iconColor }: {
  icon: typeof Bell; label: string; value: number | string; sub: string;
  gradient: string; border: string; iconColor: string;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-4 border bg-gradient-to-br from-[#0f141b] to-[#161b22]',
      border,
    )}>
      <div className={cn('absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br opacity-40 blur-2xl pointer-events-none', gradient)} />
      <div className="relative flex items-center justify-between mb-2">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6e7681]">
          {label}
        </span>
      </div>
      <p className={cn('text-2xl font-bold relative', iconColor)}>{value}</p>
      <p className="text-[11px] text-[#8b949e] mt-0.5 relative">{sub}</p>
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
  const meta = SEVERITY_META[alerta.severidad];
  const SeverityIcon = meta.icon;
  const partido = extractPartido(alerta.titulo);
  const tipoLabel = TIPO_LABEL[alerta.tipo] || alerta.tipo;
  const isResolved = alerta.estado === 'resuelta' || alerta.estado === 'descartada';

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-l-2 p-4 transition-all cursor-pointer',
        'bg-gradient-to-br from-[#0f141b] to-[#161b22]',
        'hover:border-[#484f58] hover:shadow-lg',
        meta.border, meta.borderL, meta.glow,
        isResolved && 'opacity-50',
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
           style={{ background: alerta.severidad === 'alta' ? '#dc2626' : alerta.severidad === 'media' ? '#d97706' : '#16a34a' }} />

      <div className="relative flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center',
          meta.bg, meta.border,
        )}>
          <SeverityIcon className={cn('w-4 h-4', meta.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
              meta.bg, meta.text, meta.border,
            )}>
              <span className={cn('w-1 h-1 rounded-full', meta.text.replace('text-', 'bg-'))} />
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1c2128] border border-[#30363d] text-[#8b949e]">
              <Tag className="w-2.5 h-2.5" />
              {tipoLabel}
            </span>
            {partido && <PartidoChip partido={partido} size="xs" />}
            {alerta.estado === 'vista' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0a1930] border border-[#1e40af]/30 text-[#93c5fd]">
                <Eye className="w-2.5 h-2.5" />
                Vista
              </span>
            )}
            {alerta.estado === 'resuelta' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#052e16] border border-[#16a34a]/30 text-[#4ade80]">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Resolta
              </span>
            )}
          </div>

          <h3 className="text-[14px] font-semibold text-[#f3f6fa] mb-1.5 leading-snug">
            {alerta.titulo}
          </h3>
          <p className="text-[12px] text-[#c9d1d9] leading-relaxed mb-3">
            {alerta.descripcion}
          </p>

          <div className="flex items-center gap-3 text-[10px] text-[#8b949e] flex-wrap">
            {alerta.municipio && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {alerta.municipio}
              </span>
            )}
            {alerta.punto_titulo && (
              <span className="inline-flex items-center gap-1 max-w-md truncate">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{alerta.punto_titulo}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {formatFechaLarga(alerta.created_at)}
            </span>
          </div>
        </div>

        {!isResolved && (
          <div className="flex-shrink-0 flex flex-col gap-1.5">
            {alerta.estado === 'nueva' && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkViewed(alerta.id); }}
                disabled={isPending}
                title="Marcar com a vista"
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f141b] border border-[#21262d] text-[#8b949e] hover:border-[#1e40af]/50 hover:text-[#93c5fd] transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(alerta.id); }}
              disabled={isPending}
              title="Marcar com a resolta"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f141b] border border-[#21262d] text-[#8b949e] hover:border-[#16a34a]/50 hover:text-[#4ade80] transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alerta.id); }}
              disabled={isPending}
              title="Descartar"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f141b] border border-[#21262d] text-[#8b949e] hover:border-[#dc2626]/50 hover:text-[#f87171] transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
