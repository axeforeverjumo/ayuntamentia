import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Users,
  FileText,
  TrendingUp,
  ChevronLeft,
  ExternalLink,
  BarChart2,
  Calendar,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/ApiClient';
import type { MunicipioDetalle } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const municipio = await apiClient.get<MunicipioDetalle>(
      `/api/municipios/${id}`,
    );
    return { title: municipio.nombre };
  } catch {
    return { title: 'Municipi' };
  }
}

const PARTIDO_COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

export default async function MunicipioDetailPage({ params }: PageProps) {
  const { id } = await params;

  let municipio: MunicipioDetalle | null = null;
  let fetchError = false;

  try {
    municipio = await apiClient.get<MunicipioDetalle>(`/api/municipios/${id}`);
  } catch {
    fetchError = true;
  }

  if (fetchError || !municipio) {
    return (
      <div className="p-6">
        <Link
          href="/municipios"
          className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Tornar als municipis
        </Link>
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-lg">
          <AlertCircle className="w-10 h-10 text-[#f87171] mb-3" />
          <p className="text-sm font-medium text-[#8b949e]">
            No s&apos;ha pogut carregar el municipi
          </p>
        </div>
      </div>
    );
  }

  const maxConcejales =
    municipio.composicion_pleno.length > 0
      ? Math.max(...municipio.composicion_pleno.map((p) => p.concejales))
      : 1;

  const maxTemas =
    municipio.temas_frecuentes.length > 0
      ? Math.max(...municipio.temas_frecuentes.map((t) => t.menciones))
      : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/municipios"
        className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Tornar als municipis
      </Link>

      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-[#60a5fa]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#e6edf3]">
              {municipio.nombre}
            </h1>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                <MapPin className="w-3.5 h-3.5" />
                {municipio.comarca} · {municipio.provincia}
              </span>
              <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                <Users className="w-3.5 h-3.5" />
                {municipio.poblacion.toLocaleString('ca-ES')} habitants
              </span>
              <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                <FileText className="w-3.5 h-3.5" />
                {municipio.actas_procesadas} actes
              </span>
            </div>
          </div>
          {municipio.tiene_ac && (
            <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-[#052e16] text-[#4ade80] border border-[#14532d]">
              Té Acords de Coalició
            </span>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left column */}
        <div className="col-span-2 space-y-4">
          {/* Composicion del pleno */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <BarChart2 className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Composició del ple
              </h2>
              <span className="ml-auto text-xs text-[#6e7681]">
                {municipio.num_concejales} concejals
              </span>
            </div>
            <div className="p-5 space-y-3">
              {municipio.composicion_pleno.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-6">
                  Sense dades de composició
                </p>
              ) : (
                municipio.composicion_pleno.map((partido, idx) => (
                  <div key={partido.partido} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#e6edf3] font-medium">
                        {partido.partido}
                      </span>
                      <span className="text-[#8b949e]">
                        {partido.concejales} ({partido.porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#1c2128] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(partido.concejales / maxConcejales) * 100}%`,
                          backgroundColor:
                            partido.color ??
                            PARTIDO_COLORS[idx % PARTIDO_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Concejales list */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <Users className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Concejals
              </h2>
            </div>
            <div className="divide-y divide-[#21262d]">
              {municipio.concejales.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-8">
                  Sense dades de concejals
                </p>
              ) : (
                municipio.concejales.map((concejal) => (
                  <div
                    key={concejal.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#8b949e]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#e6edf3] font-medium truncate">
                          {concejal.nombre}
                        </p>
                        <p className="text-xs text-[#8b949e]">
                          {concejal.partido}
                          {concejal.cargo && ` · ${concejal.cargo}`}
                        </p>
                      </div>
                    </div>
                    {concejal.es_ac && concejal.coherencia_score !== undefined && (
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <p className="text-xs text-[#6e7681]">Coherència</p>
                          <p
                            className={cn(
                              'text-sm font-bold',
                              concejal.coherencia_score >= 80
                                ? 'text-[#4ade80]'
                                : concejal.coherencia_score >= 50
                                  ? 'text-[#fbbf24]'
                                  : 'text-[#f87171]',
                            )}
                          >
                            {concejal.coherencia_score}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ultimos plenos */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <Calendar className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Últims plens
              </h2>
            </div>
            <div className="divide-y divide-[#21262d]">
              {municipio.ultimos_plenos.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-8">
                  Sense plens registrats
                </p>
              ) : (
                municipio.ultimos_plenos.map((acta) => (
                  <Link
                    key={acta.id}
                    href={`/actas/${acta.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#1c2128] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[#e6edf3] truncate group-hover:text-[#60a5fa] transition-colors">
                          {acta.tipo}
                        </p>
                        <p className="text-xs text-[#8b949e]">
                          {acta.puntos_count} punts de l&apos;ordre del dia
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[#6e7681] flex-shrink-0 ml-4">
                      {formatDate(acta.fecha)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Temas frecuentes */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <TrendingUp className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Temes freqüents
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {municipio.temas_frecuentes.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-6">
                  Sense dades de temes
                </p>
              ) : (
                municipio.temas_frecuentes.slice(0, 8).map((tema) => (
                  <div key={tema.nombre} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#e6edf3] truncate mr-2">
                        {tema.nombre}
                      </span>
                      <span className="text-xs text-[#6e7681] flex-shrink-0">
                        {tema.menciones}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1c2128] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563eb] rounded-full"
                        style={{
                          width: `${(tema.menciones / maxTemas) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#e6edf3]">
              Estadístiques
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8b949e]">Actes processades</span>
                <span className="text-sm font-bold text-[#e6edf3]">
                  {municipio.actas_procesadas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8b949e]">Concejals</span>
                <span className="text-sm font-bold text-[#e6edf3]">
                  {municipio.num_concejales}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8b949e]">Grups polítics</span>
                <span className="text-sm font-bold text-[#e6edf3]">
                  {municipio.composicion_pleno.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8b949e]">Poblaci&oacute;</span>
                <span className="text-sm font-bold text-[#e6edf3]">
                  {municipio.poblacion.toLocaleString('ca-ES')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
