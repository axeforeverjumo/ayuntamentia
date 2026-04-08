import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronLeft,
  FileText,
  ExternalLink,
  Users,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  MapPin,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/ApiClient';
import type { ActaDetalle, Argumento } from '@/lib/types';
import { VotacionBar } from '@/components/ui/VotacionBar';
import { formatDate, cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const acta = await apiClient.get<ActaDetalle>(`/api/actas/${id}`);
    return {
      title: `${acta.tipo} · ${acta.municipio}`,
    };
  } catch {
    return { title: 'Acta' };
  }
}

const posicionIcons = {
  favor: CheckCircle2,
  contra: XCircle,
  abstencion: MinusCircle,
};

const posicionColors = {
  favor: 'text-[#4ade80]',
  contra: 'text-[#f87171]',
  abstencion: 'text-[#fbbf24]',
};

export default async function ActaDetailPage({ params }: PageProps) {
  const { id } = await params;

  let acta: ActaDetalle | null = null;
  let fetchError = false;

  try {
    acta = await apiClient.get<ActaDetalle>(`/api/actas/${id}`);
  } catch {
    fetchError = true;
  }

  if (fetchError || !acta) {
    return (
      <div className="p-6">
        <Link
          href="/buscar"
          className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Tornar a la cerca
        </Link>
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-lg">
          <AlertCircle className="w-10 h-10 text-[#f87171] mb-3" />
          <p className="text-sm font-medium text-[#8b949e]">
            No s&apos;ha pogut carregar l&apos;acta
          </p>
        </div>
      </div>
    );
  }

  const asistentes = acta.asistentes ?? [];
  const assistents = asistentes.filter((a) => a.asistio);
  const absents = asistentes.filter((a) => !a.asistio);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href={`/municipios/${acta.municipio_id}`}
          className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {acta.municipio}
        </Link>
      </div>

      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#8b949e]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1e3a8a] text-[#60a5fa] border border-[#1e3a8a]">
                  {acta.tipo}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#e6edf3]">
                Ple municipal
              </h1>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                  <MapPin className="w-3.5 h-3.5" />
                  {acta.municipio}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(acta.fecha)}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                  <Users className="w-3.5 h-3.5" />
                  {assistents.length} assistents
                </span>
              </div>
            </div>
          </div>
          {acta.pdf_url && (
            <a
              href={acta.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              PDF original
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Puntos del orden del día */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <FileText className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Ordre del dia
              </h2>
              <span className="ml-auto text-xs text-[#6e7681]">
                {acta.puntos_orden_dia.length} punts
              </span>
            </div>

            <div className="divide-y divide-[#21262d]">
              {acta.puntos_orden_dia.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-8">
                  Sense punts registrats
                </p>
              ) : (
                acta.puntos_orden_dia.map((punto) => (
                  <div key={punto.numero} className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center text-xs font-bold text-[#8b949e]">
                        {punto.numero}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">
                          {punto.titulo}
                        </h3>
                        {punto.descripcion && (
                          <p className="text-xs text-[#8b949e] leading-relaxed mb-3">
                            {punto.descripcion}
                          </p>
                        )}

                        {/* Votacion */}
                        {punto.votacion && (
                          <div className="mt-3 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                            <p className="text-xs font-medium text-[#6e7681] mb-3">
                              VOTACIÓ
                            </p>
                            <VotacionBar votacion={punto.votacion} />

                            {/* Votos por partido */}
                            {Object.keys(punto.votacion.por_partido).length >
                              0 && (
                              <div className="mt-3 pt-3 border-t border-[#21262d]">
                                <p className="text-xs text-[#6e7681] mb-2">
                                  Per grup polític:
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {Object.entries(
                                    punto.votacion.por_partido,
                                  ).map(([partido, voto]) => (
                                    <div
                                      key={partido}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="text-[#8b949e] truncate mr-2">
                                        {partido}
                                      </span>
                                      <span
                                        className={cn(
                                          'font-medium capitalize flex-shrink-0',
                                          voto === 'favor'
                                            ? 'text-[#4ade80]'
                                            : voto === 'contra'
                                              ? 'text-[#f87171]'
                                              : 'text-[#fbbf24]',
                                        )}
                                      >
                                        {voto}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Argumentos */}
                        {punto.argumentos && punto.argumentos.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-[#6e7681]">
                              INTERVENCIONS
                            </p>
                            {punto.argumentos.map((arg, argIdx) => (
                              <ArgumentoCard key={argIdx} argumento={arg} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Asistentes */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#30363d]">
              <Users className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Assistents
              </h2>
            </div>

            {assistents.length > 0 && (
              <div className="divide-y divide-[#21262d]">
                {assistents.map((asistente, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 px-4 py-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#e6edf3] truncate font-medium">
                        {asistente.nombre}
                      </p>
                      <p className="text-[10px] text-[#8b949e] truncate">
                        {asistente.partido}
                        {asistente.cargo && ` · ${asistente.cargo}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {absents.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-[#21262d]">
                  <p className="text-[10px] font-semibold text-[#6e7681] uppercase tracking-wider">
                    Absents ({absents.length})
                  </p>
                </div>
                <div className="divide-y divide-[#21262d]">
                  {absents.map((asistente, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 px-4 py-2.5 opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-[#e6edf3] truncate font-medium">
                          {asistente.nombre}
                        </p>
                        <p className="text-[10px] text-[#8b949e] truncate">
                          {asistente.partido}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {asistentes.length === 0 && (
              <p className="text-sm text-[#8b949e] text-center py-6">
                Sense llista d&apos;assistents
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArgumentoCard({ argumento }: { argumento: Argumento }) {
  const Icon = posicionIcons[argumento.posicion];
  const colorClass = posicionColors[argumento.posicion];

  return (
    <div className="p-3 rounded-lg bg-[#1c2128] border border-[#30363d]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', colorClass)} />
        <span className="text-xs font-medium text-[#e6edf3]">
          {argumento.concejal}
        </span>
        <span className="text-[10px] text-[#8b949e]">
          · {argumento.partido}
        </span>
      </div>
      <p className="text-xs text-[#8b949e] leading-relaxed">
        {argumento.texto}
      </p>
    </div>
  );
}
