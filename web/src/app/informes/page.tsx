"use client";

import { useEffect, useState } from "react";
import {
  FileText, TrendingUp, Bell, BarChart2, Loader2, Users, RefreshCw,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function InformesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/informes/semanal`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Genera un informe semanal executiu sobre l'activitat als plens municipals. Inclou: resum, temes principals, votacions destacades d'AC, i recomanacions.",
          history: [],
        }),
      });
      const d = await res.json();
      setReport(d.answer || "No s'ha pogut generar l'informe.");
    } catch {
      setReport("Error al generar l'informe.");
    } finally {
      setGenerating(false);
    }
  };

  const actas = data?.actas_semana?.actas_semana ?? 0;
  const temas = data?.temas ?? [];
  const alertas = data?.alertas ?? [];
  const coherencia = data?.coherencia ?? [];
  const totalAlertas = alertas.reduce((s: number, a: any) => s + (a.n || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Informes</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">Resums i anàlisis de l&apos;activitat municipal</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? "Generant..." : "Generar informe amb IA"}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Actes processades (setmana)", value: actas, color: "text-[#2563eb]" },
          { icon: Bell, label: "Alertes", value: totalAlertas, color: "text-[#fbbf24]" },
          { icon: Users, label: "Concejals AC monitorats", value: coherencia.length || 7, color: "text-[#4ade80]" },
          { icon: BarChart2, label: "Temes detectats", value: temas.length, color: "text-[#8b5cf6]" },
        ].map((s, i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-[#e6edf3]">{s.value}</p>
            <p className="text-xs text-[#8b949e]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Generated report */}
      {report && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#2563eb]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Informe generat per IA</h2>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-[#8b949e]">
            {report.split("\n").map((line, i) => {
              if (line.startsWith("###")) return <h3 key={i} className="text-[#e6edf3] text-sm font-bold mt-4 mb-1">{line.replace(/^#+\s*/, "")}</h3>;
              if (line.startsWith("##")) return <h2 key={i} className="text-[#e6edf3] text-base font-bold mt-4 mb-1">{line.replace(/^#+\s*/, "")}</h2>;
              if (line.startsWith("#")) return <h1 key={i} className="text-[#e6edf3] text-lg font-bold mt-4 mb-2">{line.replace(/^#+\s*/, "")}</h1>;
              if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="ml-4 text-xs">• {line.replace(/^[-•]\s*/, "")}</p>;
              if (line.startsWith("**")) return <p key={i} className="text-[#e6edf3] text-xs font-semibold mt-2">{line.replace(/\*\*/g, "")}</p>;
              if (line.trim()) return <p key={i} className="text-xs leading-relaxed">{line}</p>;
              return <br key={i} />;
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Temas */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
            <TrendingUp className="w-4 h-4 text-[#8b949e]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Temes més debatuts</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-[#2563eb] animate-spin mx-auto" />
            ) : temas.length === 0 ? (
              <p className="text-xs text-[#8b949e] text-center py-4">Sense dades encara</p>
            ) : (
              temas.map((t: any, i: number) => {
                const max = Math.max(...temas.map((x: any) => x.n || x.count || 1));
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#e6edf3]">{t.tema || t.nombre}</span>
                      <span className="text-[#6e7681]">{t.n || t.count}</span>
                    </div>
                    <div className="h-1.5 bg-[#1c2128] rounded-full">
                      <div className="h-full bg-[#2563eb] rounded-full" style={{ width: `${((t.n || t.count) / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coherencia */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
            <Users className="w-4 h-4 text-[#8b949e]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Coherència concejals AC</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {loading ? (
              <Loader2 className="w-5 h-5 text-[#2563eb] animate-spin mx-auto" />
            ) : coherencia.length === 0 ? (
              <p className="text-xs text-[#8b949e] text-center py-4">Sense dades encara</p>
            ) : (
              coherencia.map((c: any, i: number) => {
                const score = c.indice_coherencia ?? 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-[#e6edf3] font-medium">{c.nombre}</p>
                        <p className="text-[10px] text-[#8b949e]">{c.municipio} · {c.total_votaciones} vots</p>
                      </div>
                      <span className="text-xs font-bold text-[#8b949e]">{score}%</span>
                    </div>
                    <div className="h-1 bg-[#1c2128] rounded-full">
                      <div
                        className={`h-full rounded-full ${score >= 80 ? "bg-[#4ade80]" : score >= 50 ? "bg-[#fbbf24]" : "bg-[#f87171]"}`}
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
  );
}
