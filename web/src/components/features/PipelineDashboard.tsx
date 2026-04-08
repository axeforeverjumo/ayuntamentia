"use client";

import { useEffect, useState } from "react";
import { Database, Download, FileText, Brain, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

interface PipelineData {
  pipeline: { status: string; count: number }[];
}

const STATUS_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  discovered: { icon: Database, label: "Catalogades", color: "text-[#8b949e]", bg: "bg-[#8b949e]" },
  downloaded: { icon: Download, label: "Descarregades", color: "text-[#60a5fa]", bg: "bg-[#60a5fa]" },
  extracted: { icon: FileText, label: "Text extret", color: "text-[#a78bfa]", bg: "bg-[#a78bfa]" },
  structured: { icon: Brain, label: "Processades per IA", color: "text-[#4ade80]", bg: "bg-[#4ade80]" },
  failed_download: { icon: AlertCircle, label: "Error descàrrega", color: "text-[#f87171]", bg: "bg-[#f87171]" },
  failed_extraction: { icon: AlertCircle, label: "Error extracció", color: "text-[#fbbf24]", bg: "bg-[#fbbf24]" },
  failed_structuring: { icon: AlertCircle, label: "Error IA", color: "text-[#f87171]", bg: "bg-[#f87171]" },
};

export function PipelineDashboard() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/dashboard/pipeline`)
        .then((r) => r.json())
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#2563eb] animate-spin" /></div>;
  if (!data) return null;

  const statuses = data.pipeline || [];
  const total = statuses.reduce((s, x) => s + x.count, 0);
  const structured = statuses.find((s) => s.status === "structured")?.count || 0;
  const failed = statuses.filter((s) => s.status.startsWith("failed")).reduce((s, x) => s + x.count, 0);
  const inProgress = total - structured - failed - (statuses.find((s) => s.status === "discovered")?.count || 0);
  const pct = total > 0 ? Math.round((structured / total) * 100) : 0;

  // ETA calculation: ~45 actas/hour based on current rate
  const remaining = total - structured;
  const etaHours = Math.round(remaining / 45);
  const etaDays = Math.round(etaHours / 24);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#4ade80]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Pipeline de processament</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-[10px] text-[#8b949e]">Actiu</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#e6edf3] font-medium">{structured.toLocaleString()} de {total.toLocaleString()} actes</span>
            <span className="text-[#4ade80] font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-[#0d1117] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#2563eb] to-[#4ade80] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-[#6e7681] mt-1">
            <span>{inProgress > 0 ? `${inProgress} en procés` : ""}</span>
            <span>ETA: ~{etaDays > 1 ? `${etaDays} dies` : `${etaHours}h`}</span>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {statuses
            .filter((s) => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((s) => {
              const cfg = STATUS_CONFIG[s.status] || { icon: Database, label: s.status, color: "text-[#8b949e]", bg: "bg-[#8b949e]" };
              const Icon = cfg.icon;
              return (
                <div key={s.status} className="flex items-center gap-2 px-3 py-2 rounded bg-[#0d1117] border border-[#21262d]">
                  <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-[#6e7681] truncate">{cfg.label}</p>
                    <p className={cn("text-sm font-bold", cfg.color)}>{s.count.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
