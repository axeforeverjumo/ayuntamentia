import type { Metadata } from 'next';
import {
  FileText,
  TrendingUp,
  Calendar,
  Building2,
  Bell,
  BarChart2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/ApiClient';
import type { InformeSemanal } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Informes',
};

async function getInformeSemanal(): Promise<InformeSemanal | null> {
  try {
    return await apiClient.get<InformeSemanal>('/api/informes/semanal');
  } catch {
    return null;
  }
}

export default async function InformesPage() {
  const informe = await getInformeSemanal();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Informes</h1>
        <p className="text-sm text-[#8b949e] mt-0.5">
          Resum setmanal de l&apos;activitat municipal
        </p>
      </div>

      {!informe ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-lg">
          <AlertCircle className="w-10 h-10 text-[#f87171] mb-3" />
          <p className="text-sm font-medium text-[#8b949e]">
            No s&apos;ha pogut carregar l&apos;informe setmanal
          </p>
          <p className="text-xs text-[#6e7681] mt-1">
            Torna-ho a intentar més tard
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report header */}
          <div className="bg-[#161b22] border border-[#1e3a8a] rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1e3a8a] text-[#60a5fa] border border-[#1e3a8a]">
                    Informe setmanal
                  </span>
                  <span className="text-xs text-[#6e7681]">
                    Setmana {informe.semana}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#e6edf3] mb-1">
                  {formatDate(informe.fecha_desde)} —{' '}
                  {formatDate(informe.fecha_hasta)}
                </h2>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-[#6e7681]">Generat el</p>
                <p className="text-sm text-[#8b949e] mt-0.5">
                  {formatDate(informe.fecha_hasta)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#60a5fa]" />
                <span className="text-xs text-[#8b949e]">Municipis actius</span>
              </div>
              <p className="text-2xl font-bold text-[#e6edf3]">
                {informe.municipios_activos}
              </p>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#4ade80]" />
                <span className="text-xs text-[#8b949e]">Actes processades</span>
              </div>
              <p className="text-2xl font-bold text-[#e6edf3]">
                {informe.actas_procesadas}
              </p>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-[#fbbf24]" />
                <span className="text-xs text-[#8b949e]">Alertes generades</span>
              </div>
              <p className="text-2xl font-bold text-[#e6edf3]">
                {informe.alertas_generadas}
              </p>
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Executive summary */}
            <div className="col-span-2 space-y-4">
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
                  <FileText className="w-4 h-4 text-[#8b949e]" />
                  <h3 className="text-sm font-semibold text-[#e6edf3]">
                    Resum executiu
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-[#8b949e] leading-relaxed">
                    {informe.resumen_ejecutivo}
                  </p>
                </div>
              </div>

              {/* Destacados */}
              {informe.destacados.length > 0 && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
                    <CheckCircle2 className="w-4 h-4 text-[#8b949e]" />
                    <h3 className="text-sm font-semibold text-[#e6edf3]">
                      Destacats de la setmana
                    </h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {informe.destacados.map((destacado, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] text-[#60a5fa] font-bold">
                            {idx + 1}
                          </span>
                        </div>
                        <p className="text-sm text-[#8b949e] leading-relaxed">
                          {destacado}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actes destacades */}
              {informe.actas_destacadas.length > 0 && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
                    <Calendar className="w-4 h-4 text-[#8b949e]" />
                    <h3 className="text-sm font-semibold text-[#e6edf3]">
                      Actes destacades
                    </h3>
                  </div>
                  <div className="divide-y divide-[#21262d]">
                    {informe.actas_destacadas.map((acta) => (
                      <Link
                        key={acta.id}
                        href={`/actas/${acta.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-[#1c2128] transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-[#e6edf3] font-medium truncate group-hover:text-[#60a5fa] transition-colors">
                              {acta.municipio}
                            </p>
                            <p className="text-xs text-[#8b949e] truncate">
                              {acta.tipo} · {acta.puntos_count} punts
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[#6e7681] flex-shrink-0 ml-4">
                          {formatDate(acta.fecha)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Temas */}
            <div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
                  <TrendingUp className="w-4 h-4 text-[#8b949e]" />
                  <h3 className="text-sm font-semibold text-[#e6edf3]">
                    Temes de la setmana
                  </h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {informe.temas_semana.length === 0 ? (
                    <div className="text-center py-6">
                      <BarChart2 className="w-6 h-6 text-[#6e7681] mx-auto mb-2" />
                      <p className="text-xs text-[#8b949e]">Sense dades</p>
                    </div>
                  ) : (
                    (() => {
                      const maxMenciones = Math.max(
                        ...informe.temas_semana.map((t) => t.menciones),
                      );
                      return informe.temas_semana.map((tema) => (
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
                                width: `${(tema.menciones / maxMenciones) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
