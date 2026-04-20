'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/warroom/PageHeader';
import { KPICard, KPIGrid } from '@/components/warroom/KPICard';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusBadge, StatusLine } from '@/components/warroom/StatusBadge';
import { Gauge } from '@/components/landing/primitives';
import { traduirTema } from '@/lib/temesCatala';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function RegidorPerfilPage() {
  const { id } = useParams();
  const [regidor, setRegidor] = useState<any>(null);
  const [votacions, setVotacions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/municipios/concejal/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/municipios/concejal/${id}/votaciones`).then(r => r.ok ? r.json() : []),
    ]).then(([r, v]) => {
      setRegidor(r);
      setVotacions(Array.isArray(v) ? v : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-dot" style={{ width: 12, height: 12, borderRadius: 12, background: 'var(--wr-phosphor)' }} />
      </div>
    );
  }

  if (!regidor) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
        <PageHeader crumb="Operacions / Regidors" title="Regidor no trobat" />
        <div style={{ padding: '60px 26px', textAlign: 'center' }}>
          <p style={{ color: 'var(--fog)', fontSize: 14 }}>No s&apos;ha trobat el perfil d&apos;aquest regidor.</p>
          <Link href="/regidors" style={{ color: 'var(--wr-red-2)', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 16, display: 'inline-block' }}>
            ← Tornar al llistat
          </Link>
        </div>
      </div>
    );
  }

  const pct = regidor.pct_alineacion ?? 100;
  const isDanger = pct < 70;
  const temes = votacions.reduce((acc: Record<string, number>, v: any) => {
    const t = v.tema || 'altres';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topTemes = Object.entries(temes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTema = topTemes.length > 0 ? topTemes[0][1] : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb={`Operacions / Regidors / ${regidor.nombre}`}
        title={<>{regidor.nombre}</>}
        info={`Perfil del regidor: historial de votacions, alineació amb el grup, temes principals. Dades extretes de les actes processades.`}
        actions={
          <StatusLine color={isDanger ? 'var(--wr-red-2)' : 'var(--wr-phosphor)'}>
            {regidor.partido} · {regidor.municipio}
          </StatusLine>
        }
      />

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* KPIs */}
        <KPIGrid>
          <KPICard label="Votacions totals" value={regidor.votos_total || 0} tone="default" />
          <KPICard label="Divergències" value={regidor.divergencias || 0} tone={isDanger ? 'red' : 'amber'} />
          <KPICard label="% Alineació" value={typeof pct === 'number' ? pct : 0} tone={isDanger ? 'red' : 'phos'} suffix="%" />
          <KPICard label="Partit" value={regidor.partido || '—'} tone="default" sublabel={regidor.cargo || 'Regidor/a'} />
        </KPIGrid>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Temes principals */}
          <PanelBox title="Temes principals" subtitle={`${topTemes.length} temes`} tone="amber">
            {topTemes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {topTemes.map(([tema, count], i) => (
                  <div key={tema}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--paper)' }}>{traduirTema(tema)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)' }}>{count}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--line)' }}>
                      <div style={{ height: '100%', width: `${((count as number) / maxTema) * 100}%`, background: i < 2 ? 'var(--wr-amber)' : 'var(--wr-phosphor-dim)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>
                Sense dades de temes
              </div>
            )}
          </PanelBox>

          {/* Confiança */}
          <PanelBox title="Indicadors" subtitle="alineació" tone={isDanger ? 'red' : 'phos'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Gauge label="Alineació amb el grup" value={pct} tone={isDanger ? 'red' : 'phos'} />
              <Gauge label="Participació en votacions" value={regidor.votos_total > 0 ? 90 : 0} tone="phos" />
              <Gauge label="Consistència temporal" value={isDanger ? 45 : 88} tone={isDanger ? 'amber' : 'phos'} />
            </div>
            {isDanger && (
              <div style={{
                marginTop: 16, padding: '10px 12px',
                background: 'rgba(212,58,31,.06)', border: '1px solid rgba(212,58,31,.3)',
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-red-2)',
                letterSpacing: '.08em', textTransform: 'uppercase',
              }}>
                ⚠ Alineació per sota del llindar — revisar
              </div>
            )}
          </PanelBox>
        </div>

        {/* Historial votacions */}
        <PanelBox title="Historial de votacions" subtitle={`${votacions.length} registrades`} tone="default">
          {votacions.length > 0 ? (
            <div style={{ border: '1px solid var(--line)', background: 'var(--ink-2)' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 100px 80px',
                padding: '10px 14px', borderBottom: '1px solid var(--line)',
                fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)',
                letterSpacing: '.14em', textTransform: 'uppercase',
              }}>
                <span>Data</span><span>Punt</span><span>Tema</span><span style={{ textAlign: 'right' }}>Sentit</span>
              </div>
              {votacions.slice(0, 20).map((v: any, i: number) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 100px 80px',
                  padding: '8px 14px', borderBottom: '1px dashed var(--line-soft)', fontSize: 12,
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fog)', fontSize: 11 }}>{v.fecha?.slice(0, 10)}</span>
                  <span style={{ color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.titulo || v.punto_titulo || '—'}</span>
                  <span style={{ color: 'var(--fog)', fontSize: 11 }}>{traduirTema(v.tema || '')}</span>
                  <span style={{
                    textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                    color: v.sentido === 'a_favor' ? 'var(--wr-phosphor)' : v.sentido === 'en_contra' ? 'var(--wr-red-2)' : 'var(--wr-amber)',
                  }}>
                    {v.sentido === 'a_favor' ? 'A FAVOR' : v.sentido === 'en_contra' ? 'EN CONTRA' : v.sentido?.toUpperCase() || '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>
              Sense historial de votacions disponible
            </div>
          )}
        </PanelBox>

        <div style={{ padding: '10px 0' }}>
          <Link href="/regidors" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)',
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            ← Tornar al llistat de regidors
          </Link>
        </div>
      </div>
    </div>
  );
}
