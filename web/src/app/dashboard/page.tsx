"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { MapaCatalunya } from "@/components/features/MapaCatalunya";
import { PipelineDashboard } from "@/components/features/PipelineDashboard";
import { GeneradorRRSS } from "@/components/features/GeneradorRRSS";
import { formatDate } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    total_municipios: 0,
    total_actas: 0,
    actas_procesadas: 0,
    total_votaciones: 0,
    alertas_pendientes: 0,
    cargos_activos: 0,
  });
  const [temas, setTemas] = useState<any[]>([]);
  const [coherencia, setCoherencia] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/api/dashboard/stats`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/temas`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/coherencia`).then((r) => r.json()),
      fetch(`${API}/api/dashboard/actividad-reciente`).then((r) => r.json()),
    ]).then(([s, t, c, a]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (t.status === "fulfilled") setTemas(Array.isArray(t.value) ? t.value : []);
      if (c.status === "fulfilled") setCoherencia(Array.isArray(c.value) ? c.value : []);
      if (a.status === "fulfilled") setActividad(Array.isArray(a.value) ? a.value : []);
      setLoading(false);
    });
  }, []);

  const maxMenciones =
    temas.length > 0 ? Math.max(...temas.map((t: any) => t.count || t.menciones || 1)) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Municipis monitorats" value={stats.total_municipios || 0} icon={Building2} variant="primary" />
        <StatCard label="Actes processades" value={stats.actas_procesadas || 0} icon={FileText} variant="default" />
        <StatCard label="Votacions" value={stats.total_votaciones || 0} icon={Vote} variant="green" />
        <StatCard label="Alertes pendents" value={stats.alertas_pendientes || 0} icon={Bell} variant={stats.alertas_pendientes > 0 ? "red" : "default"} />
      </div>

      {/* Map + Pipeline */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <MapaCatalunya />
        </div>
        <PipelineDashboard />
      </div>

      {/* Activity + RRSS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Activitat recent</h2>
            </div>
            <Link href="/buscar" className="text-xs text-[#2563eb] hover:text-[#60a5fa] transition-colors">
              Veure tot
            </Link>
          </div>
          <div className="divide-y divide-[#21262d]">
            {actividad.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-8 h-8 text-[#6e7681] mb-3" />
                <p className="text-sm text-[#8b949e]">No hi ha activitat recent</p>
                <p className="text-xs text-[#6e7681] mt-1">Les actes processades apareixeran aquí</p>
              </div>
            ) : (
              actividad.slice(0, 8).map((acta: any) => (
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
                        {acta.tipo} · {acta.num_puntos} punts
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#8b949e] flex-shrink-0 ml-4">{acta.fecha}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Temas trending compact */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <TrendingUp className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Temes tendència</h2>
            </div>
            <div className="px-5 py-4 space-y-2">
              {temas.length === 0 ? (
                <p className="text-xs text-[#8b949e] text-center py-4">Processant actes...</p>
              ) : (
                temas.slice(0, 7).map((tema: any) => (
                  <div key={tema.tema || tema.nombre} className="flex items-center justify-between">
                    <span className="text-xs text-[#e6edf3]">{tema.tema || tema.nombre}</span>
                    <span className="text-xs text-[#6e7681] bg-[#1c2128] px-2 py-0.5 rounded">{tema.count || tema.menciones}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RRSS Generator */}
          <GeneradorRRSS />
        </div>
      </div>
    </div>
  );
}
