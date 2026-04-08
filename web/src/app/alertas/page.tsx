'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Filter,
  Loader2,
  RefreshCw,
  MapPin,
  Clock,
} from 'lucide-react';
import { AlertBadge } from '@/components/ui/AlertBadge';
import { apiClient } from '@/lib/ApiClient';
import type { Alerta, AlertasStats, AlertSeverity } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';

const severityIcons: Record<AlertSeverity, React.ComponentType<{ className?: string }>> = {
  alta: AlertTriangle,
  media: AlertCircle,
  baja: Info,
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [stats, setStats] = useState<AlertasStats | null>(null);
  const [filter, setFilter] = useState<AlertSeverity | 'todas'>('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertasData, statsData] = await Promise.all([
        apiClient.get<Alerta[]>('/api/alertas/'),
        apiClient.get<AlertasStats>('/api/alertas/stats/resumen'),
      ]);
      setAlertas(alertasData);
      setStats(statsData);
    } catch {
      setError('No s\'ha pogut carregar les alertes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markAsReviewed = async (id: string) => {
    startTransition(async () => {
      try {
        await apiClient.patch(`/api/alertas/${id}/`, { revisada: true });
        setAlertas((prev) =>
          prev.map((a) => (a.id === id ? { ...a, revisada: true } : a)),
        );
        if (stats) {
          setStats({ ...stats, sin_revisar: Math.max(0, stats.sin_revisar - 1) });
        }
      } catch {
        // Silently fail for now
      }
    });
  };

  const filteredAlertas = alertas.filter(
    (a) => filter === 'todas' || a.severity === filter,
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Alertes</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">
            Notificacions i anomalies detectades
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#161b22] transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualitzar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-4 h-4 text-[#8b949e]" />
              <span className="text-xs text-[#6e7681]">Total</span>
            </div>
            <p className="text-2xl font-bold text-[#e6edf3]">{stats.total}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">alertes</p>
          </div>
          <div className="bg-[#161b22] border border-[#7f1d1d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-4 h-4 text-[#f87171]" />
              <span className="text-xs text-[#6e7681]">Alta</span>
            </div>
            <p className="text-2xl font-bold text-[#f87171]">{stats.alta}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">prioritat alta</p>
          </div>
          <div className="bg-[#161b22] border border-[#78350f] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-xs text-[#6e7681]">Mitja</span>
            </div>
            <p className="text-2xl font-bold text-[#fbbf24]">{stats.media}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">prioritat mitja</p>
          </div>
          <div className="bg-[#161b22] border border-[#14532d] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Info className="w-4 h-4 text-[#4ade80]" />
              <span className="text-xs text-[#6e7681]">Baixa</span>
            </div>
            <p className="text-2xl font-bold text-[#4ade80]">{stats.baja}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">prioritat baixa</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#8b949e]" />
        <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
          {(
            ['todas', 'alta', 'media', 'baja'] as Array<
              AlertSeverity | 'todas'
            >
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-[#1c2128] text-[#e6edf3]'
                  : 'text-[#8b949e] hover:text-[#e6edf3]',
              )}
            >
              {f === 'todas' ? 'Totes' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'todas' && stats && (
                <span className="ml-1.5 text-[10px] text-[#6e7681]">
                  ({stats[f as AlertSeverity]})
                </span>
              )}
            </button>
          ))}
        </div>
        {stats && stats.sin_revisar > 0 && (
          <span className="ml-auto text-xs text-[#fbbf24] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse inline-block" />
            {stats.sin_revisar} sense revisar
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#450a0a] border border-[#7f1d1d]">
          <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" />
          <p className="text-sm text-[#f87171]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
          <span className="ml-2 text-sm text-[#8b949e]">
            Carregant alertes...
          </span>
        </div>
      )}

      {/* Alerts list */}
      {!loading && (
        <div className="space-y-3">
          {filteredAlertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#161b22] border border-[#30363d] rounded-lg">
              <CheckCircle2 className="w-10 h-10 text-[#4ade80] mb-3" />
              <p className="text-sm font-medium text-[#8b949e]">
                Cap alerta pendent
              </p>
              <p className="text-xs text-[#6e7681] mt-1">
                No hi ha alertes{' '}
                {filter !== 'todas' ? `de prioritat ${filter}` : ''} actives
              </p>
            </div>
          ) : (
            filteredAlertas.map((alerta) => (
              <AlertaCard
                key={alerta.id}
                alerta={alerta}
                onMarkReviewed={markAsReviewed}
                isPending={isPending}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AlertaCard({
  alerta,
  onMarkReviewed,
  isPending,
}: {
  alerta: Alerta;
  onMarkReviewed: (id: string) => void;
  isPending: boolean;
}) {
  const SeverityIcon = severityIcons[alerta.severity];

  const borderColors: Record<AlertSeverity, string> = {
    alta: 'border-l-[#dc2626]',
    media: 'border-l-[#d97706]',
    baja: 'border-l-[#16a34a]',
  };

  return (
    <div
      className={cn(
        'bg-[#161b22] border border-[#30363d] border-l-2 rounded-lg p-4 transition-all',
        borderColors[alerta.severity],
        alerta.revisada && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            alerta.severity === 'alta'
              ? 'text-[#f87171]'
              : alerta.severity === 'media'
                ? 'text-[#fbbf24]'
                : 'text-[#4ade80]',
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <AlertBadge severity={alerta.severity} />
            <span className="text-xs text-[#8b949e] bg-[#1c2128] px-1.5 py-0.5 rounded border border-[#30363d]">
              {alerta.tipo}
            </span>
            {alerta.revisada && (
              <span className="flex items-center gap-1 text-xs text-[#4ade80]">
                <CheckCircle2 className="w-3 h-3" />
                Revisada
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">
            {alerta.titulo}
          </h3>
          <p className="text-xs text-[#8b949e] leading-relaxed mb-2">
            {alerta.descripcion}
          </p>
          <div className="flex items-center gap-4 text-xs text-[#6e7681]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {alerta.municipio}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(alerta.fecha)}
            </span>
          </div>
        </div>
        {!alerta.revisada && (
          <button
            onClick={() => onMarkReviewed(alerta.id)}
            disabled={isPending}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#30363d] text-[#8b949e] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3 h-3" />
            Marcar revisada
          </button>
        )}
      </div>
    </div>
  );
}
