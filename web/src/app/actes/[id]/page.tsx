"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, FileText, ExternalLink, Users, CheckCircle2,
  XCircle, MinusCircle, Calendar, MapPin, AlertCircle, Loader2,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { ContextualChat } from "@/components/ui/ContextualChat";
import { visibleRoutes } from "@/lib/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function ActaDetailPage() {
  const params = useParams();
  const id = params.id;
  const [acta, setActa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/actas/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setActa(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#2563eb] animate-spin" />
      </div>
    );
  }

  if (error || !acta) {
    return (
      <div className="p-6">
        <Link href={visibleRoutes.cerca} className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Tornar a la cerca
        </Link>
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-[#30363d] rounded-lg">
          <AlertCircle className="w-10 h-10 text-[#f87171] mb-3" />
          <p className="text-sm text-[#8b949e]">No s&apos;ha pogut carregar l&apos;acta</p>
        </div>
      </div>
    );
  }

  const puntos = acta.puntos || [];
  const asistentes = acta.asistentes || [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link href={visibleRoutes.cerca} className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors">
        <ChevronLeft className="w-4 h-4" /> Tornar a la cerca
      </Link>

      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#8b949e]" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1e3a8a] text-[#60a5fa] border border-[#1e3a8a]">
                {acta.tipo || "ORDINÀRIA"}
              </span>
              <h1 className="text-xl font-bold text-[#e6edf3] mt-1">Ple municipal</h1>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                  <MapPin className="w-3.5 h-3.5" /> {acta.municipio || acta.nom_ens}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#8b949e]">
                  <Calendar className="w-3.5 h-3.5" /> {acta.fecha}
                </span>
                {acta.num_paginas && (
                  <span className="text-sm text-[#8b949e]">{acta.num_paginas} pàgines</span>
                )}
              </div>
            </div>
          </div>
          {acta.url_pdf && (
            <a href={acta.url_pdf} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
              <ExternalLink className="w-4 h-4" /> PDF original
            </a>
          )}
        </div>
        {acta.status && (
          <div className="mt-3 flex gap-2">
            <span className={cn("px-2 py-0.5 rounded text-xs",
              acta.status === "structured" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"
            )}>
              {acta.status === "structured" ? "Processada per IA" : `Estat: ${acta.status}`}
            </span>
            {acta.quality_score > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400">
                Qualitat: {acta.quality_score}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Puntos */}
        <div className="col-span-2 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
              <FileText className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Ordre del dia</h2>
              <span className="ml-auto text-xs text-[#6e7681]">{puntos.length} punts</span>
            </div>
            <div className="divide-y divide-[#21262d]">
              {puntos.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[#8b949e]">
                    {acta.status === "structured" ? "Sense punts registrats" : "Acta pendent de processament per IA"}
                  </p>
                  {acta.texto && (
                    <p className="text-xs text-[#6e7681] mt-2">Text extret: {(acta.num_caracteres || 0).toLocaleString()} caràcters</p>
                  )}
                </div>
              ) : (
                puntos.map((p: any, i: number) => {
                  const votaciones = Array.isArray(p.votaciones) ? p.votaciones : [];
                  const argumentos = Array.isArray(p.argumentos) ? p.argumentos : [];
                  return (
                    <div key={p.id || i} className="p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1c2128] border border-[#30363d] flex items-center justify-center text-xs font-bold text-[#8b949e]">
                          {p.numero || i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">{p.titulo}</h3>
                          {p.tema && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#1c2128] border border-[#30363d] text-[#8b949e] mb-2">
                              {p.tema}
                            </span>
                          )}
                          {p.resumen && <p className="text-xs text-[#8b949e] leading-relaxed mb-2">{p.resumen}</p>}
                          {p.resultado && (
                            <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium mb-2",
                              p.resultado === "aprobado" || p.resultado === "unanimidad" ? "bg-green-900/30 text-green-400" :
                              p.resultado === "rechazado" ? "bg-red-900/30 text-red-400" : "bg-gray-800 text-gray-400"
                            )}>
                              {p.resultado}
                            </span>
                          )}

                          {/* Votaciones */}
                          {votaciones.length > 0 && (
                            <div className="mt-2 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                              <p className="text-xs font-medium text-[#6e7681] mb-2">VOTACIÓ</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {votaciones.map((v: any, vi: number) => (
                                  <div key={vi} className="flex items-center justify-between text-xs">
                                    <span className="text-[#8b949e] truncate mr-2">{v.partido}</span>
                                    <span className={cn("font-medium flex-shrink-0",
                                      v.sentido === "a_favor" ? "text-[#4ade80]" :
                                      v.sentido === "en_contra" ? "text-[#f87171]" : "text-[#fbbf24]"
                                    )}>
                                      {v.sentido?.replace("_", " ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Argumentos */}
                          {argumentos.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              <p className="text-xs font-medium text-[#6e7681]">INTERVENCIONS</p>
                              {argumentos.map((a: any, ai: number) => (
                                <div key={ai} className="p-2 rounded bg-[#1c2128] border border-[#30363d]">
                                  <span className="text-xs font-medium text-[#e6edf3]">{a.partido}</span>
                                  <span className={cn("text-[10px] ml-2",
                                    a.posicion === "a_favor" ? "text-[#4ade80]" :
                                    a.posicion === "en_contra" ? "text-[#f87171]" : "text-[#fbbf24]"
                                  )}>
                                    {a.posicion?.replace("_", " ")}
                                  </span>
                                  <p className="text-xs text-[#8b949e] mt-1">{a.argumento}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#30363d]">
              <Users className="w-4 h-4 text-[#8b949e]" />
              <h2 className="text-sm font-semibold text-[#e6edf3]">Assistents</h2>
            </div>
            {asistentes.length > 0 ? (
              <div className="divide-y divide-[#21262d]">
                {asistentes.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                    {a.presente !== false ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[#e6edf3] truncate font-medium">{a.nombre}</p>
                      <p className="text-[10px] text-[#8b949e] truncate">
                        {a.partido}{a.cargo && ` · ${a.cargo}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8b949e] text-center py-6">Sense llista d&apos;assistents</p>
            )}
          </div>
        </div>
      </div>

      <ContextualChat
        contextType="acta"
        contextId={String(id)}
        contextLabel={`${acta.municipio || acta.nom_ens} · ${acta.fecha}`}
        contextPrompt={`CONTEXTO: Respon NOMÉS sobre l'acta del ple de ${acta.municipio || acta.nom_ens} del ${acta.fecha}, amb ${puntos.length} punts. ID acta: ${id}. `}
      />
    </div>
  );
}
