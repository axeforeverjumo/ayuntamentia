'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { AlertFeed, TrendingBar } from '@/components/warroom/AlertFeed';
import { TacticalRadar } from '@/components/landing/TacticalRadar';
import { traduirTema } from '@/lib/temesCatala';
import { Gauge, DotGrid, CornerBrack } from '@/components/landing/primitives';
import { MapaCatalunyaInteractiu } from '@/components/warroom/MapaCatalunya';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [temas, setTemas] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any>({ total: 0, nuevas: 0, altas_nuevas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/api/dashboard/stats`).then(r => r.json()),
      fetch(`${API}/api/dashboard/temas`).then(r => r.json()),
      fetch(`${API}/api/dashboard/actividad-reciente`).then(r => r.json()),
      fetch(`${API}/api/alertas/stats`).then(r => r.json()),
      fetch(`${API}/api/municipios/`).then(r => r.json()),
    ]).then(([s, t, a, al, m]) => {
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') setTemas(Array.isArray(t.value) ? t.value : []);
      if (a.status === 'fulfilled') setActividad(Array.isArray(a.value) ? a.value : []);
      if (al.status === 'fulfilled') setAlertas(al.value);
      if (m.status === 'fulfilled') setMunicipios(Array.isArray(m.value) ? m.value : []);
      setLoading(false);
    });
  }, []);

  const maxMenciones = temas.length > 0 ? Math.max(...temas.map((t: any) => t.count || t.menciones || 1)) : 1;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot" style={{
            width: 12, height: 12, borderRadius: 12,
            background: 'var(--wr-phosphor)', boxShadow: '0 0 20px var(--wr-phosphor)',
            margin: '0 auto 16px',
          }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            Carregant intel·ligència...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Dashboard"
        title={<>Visió <em style={{ color: 'var(--fog)', fontWeight: 400 }}>executiva.</em></>}
        info="Visió global del sistema: KPIs principals, alertes crítiques, activitat recent i temes en tendència. Dades actualitzades cada 15 minuts."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <StatusLine color="var(--wr-phosphor)">
              Pipeline actiu · {(stats.actas_procesadas || 0).toLocaleString('es-ES')} actes
            </StatusLine>
            <button onClick={() => window.print()} style={{
              padding: '6px 12px', background: 'transparent', border: '1px solid var(--line)',
              color: 'var(--bone)', fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              ▸ PDF
            </button>
          </div>
        }
      />

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPIs */}
        <KPIGrid>
          <KPICard label="Municipis monitorats" value={stats.total_municipios || 947} tone="phos" />
          <KPICard label="Actes processades" value={stats.actas_procesadas || 0} tone="default" />
          <KPICard label="Votacions registrades" value={stats.total_votaciones || 0} tone="default" />
          <KPICard
            label="Alertes pendents"
            value={alertas.nuevas || stats.alertas_pendientes || 0}
            tone={(alertas.altas_nuevas || 0) > 0 ? 'red' : 'phos'}
            sublabel={(alertas.altas_nuevas || 0) > 0 ? `${alertas.altas_nuevas} crítiques` : 'Cap alerta crítica'}
          />
        </KPIGrid>

        {/* Main grid: Radar + Alertes + Temes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 12 }}>

          {/* Mapa Catalunya interactiu */}
          <MapaCatalunyaInteractiu
            municipios={municipios.map((m: any) => ({
              nombre: m.nombre,
              lat: 0, lng: 0,
              actas: m.actas_procesadas || 0,
              alertas: 0,
              tiene_ac: m.tiene_ac || false,
            }))}
          />

          {/* Feed alertes / activitat */}
          <PanelBox title="Intel stream" subtitle="últimes 24h" tone="red">
            {actividad.length > 0 ? (
              <AlertFeed items={actividad.slice(0, 8).map((a: any) => ({
                time: a.fecha?.slice(5, 10) || '',
                severity: 'media' as const,
                type: a.tipo || 'ACTA',
                text: `${a.municipio} — ${a.tipo || 'Ordinària'} · ${a.num_puntos || 0} punts`,
                municipio: a.municipio,
              }))} maxVisible={6} />
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Esperant noves actes...
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginTop: 8 }}>
                  El pipeline processa actes cada 15 minuts
                </div>
              </div>
            )}
          </PanelBox>

          {/* Temes trending */}
          <PanelBox title="Temes en tendència" subtitle={`top ${Math.min(temas.length, 8)}`} tone="amber">
            {temas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {temas.slice(0, 8).map((tema: any, i: number) => (
                  <TrendingBar
                    key={i}
                    label={traduirTema(tema.tema || tema.nombre || '—')}
                    value={tema.count || tema.menciones || 0}
                    max={maxMenciones}
                    tone={i < 2 ? 'red' : i < 5 ? 'amber' : 'phos'}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Processant temes...
              </div>
            )}
          </PanelBox>
        </div>

        {/* Bottom: War Room access + últims plens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>

          {/* War Room quick access */}
          <div style={{
            background: '#050505', border: '1px solid var(--line)',
            padding: '28px 24px', position: 'relative', overflow: 'hidden',
          }}>
            <CornerBrack />
            <DotGrid size={24} opacity={0.06} />
            <div style={{ position: 'relative' }}>
              <StatusBadge tone="red">◼ WAR ROOM · 5 MODES</StatusBadge>
              <h2 style={{
                fontFamily: 'var(--font-serif)', fontSize: 36, margin: '16px 0 12px',
                lineHeight: 1, letterSpacing: '-.01em', color: 'var(--paper)', fontWeight: 400,
              }}>
                Pregunta. <em style={{ color: 'var(--wr-red-2)' }}>Dispara.</em>
              </h2>
              <p style={{ fontSize: 13, color: 'var(--bone)', lineHeight: 1.5, margin: '0 0 20px', maxWidth: 400 }}>
                Monitor · Atacar · Defensar · Comparar · Oportunitat. Cada mode preparat per donar-te munició política amb cita literal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {[
                  'Què han dit sobre habitatge el darrer mes?',
                  'Dossier contradiccions Partit A · civisme',
                  'Prepara speech pel proper ple de Vic',
                ].map((q, i) => (
                  <Link key={i} href={`/chat?q=${encodeURIComponent(q)}`} style={{
                    display: 'block', padding: '8px 12px', textDecoration: 'none',
                    background: 'transparent', border: '1px dashed var(--line)',
                    color: 'var(--bone)', fontFamily: 'var(--font-sans)', fontSize: 12,
                  }}>
                    → {q}
                  </Link>
                ))}
              </div>

              <Link href="/chat" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--wr-red)', color: 'var(--paper)', border: '1px solid var(--wr-red)',
                padding: '12px 18px', fontFamily: 'var(--font-mono)', fontSize: 12,
                letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 0 24px -6px rgba(255,90,60,.4)',
              }}>
                ◼ OBRIR WAR ROOM →
              </Link>
            </div>
          </div>

          {/* Últims plens */}
          <PanelBox title="Últims plens processats" subtitle={`${actividad.length} recents`} tone="phos">
            {actividad.length > 0 ? (
              <div>
                {actividad.slice(0, 6).map((acta: any, i: number) => (
                  <Link key={i} href={`/actas/${acta.id}`} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 10, padding: '10px 0',
                    borderBottom: i < 5 ? '1px dashed var(--line-soft)' : 'none',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}>{acta.municipio}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', marginTop: 2 }}>
                        {acta.tipo || 'Ordinària'} · {acta.num_puntos || 0} punts
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', textAlign: 'right' }}>
                      {acta.fecha}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--paper)', marginBottom: 8 }}>
                  Properament
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Els plens processats apareixeran aquí
                </div>
              </div>
            )}
          </PanelBox>
        </div>
      </div>
    </div>
  );
}
