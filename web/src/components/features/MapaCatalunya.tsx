"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// Simplified Catalunya province boundaries (SVG viewBox 0 0 400 400)
const PROVINCES: Record<string, { path: string; label: string; center: [number, number] }> = {
  Lleida: {
    path: "M30,50 L180,30 L200,120 L210,200 L180,280 L100,300 L40,250 L20,160 Z",
    label: "Lleida",
    center: [110, 160],
  },
  Girona: {
    path: "M200,30 L380,40 L390,100 L370,180 L320,200 L280,180 L240,200 L210,200 L200,120 Z",
    label: "Girona",
    center: [300, 120],
  },
  Barcelona: {
    path: "M210,200 L240,200 L280,180 L320,200 L350,220 L380,280 L340,340 L280,360 L200,340 L180,280 Z",
    label: "Barcelona",
    center: [280, 280],
  },
  Tarragona: {
    path: "M40,250 L100,300 L180,280 L200,340 L280,360 L260,390 L140,400 L40,370 L20,300 Z",
    label: "Tarragona",
    center: [150, 340],
  },
};

interface MunicipioPoint {
  id: number;
  nombre: string;
  provincia: string;
  tiene_ac: boolean;
  actas_procesadas: number;
}

function provinceToCoords(provincia: string, index: number, total: number): [number, number] {
  const p = PROVINCES[provincia];
  if (!p) return [200, 200];
  const [cx, cy] = p.center;
  // Spread points around province center
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 20 + Math.random() * 40;
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

export function MapaCatalunya() {
  const [municipios, setMunicipios] = useState<MunicipioPoint[]>([]);
  const [stats, setStats] = useState<Record<string, { total: number; ac: number; procesadas: number }>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/municipios/?limit=200&tiene_ac=true`)
      .then((r) => r.json())
      .then((d) => {
        const results = d.results || d || [];
        if (Array.isArray(results)) setMunicipios(results);
      })
      .catch(() => {});

    // Get stats per province
    fetch(`${API}/api/dashboard/stats`)
      .then((r) => r.json())
      .then((d) => {
        setStats({
          total: d.total_municipios,
          procesadas: d.actas_procesadas,
          ac: d.municipios_ac,
        } as any);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Catalunya — 947 municipis</h3>
      <svg viewBox="0 0 420 420" className="w-full max-h-[300px]">
        {/* Province shapes */}
        {Object.entries(PROVINCES).map(([key, prov]) => (
          <g key={key}>
            <path
              d={prov.path}
              fill={hovered === key ? "#1e3a5f" : "#1c2128"}
              stroke="#30363d"
              strokeWidth="1.5"
              className="transition-colors cursor-pointer"
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            />
            <text
              x={prov.center[0]}
              y={prov.center[1] - 50}
              textAnchor="middle"
              fill="#6e7681"
              fontSize="11"
              fontWeight="600"
            >
              {prov.label}
            </text>
          </g>
        ))}

        {/* AC municipality markers */}
        {municipios.filter((m) => m.tiene_ac).map((m, i) => {
          const prov = m.provincia || "Barcelona";
          const byProv = municipios.filter((x) => x.provincia === prov);
          const idx = byProv.indexOf(m);
          const [x, y] = provinceToCoords(prov, idx, byProv.length);
          return (
            <g key={m.id}>
              <circle cx={x} cy={y} r="6" fill="#2563eb" opacity="0.8" className="animate-pulse" />
              <circle cx={x} cy={y} r="3" fill="#60a5fa" />
              <text x={x + 10} y={y + 4} fill="#e6edf3" fontSize="9" fontWeight="600">
                {m.nombre?.replace("Ajuntament de ", "").replace("Ajuntament d'", "")}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(300, 370)">
          <circle cx="0" cy="0" r="4" fill="#2563eb" />
          <text x="8" y="4" fill="#8b949e" fontSize="9">Presència AC</text>
        </g>
      </svg>

      {/* Hovered province info */}
      {hovered && (
        <div className="mt-2 px-3 py-2 bg-[#0d1117] rounded border border-[#30363d]">
          <p className="text-xs text-[#e6edf3] font-medium">{hovered}</p>
          <p className="text-[10px] text-[#8b949e]">
            {municipios.filter((m) => m.provincia === hovered).length > 0
              ? `${municipios.filter((m) => m.provincia === hovered && m.tiene_ac).length} municipis amb AC`
              : "Passa el cursor per veure detalls"
            }
          </p>
        </div>
      )}
    </div>
  );
}
