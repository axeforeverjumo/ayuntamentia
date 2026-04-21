'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { AlertFeed, TrendingBar } from '@/components/warroom/AlertFeed';
import { traduirTema } from '@/lib/temesCatala';
const API = process.env.NEXT_PUBLIC_API_URL || '';

function GoogleMapCatalunya() {
  const isDark = typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme') !== 'light';
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '.08em',
        textTransform: 'uppercase', fontWeight: 500,
      }}>
        <span style={{ color: 'var(--text-meta)' }}>Mapa territorial · Catalunya</span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 400 }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d800000!2d1.7!3d41.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4v1"
          style={{
            width: '100%', height: '100%', minHeight: 400,
            border: 'none', display: 'block',
            filter: isDark ? 'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.3)' : 'none',
          }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {['+', '−'].map((label) => (
            <button
              key={label}
              onClick={() => window.open('https://www.google.com/maps/@41.7,1.7,9z', '_blank')}
              style={{
                width: 32, height: 32, background: 'var(--bg-surface)',
                border: '.5px solid var(--border)', borderRadius: 4,
                color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                fontSize: 18, fontWeight: 400, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
            "Usa 'Obrir War Room' per fer preguntes directes sobre les dades",
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
          <GoogleMapCatalunya />

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

        {/* Row 2: Intel stream + Últims plens */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        {/* Row 3: War Room CTA — full width */}
        <div style={{
          background: 'var(--bg-surface)', border: '.5px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '24px 28px',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <StatusBadge tone="red">WAR ROOM</StatusBadge>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-meta)', letterSpacing: '.08em', textTransform: 'uppercase' }}>5 modes d&apos;anàlisi</span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 500,
              color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-.01em',
            }}>
              Pregunta. <span style={{ color: 'var(--brand-l)' }}>Dispara.</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, maxWidth: 520 }}>
              Monitor · Atacar · Defensar · Comparar · Oportunitat. IA amb cita literal de les actes processades.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                'Què han dit sobre habitatge?',
                'Dossier contradiccions PP',
                'Speech pel ple de Vic',
              ].map((q, i) => (
                <Link key={i} href={`/chat?q=${encodeURIComponent(q)}`} style={{
                  padding: '6px 12px', textDecoration: 'none', borderRadius: 'var(--r-full)',
                  background: 'var(--bg-elevated)', border: '.5px solid var(--border)',
                  color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 12,
                }}>
                  {q}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/chat" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--brand)', color: '#E8F1F9', border: '1px solid var(--brand)',
            padding: '14px 24px', fontFamily: 'var(--font-mono)', fontSize: 13,
            letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500,
            textDecoration: 'none', borderRadius: 'var(--r-md)',
            whiteSpace: 'nowrap',
          }}>
            Obrir War Room →
          </Link>
        </div>
      </div>
    </div>
  );
}
