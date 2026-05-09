'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { traduirTema } from '@/lib/temesCatala';
import { buildRoute } from '@/lib/routes';
const API = process.env.NEXT_PUBLIC_API_URL || '';

const MapaCatalunyaLeaflet = dynamic(
  () => import('@/components/features/MapaCatalunyaLeaflet').then(m => m.MapaCatalunyaLeaflet),
  { ssr: false, loading: () => (
    <div style={{
      background: 'var(--bg-surface)', border: '.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', minHeight: 460, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-meta)',
      letterSpacing: '.1em', textTransform: 'uppercase',
    }}>
      Carregant mapa…
    </div>
  )}
);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [temas, setTemas] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any>({ total: 0, nuevas: 0, altas_nuevas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/api/dashboard/stats`).then(r => r.json()),
      fetch(`${API}/api/dashboard/temas`).then(r => r.json()),
      fetch(`${API}/api/dashboard/actividad-reciente`).then(r => r.json()),
      fetch(`${API}/api/alertas/stats`).then(r => r.json()),
    ]).then(([s, t, a, al]) => {
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') setTemas(Array.isArray(t.value) ? t.value : []);
      if (a.status === 'fulfilled') setActividad(Array.isArray(a.value) ? a.value : []);
      if (al.status === 'fulfilled') setAlertas(al.value);
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
        info={{
          title: 'Dashboard executiu',
          description: "Visió global de tota l'activitat política a Catalunya. Aquí veus en 10 segons els KPIs principals, l'activitat recent, els temes que estan escalant i l'estat del sistema. És la primera pantalla que hauries de mirar cada matí.",
          dataSource: '54.410 actes processades · 228.124 votacions · 947 municipis · actualització cada 15 min',
          tips: [
            'Els KPIs es comparen amb el període anterior — vermell = ha baixat, verd = ha pujat',
            "Clica un municipi al mapa per veure'n el detall",
            "Usa 'Obrir Sala d'Intel·ligència' per fer preguntes directes sobre les dades",
          ],
        }}
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

        {/* Row 1: Mapa (wide) + Temes trending */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <MapaCatalunyaLeaflet />

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

        {/* Row 2: Últims plens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <PanelBox title="Últims plens processats" subtitle={`${actividad.length} recents`} tone="phos">
            {actividad.length > 0 ? (
              <div>
                {actividad.slice(0, 6).map((acta: any, i: number) => (
                  <Link key={i} href={buildRoute('actes', acta.id)} style={{
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
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 500, color: 'var(--paper)', marginBottom: 8 }}>
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
