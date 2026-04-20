'use client';

import { useState, useMemo } from 'react';
import { CornerBrack } from '@/components/landing/primitives';

interface MapPoint {
  nombre: string;
  lat: number;
  lng: number;
  actas?: number;
  alertas?: number;
  tiene_ac?: boolean;
}

interface Props {
  municipios: MapPoint[];
  filtroPartido?: string;
  onSelect?: (nombre: string) => void;
}

// Catalunya bounds approx: lat 40.5-42.9, lng 0.15-3.33
const LAT_MIN = 40.5, LAT_MAX = 42.9, LNG_MIN = 0.15, LNG_MAX = 3.33;
const W = 600, H = 440;

function toSVG(lat: number, lng: number): [number, number] {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;
  return [x, y];
}

function normalizeName(nombre: string): string {
  return nombre
    .replace(/^Ajuntament d[e']?\s*/i, '')
    .replace(/^Ajuntament del?\s*/i, '')
    .replace(/^Consell Comarcal d[e']?\s*/i, '')
    .trim();
}

const COORDS: Record<string, [number, number]> = {
  // Les 10 grans
  'Barcelona': [41.39, 2.17], 'Hospitalet de Llobregat': [41.36, 2.10],
  'Terrassa': [41.56, 2.01], 'Badalona': [41.45, 2.24],
  'Sabadell': [41.55, 2.11], 'Lleida': [41.62, 0.63],
  'Tarragona': [41.12, 1.25], 'Mataró': [41.54, 2.45],
  'Santa Coloma de Gramenet': [41.45, 2.21], 'Reus': [41.15, 1.11],
  // Capitals comarca
  'Girona': [41.98, 2.82], 'Manresa': [41.73, 1.83],
  'Vic': [41.89, 2.25], 'Figueres': [42.27, 2.96],
  'Olot': [42.18, 2.49], 'Ripoll': [42.20, 2.19],
  'Tortosa': [40.81, 0.52], 'Amposta': [40.71, 0.58],
  'Granollers': [41.61, 2.29], 'Vilafranca del Penedès': [41.35, 1.70],
  'Igualada': [41.58, 1.62], 'Berga': [42.10, 1.85],
  'Solsona': [41.99, 1.52], 'Cervera': [41.67, 1.27],
  'Balaguer': [41.79, 0.81], 'Tremp': [42.17, 0.89],
  'Sort': [42.41, 1.13], 'Vielha': [42.70, 0.80],
  'La Seu d\'Urgell': [42.36, 1.46], 'Puigcerdà': [42.43, 1.93],
  'Banyoles': [42.12, 2.77], 'El Vendrell': [41.22, 1.53],
  'Valls': [41.29, 1.25], 'Cambrils': [41.07, 1.06],
  'Gandesa': [41.05, 0.44], 'Falset': [41.15, 0.82],
  'Montblanc': [41.38, 1.16],
  // Àrea metropolitana BCN
  'Cornellà de Llobregat': [41.35, 2.07], 'Sant Boi de Llobregat': [41.34, 2.04],
  'El Prat de Llobregat': [41.32, 2.09], 'Viladecans': [41.32, 2.01],
  'Gavà': [41.31, 1.99], 'Castelldefels': [41.28, 1.98],
  'Esplugues de Llobregat': [41.38, 2.09], 'Sant Joan Despí': [41.37, 2.06],
  'Sant Feliu de Llobregat': [41.38, 2.04], 'Molins de Rei': [41.41, 2.02],
  'Sant Vicenç dels Horts': [41.39, 2.00], 'Martorell': [41.47, 1.93],
  'Sant Andreu de la Barca': [41.45, 1.97], 'Castellbisbal': [41.47, 1.98],
  'Cerdanyola del Vallès': [41.49, 2.14], 'Barberà del Vallès': [41.52, 2.13],
  'Ripollet': [41.50, 2.16], 'Montcada i Reixac': [41.48, 2.19],
  'Santa Perpètua de Mogoda': [41.53, 2.18], 'Mollet del Vallès': [41.54, 2.21],
  'Parets del Vallès': [41.57, 2.23], 'Sant Cugat del Vallès': [41.47, 2.08],
  'Rubí': [41.49, 2.03], 'Vilanova i la Geltrú': [41.22, 1.73],
  'Sitges': [41.24, 1.81], 'Sant Pere de Ribes': [41.26, 1.77],
  // Vallès + Maresme
  'Caldes de Montbui': [41.63, 2.17], 'Sentmenat': [41.63, 2.15],
  'Lliçà d\'Amunt': [41.61, 2.24], 'La Garriga': [41.68, 2.29],
  'Cardedeu': [41.64, 2.36], 'La Roca del Vallès': [41.59, 2.33],
  'Premià de Mar': [41.49, 2.36], 'El Masnou': [41.48, 2.31],
  'Vilassar de Mar': [41.50, 2.39], 'Arenys de Mar': [41.58, 2.55],
  'Canet de Mar': [41.59, 2.58], 'Sant Celoni': [41.69, 2.49],
  'Tordera': [41.70, 2.72], 'Blanes': [41.67, 2.79],
  'Lloret de Mar': [41.70, 2.85], 'Pineda de Mar': [41.63, 2.69],
  'Calella': [41.61, 2.65],
  // Girona comarca
  'Salt': [41.98, 2.79], 'Cassà de la Selva': [41.89, 2.87],
  'Palafrugell': [41.92, 3.16], 'Palamós': [41.85, 3.13],
  'Sant Feliu de Guíxols': [41.78, 3.03], 'Roses': [42.26, 3.17],
  'L\'Escala': [42.12, 3.13], 'Torroella de Montgrí': [42.05, 3.13],
  'La Bisbal d\'Empordà': [41.96, 3.05],
  // Lleida comarca
  'Tàrrega': [41.65, 1.14], 'Mollerussa': [41.63, 0.85],
  'Les Borges Blanques': [41.51, 0.86], 'Alcarràs': [41.58, 0.52],
  // Tarragona comarca
  'Salou': [41.08, 1.14], 'Vila-seca': [41.11, 1.15],
  'Torredembarra': [41.14, 1.40], 'Altafulla': [41.14, 1.38],
  'Calafell': [41.20, 1.57], 'Cunit': [41.20, 1.64],
  'Sant Carles de la Ràpita': [40.62, 0.59], 'Deltebre': [40.72, 0.72],
  // Catalunya central
  'Moià': [41.81, 2.10], 'Navàs': [41.88, 1.88],
  'Sallent': [41.83, 1.89], 'Artés': [41.80, 1.96],
  'Santpedor': [41.78, 1.84], 'Cardona': [41.91, 1.68],
  'Torelló': [41.88, 2.26], 'Sant Hipòlit de Voltregà': [41.88, 2.23],
  'Manlleu': [41.87, 2.28], 'Centelles': [41.79, 2.22],
  'Tona': [41.85, 2.22],
  // Pirineus
  'La Pobla de Segur': [42.25, 0.97], 'El Pont de Suert': [42.40, 0.74],
  'Esterri d\'Àneu': [42.63, 1.12],
};

export function MapaCatalunyaInteractiu({ municipios, filtroPartido, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<'tots' | 'ac' | 'actius'>('tots');

  const points = useMemo(() => {
    return municipios.map(m => {
      const normalized = normalizeName(m.nombre);
      const coord = COORDS[normalized];
      if (!coord) return null;
      const [x, y] = toSVG(coord[0], coord[1]);
      const heat = (m.actas || 0) + (m.alertas || 0) * 3;
      return { ...m, nombre: normalized, x, y, heat };
    }).filter(Boolean) as (MapPoint & { x: number; y: number; heat: number })[];
  }, [municipios]);

  const filtered = points.filter(p => {
    if (filter === 'ac') return p.tiene_ac;
    if (filter === 'actius') return p.heat > 0;
    return true;
  });

  const maxHeat = Math.max(...filtered.map(p => p.heat), 1);

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', position: 'relative' }}>
      <CornerBrack />
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
      }}>
        <span style={{ color: 'var(--bone)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, background: 'var(--wr-phosphor)', borderRadius: 1 }} />
          Mapa territorial · Catalunya
        </span>
        <div style={{ display: 'flex', gap: 1 }}>
          {(['tots', 'ac', 'actius'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 8px', background: filter === f ? 'var(--paper)' : 'transparent',
              color: filter === f ? 'var(--ink)' : 'var(--fog)', border: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {f === 'tots' ? 'Tots' : f === 'ac' ? 'AC' : 'Actius'}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="scanline" style={{
        position: 'relative', padding: 16,
        background: 'radial-gradient(ellipse at 50% 40%, var(--ink-3) 0%, var(--ink-2) 70%)',
        minHeight: 400,
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .3,
          backgroundImage: 'linear-gradient(to right, rgba(161,255,90,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(161,255,90,0.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          {/* Catalunya outline */}
          <path d="M 100 60 L 180 40 L 280 35 L 380 50 L 480 55 L 540 80 L 560 140 L 565 200 L 545 250 L 500 290 L 450 330 L 390 360 L 320 380 L 250 390 L 180 385 L 130 360 L 95 310 L 80 260 L 85 200 L 90 140 Z"
            fill="color-mix(in srgb, var(--wr-phosphor) 5%, var(--ink-2))" stroke="var(--wr-phosphor-dim)" strokeWidth="1" strokeDasharray="4 3" opacity=".8" />

          {/* Range rings from Barcelona */}
          {[60, 120, 180].map(r => (
            <circle key={r} cx={toSVG(41.39, 2.17)[0]} cy={toSVG(41.39, 2.17)[1]} r={r}
              fill="none" stroke="var(--wr-phosphor-dim)" strokeWidth="0.5" strokeDasharray="2 4" opacity=".3" />
          ))}

          {/* Points */}
          {filtered.map((p, i) => {
            const intensity = p.heat / maxHeat;
            const isHot = intensity > 0.6;
            const isAC = p.tiene_ac;
            const color = isHot ? 'var(--wr-red-2)' : isAC ? 'var(--wr-phosphor)' : 'var(--wr-amber)';
            const r = 3 + intensity * 5;
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(p.nombre)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(p.nombre)}>
                {isHot && (
                  <circle cx={p.x} cy={p.y} r="2" fill={color} opacity="0.3">
                    <animate attributeName="r" from="2" to={String(r * 3)} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p.x} cy={p.y} r={r} fill={color}
                  style={{ filter: `drop-shadow(0 0 ${isHot ? 6 : 3}px ${color})`, opacity: hover === p.nombre ? 1 : 0.85 }} />
                {(hover === p.nombre || isHot) && (
                  <text x={p.x + r + 3} y={p.y + 3} fill={color}
                    fontFamily="var(--font-mono)" fontSize="7" opacity="0.9">{p.nombre}</text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hover && (() => {
          const p = filtered.find(pp => pp.nombre === hover);
          if (!p) return null;
          return (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, padding: '10px 14px',
              background: 'var(--ink-3)', border: '1px solid var(--line)',
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper)',
              zIndex: 10, minWidth: 160,
            }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{p.nombre}</div>
              <div style={{ color: 'var(--fog)' }}>Actes: {p.actas || 0} · Alertes: {p.alertas || 0}</div>
              {p.tiene_ac && <div style={{ color: 'var(--wr-phosphor)', marginTop: 4 }}>● Presència AC</div>}
            </div>
          );
        })()}

        {/* HUD overlays */}
        <div style={{ position: 'absolute', top: 20, left: 20, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-phosphor-dim)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
          CRS · WGS84 · {filtered.length} punts
        </div>
        <div style={{ position: 'absolute', top: 20, right: 20, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', textAlign: 'right' }}>
          <span style={{ color: 'var(--wr-phosphor)' }}>● </span>LIVE
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--line)',
        display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
        letterSpacing: '.1em', textTransform: 'uppercase',
      }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--wr-red-2)', marginRight: 6 }} />Alta activitat</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--wr-phosphor)', marginRight: 6 }} />Presència AC</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--wr-amber)', marginRight: 6 }} />Altres</span>
        <span style={{ marginLeft: 'auto' }}>{filtered.length} / {points.length} municipis</span>
      </div>
    </div>
  );
}
