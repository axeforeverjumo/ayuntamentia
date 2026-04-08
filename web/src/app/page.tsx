import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  FileText,
  Vote,
  Bell,
  Clock,
  TrendingUp,
  BarChart2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { apiClient } from '@/lib/ApiClient';
import type {
  DashboardStats,
  Tema,
  Concejal,
  ActaResumen,
} from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// Fallback data for when the API is not available
const fallbackStats: DashboardStats = {
  municipios_monitorizados: 947,
  actas_procesadas: 0,
  votaciones: 0,
  alertas_pendientes: 0,
};

async function getStats(): Promise<DashboardStats> {
  try {
    return await apiClient.get<DashboardStats>('/api/dashboard/stats');
  } catch {
    return fallbackStats;
  }
}

async function getTemas(): Promise<Tema[]> {
  try {
    return await apiClient.get<Tema[]>('/api/dashboard/temas');
  } catch {
    return [];
  }
}

async function getCoherencia(): Promise<Concejal[]> {
  try {
    return await apiClient.get<Concejal[]>('/api/dashboard/coherencia');
  } catch {
    return [];
  }
}

async function getActividadReciente(): Promise<ActaResumen[]> {
  try {
    return await apiClient.get<ActaResumen[]>('/api/dashboard/actividad-reciente');
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, temas, concejales, actividad] = await Promise.all([
    getStats(),
    getTemas(),
    getCoherencia(),
    getActividadReciente(),
  ]);

  const maxMenciones = temas.length > 0
    ? Math.max(...temas.map((t) => t.menciones))
    : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Dashboard</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">
            Visió general de l&apos;activitat municipal a Catalunya
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-xs text-[#8b949e]">En temps real</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Municipis monitorats"
          value={stats.municipios_monitorizados}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          label="Actes processades"
          value={stats.actas_procesadas}
          icon={FileText}
          variant="default"
        />
        <StatCard
          label="Votacions"
          value={stats.votaciones}
          icon={Vote}
          variant="green"
        />
        <StatCard
          label="Alertes pendents"
          value={stats.alertas_pendientes}
          icon={Bell}
          variant={stats.alertas_pendientes > 0 ? 'red' : 'default'}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="col-span-2 bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Activitat recent
              </h2>
            </div>
            <Link
              href="/buscar"
              className="text-xs text-[#2563eb] hover:text-[#60a5fa] transition-colors"
            >
              Veure tot
            </Link>
          </div>

          <div className="divide-y divide-[#21262d]">
            {actividad.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-8 h-8 text-[#6e7681] mb-3" />
                <p className="text-sm text-[#8b949e]">
                  No hi ha activitat recent
                </p>
                <p className="text-xs text-[#6e7681] mt-1">
                  Les actes processades apareixeran aquí
                </p>
              </div>
            ) : (
              actividad.slice(0, 8).map((acta) => (
                <Link
                  key={acta.id}
                  href={`/actas/${acta.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#1c2128] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[#8b949e]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#e6edf3] font-medium truncate group-hover:text-[#60a5fa] transition-colors">
                        {acta.municipio}
                      </p>
                      <p className="text-xs text-[#8b949e] truncate">
                        {acta.tipo} · {acta.puntos_count} punts
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-[#8b949e]">
                      {formatDate(acta.fecha)}
                    </p>
                    <p className="text-[10px] text-[#6e7681] mt-0.5">
                      Processat {formatDate(acta.procesada_en)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Trending topics */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <TrendingUp className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">
                Temes tendència
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {temas.length === 0 ? (
                <div className="text-center py-6">
                  <BarChart2 className="w-6 h-6 text-[#6e7681] mx-auto mb-2" />
                  <p className="text-xs text-[#8b949e]">Sense dades</p>
                </div>
              ) : (
                temas.slice(0, 7).map((tema) => (
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
                        className="h-full bg-[#2563eb] rounded-full transition-all"
                        style={{
                          width: `${(tema.menciones / maxMenciones) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coherencia overview */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8b949e]" />
                <h2 className="text-sm font-semibold text-[#e6edf3]">
                  Coherència AC
                </h2>
              </div>
              <AlertCircle className="w-3.5 h-3.5 text-[#6e7681]" title="Puntuació de coherència del vot" />
            </div>
            <div className="px-5 py-4 space-y-3">
              {concejales.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-6 h-6 text-[#6e7681] mx-auto mb-2" />
                  <p className="text-xs text-[#8b949e]">Sense dades</p>
                </div>
              ) : (
                concejales.slice(0, 6).map((concejal) => {
                  const score = concejal.coherencia_score ?? 0;
                  const scoreColor =
                    score >= 80
                      ? 'bg-[#16a34a]'
                      : score >= 50
                        ? 'bg-[#d97706]'
                        : 'bg-[#dc2626]';

                  return (
                    <div key={concejal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-[#e6edf3] truncate font-medium">
                            {concejal.nombre}
                          </p>
                          <p className="text-[10px] text-[#8b949e] truncate">
                            {concejal.partido}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#8b949e] ml-2 flex-shrink-0">
                          {score}%
                        </span>
                      </div>
                      <div className="h-1 bg-[#1c2128] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${scoreColor}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
