"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Users, FileText, TrendingUp, ChevronLeft,
  BarChart2, AlertCircle, CheckCircle2, Loader2, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function MunicipioDetailPage() {
  const params = useParams();
  const id = params.id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/municipios/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(true); else setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" /></div>;

  if (error || !data) {
    return (
      <div className="p-6">
        <Link href="/municipios" className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] mb-6">
          <ChevronLeft className="w-4 h-4" /> Municipis
        </Link>
        <div className="flex flex-col items-center py-20 bg-[#161b22] border border-[#30363d] rounded-lg">
          <AlertCircle className="w-10 h-10 text-[#f87171] mb-3" />
          <p className="text-sm text-[#8b949e]">No s&apos;ha pogut carregar el municipi</p>
        </div>
      </div>
    );
  }

  const composicion = data.composicion || [];
  const concejales = data.concejales || [];
  const plenos = data.ultimos_plenos || [];
  const temas = data.temas_frecuentes || [];
  const alertas = data.alertas || {};
  const maxComp = Math.max(...composicion.map((c: any) => c.count || 0), 1);

  return (
    <div className="p-6 space-y-6">
      <Link href="/municipios" className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3]">
        <ChevronLeft className="w-4 h-4" /> Municipis
      </Link>

      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
            <MapPin className="w-6 h-6 text-[#8b949e]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e6edf3]">{data.nombre}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#8b949e] flex-wrap">
              <span>{data.comarca}</span>
              <span>·</span>
              <span>{data.provincia}</span>
              {data.poblacion && <><span>·</span><span>{data.poblacion.toLocaleString()} hab.</span></>}
            </div>
            <div className="flex gap-2 mt-2">
              {data.tiene_ac && (
                <span className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Aliança Catalana present
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400">
                {data.actas_procesadas || 0} actes processades
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: composición + plenos */}
        <div className="col-span-2 space-y-4">
          {/* Composición */}
          {composicion.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
                <Users className="w-4 h-4 text-[#8b949e]" />
                <h2 className="text-sm font-semibold text-[#e6edf3]">Composició del ple</h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                {composicion.map((c: any) => (
                  <div key={c.partido} className="flex items-center gap-3">
                    <span className="text-xs text-[#e6edf3] w-32 truncate font-medium">{c.partido}</span>
                    <div className="flex-1 bg-[#1c2128] rounded-full h-3">
                      <div
                        className={cn("h-3 rounded-full",
                          c.partido.includes("ALIAN") ? "bg-[#2563eb]" : "bg-[#30363d]"
                        )}
                        style={{ width: `${(c.count / maxComp) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8b949e] w-6 text-right">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos plenos */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <FileText className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Últims plens</h2>
            </div>
            <div className="divide-y divide-[#21262d]">
              {plenos.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-8">Sense plens processats</p>
              ) : (
                plenos.map((p: any) => (
                  <Link key={p.id} href={`/actas/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#1c2128] transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[#6e7681]" />
                      <div>
                        <p className="text-sm text-[#e6edf3]">{p.fecha}</p>
                        <p className="text-xs text-[#8b949e]">{p.tipo} · {p.num_puntos} punts</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Concejales */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#30363d]">
              <Users className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Regidors ({concejales.length})</h2>
            </div>
            <div className="divide-y divide-[#21262d] max-h-80 overflow-y-auto">
              {concejales.map((c: any) => (
                <div key={c.id} className="px-4 py-2.5">
                  <p className="text-xs text-[#e6edf3] font-medium truncate">{c.nombre}</p>
                  <p className="text-[10px] text-[#8b949e]">{c.partido} · {c.cargo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Temas */}
          {temas.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#30363d]">
                <TrendingUp className="w-4 h-4 text-[#8b949e]" />
                <h2 className="text-sm font-semibold text-[#e6edf3]">Temes</h2>
              </div>
              <div className="px-4 py-3 space-y-2">
                {temas.map((t: any) => (
                  <div key={t.tema} className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">{t.tema}</span>
                    <span className="text-[#6e7681]">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#8b949e] mb-2">Alertes</h3>
            <div className="flex gap-3 text-xs">
              <span className="text-[#f87171]">🔴 {alertas.altas || 0}</span>
              <span className="text-[#fbbf24]">🟡 {alertas.medias || 0}</span>
              <span className="text-[#4ade80]">🟢 {alertas.bajas || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
