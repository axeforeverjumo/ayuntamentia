"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2, AtSign, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const TEMPLATES = [
  { id: "tweet", label: "Tweet / X", icon: AtSign, prompt: "Genera un tweet (max 280 caràcters) impactant sobre un fet rellevant dels plens municipals recents. Ha de ser informatiu, citar el municipi i la data. En català." },
  { id: "post", label: "Post LinkedIn", icon: Share2, prompt: "Genera un post professional per LinkedIn sobre l'activitat municipal recent a Catalunya. 3-4 paràgrafs, to informatiu i analític. Cita dades concretes de municipis i dates. En català." },
  { id: "telegram", label: "Missatge Telegram", icon: MessageCircle, prompt: "Genera un missatge curt per un canal de Telegram d'actualitat política municipal. Directe, amb emojis, cita municipis i dades. En català." },
];

export function GeneradorRRSS() {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setContent("");
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: selected.prompt, history: [] }),
      });
      const d = await res.json();
      setContent(d.answer || "No s'ha pogut generar contingut.");
    } catch {
      setContent("Error al generar contingut.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
        <Share2 className="w-4 h-4 text-[#a78bfa]" />
        <h2 className="text-sm font-semibold text-[#e6edf3]">Generador de contingut RRSS</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Template selector */}
        <div className="flex gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors",
                selected.id === t.id
                  ? "bg-[#1c2128] border-[#2563eb] text-[#e6edf3]"
                  : "border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
              )}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {loading ? "Generant..." : `Generar ${selected.label}`}
        </button>

        {/* Output */}
        {content && (
          <div className="relative">
            <div className="p-4 rounded-lg bg-[#0d1117] border border-[#21262d] text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-1.5 rounded bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4ade80]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <p className="text-[10px] text-[#6e7681] mt-1 text-right">
              {content.length} caràcters
              {selected.id === "tweet" && content.length > 280 && " ⚠️ massa llarg per a AtSign"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
