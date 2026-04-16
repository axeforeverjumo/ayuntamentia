'use client';

import { useEffect, useState } from 'react';
import {
  X, Building2, Calendar, Sparkles, MapPin, Users,
  AlertTriangle, AlertCircle, Info, MessageSquare, Tag,
  Loader2, Vote, Eye, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/ApiClient';
import type { Alerta, AlertSeverity } from '@/lib/types';
import { PartidoChip } from './PartidoChip';
import { cn } from '@/lib/utils';

const SEV_META: Record<AlertSeverity, { icon: typeof AlertTriangle; text: string; bg: string; border: string }> = {
  alta:  { icon: AlertTriangle, text: 'text-[#f87171]', bg: 'bg-[#2a0a0a]', border: 'border-[#dc2626]/40' },
  media: { icon: AlertCircle,   text: 'text-[#fbbf24]', bg: 'bg-[#2a1f08]', border: 'border-[#d97706]/40' },
  baja:  { icon: Info,          text: 'text-[#4ade80]', bg: 'bg-[#052e16]', border: 'border-[#16a34a]/40' },
};

const SENTIDO_META: Record<string, { label: string; color: string; bg: string }> = {
  a_favor:    { label: 'A favor',    color: 'text-[#4ade80]', bg: 'bg-[#052e16]' },
  en_contra:  { label: 'En contra',  color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]' },
  abstencion: { label: 'Abstenció',  color: 'text-[#fbbf24]', bg: 'bg-[#2a1f08]' },
};

function formatFecha(s?: string | null): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat('ca-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(d);
  } catch { return s; }
}

interface Props {
  alertaId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function AlertaDetailModal({ alertaId, onClose, onUpdated }: Props) {
  const [alerta, setAlerta] = useState<Alerta | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!alertaId) { setAlerta(null); return; }
    setLoading(true);
    apiClient.get<Alerta>(`/api/alertas/${alertaId}`)
      .then((a) => setAlerta(a))
      .catch(() => setAlerta(null))
      .finally(() => setLoading(false));
  }, [alertaId]);

  // Auto-marcar como 'vista' al abrir si estaba 'nueva'
  useEffect(() => {
    if (!alerta || alerta.estado !== 'nueva') return;
    apiClient.patch(`/api/alertas/${alerta.id}/estado?estado=vista`, null)
      .then(() => { setAlerta({ ...alerta, estado: 'vista' }); onUpdated?.(); })
      .catch(() => {});
  }, [alerta?.id]);

  // ESC cierra
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const changeEstado = async (estado: 'resuelta' | 'descartada') => {
    if (!alerta) return;
    setActing(true);
    try {
      await apiClient.patch(`/api/alertas/${alerta.id}/estado?estado=${estado}`, null);
      onUpdated?.();
      onClose();
    } finally {
      setActing(false);
    }
  };

  if (!alertaId) return null;

  const meta = alerta ? SEV_META[alerta.severidad] : null;
  const SevIcon = meta?.icon || Info;

  // Agrupar votaciones por partido
  const votosPorPartido: Record<string, Record<string, number>> = {};
  alerta?.votaciones?.forEach((v) => {
    votosPorPartido[v.partido] = votosPorPartido[v.partido] || {};
    votosPorPartido[v.partido][v.sentido] = v.n;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#30363d] bg-gradient-to-br from-[#0f141b] to-[#161b22] shadow-[0_0_60px_-10px_rgba(124,58,237,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#c4b5fd] animate-spin" />
            </div>
          )}

          {alerta && !loading && (
            <>
              {/* Header */}
              <div className={cn(
                'p-5 border-b border-[#21262d] relative overflow-hidden',
                meta?.bg,
              )}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                     style={{ background: alerta.severidad === 'alta' ? '#dc2626' : alerta.severidad === 'media' ? '#d97706' : '#16a34a' }} />

                <div className="flex items-start gap-3 relative">
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border',
                    meta?.bg, meta?.border,
                  )}>
                    <SevIcon className={cn('w-5 h-5', meta?.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        meta?.bg, meta?.text, meta?.border,
                      )}>
                        {alerta.severidad}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#1c2128] border border-[#30363d] text-[#8b949e]">
                        <Tag className="w-2.5 h-2.5" />
                        {alerta.tipo}
                      </span>
                      {alerta.regla_nombre && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#1a0b2e] border border-[#7c3aed]/40 text-[#c4b5fd]">
                          <Sparkles className="w-2.5 h-2.5" />
                          Regla: {alerta.regla_nombre}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[15px] font-bold text-[#f3f6fa] leading-snug pr-8">
                      {alerta.titulo}
                    </h2>
                    <p className="text-[12px] text-[#c9d1d9] leading-relaxed mt-2">
                      {alerta.descripcion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#8b949e] mt-3 flex-wrap">
                  {alerta.municipio && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {alerta.municipio}
                      {alerta.poblacion ? ` · ${alerta.poblacion.toLocaleString('ca-ES')} hab` : ''}
                    </span>
                  )}
                  {alerta.comarca && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {alerta.comarca}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 ml-auto">
                    <Calendar className="w-3 h-3" />
                    Detectada: {formatFecha(alerta.created_at)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Punto del pleno */}
                {alerta.punto_titulo && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#c4b5fd]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                        Punt del ple
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3">
                      <div className="flex items-start gap-2 mb-2">
                        {alerta.punto_tema && alerta.punto_tema !== 'procedimiento' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#1a0b2e] border border-[#7c3aed]/30 text-[#c4b5fd]">
                            {alerta.punto_tema.replace(/_/g, ' ')}
                          </span>
                        )}
                        {alerta.punto_resultado && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#052e16] border border-[#16a34a]/30 text-[#4ade80]">
                            {alerta.punto_resultado}
                          </span>
                        )}
                        <span className="text-[10px] text-[#6e7681] ml-auto">
                          {formatFecha(alerta.punto_fecha)}
                        </span>
                      </div>
                      <h3 className="text-[13px] font-semibold text-[#e6edf3] leading-snug mb-1.5">
                        {alerta.punto_titulo}
                      </h3>
                      {alerta.punto_resumen && (
                        <p className="text-[12px] text-[#c9d1d9] leading-relaxed">
                          {alerta.punto_resumen}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Votacions */}
                {alerta.votaciones && alerta.votaciones.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Vote className="w-3.5 h-3.5 text-[#67e8f9]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                        Votacions per partit
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3 space-y-2">
                      {Object.entries(votosPorPartido).map(([partido, sentidos]) => (
                        <div key={partido} className="flex items-center gap-2 flex-wrap">
                          <PartidoChip partido={partido} size="xs" />
                          {Object.entries(sentidos).map(([sentido, n]) => {
                            const sm = SENTIDO_META[sentido];
                            return (
                              <span key={sentido} className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
                                sm?.bg || 'bg-[#1c2128]', sm?.color || 'text-[#c9d1d9]',
                              )}>
                                {sm?.label || sentido} · {n}
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Arguments */}
                {alerta.argumentos && alerta.argumentos.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5 text-[#fbbf24]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                        Intervencions ({alerta.argumentos.length})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {alerta.argumentos.map((arg, i) => (
                        <div key={i} className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            {arg.partido && <PartidoChip partido={arg.partido} size="xs" />}
                            {arg.posicion && (
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[10px]',
                                arg.posicion === 'favor' ? 'bg-[#052e16] text-[#4ade80]' :
                                arg.posicion === 'contra' ? 'bg-[#2a0a0a] text-[#f87171]' :
                                'bg-[#2a1f08] text-[#fbbf24]'
                              )}>
                                {arg.posicion}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#c9d1d9] leading-relaxed italic">
                            "{arg.argumento}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Concejal asociat */}
                {alerta.concejal && (
                  <section className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3">
                    <div className="flex items-center gap-2 text-[12px]">
                      <Users className="w-3.5 h-3.5 text-[#8b949e]" />
                      <span className="text-[#8b949e]">Regidor implicat:</span>
                      <span className="text-[#e6edf3] font-medium">{alerta.concejal}</span>
                      {alerta.cargo && <span className="text-[#6e7681]">· {alerta.cargo}</span>}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-[#21262d] bg-[#0a0d12]/80 flex items-center justify-between gap-2">
                <a
                  href={`/buscar?q=${encodeURIComponent(alerta.municipio || alerta.punto_titulo || '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obrir al cercador
                </a>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeEstado('descartada')}
                    disabled={acting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border border-[#30363d] text-[#8b949e] hover:border-[#dc2626]/50 hover:text-[#f87171] transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Descartar
                  </button>
                  <button
                    onClick={() => changeEstado('resuelta')}
                    disabled={acting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white hover:from-[#22c55e] hover:to-[#16a34a] transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Marcar resolta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
