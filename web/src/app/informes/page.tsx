'use client';

import { Suspense, useEffect, useState } from 'react';
import { Loader2, RefreshCw, FileText, Users } from 'lucide-react';
import { PageHeader } from '@/components/warroom/PageHeader';
import { HelpBanner } from '@/components/warroom/HelpBanner';
import { PanelBox } from '@/components/warroom/PanelBox';
import { StatusLine, StatusBadge } from '@/components/warroom/StatusBadge';
import { TrendingBar } from '@/components/warroom/AlertFeed';
import { traduirTema } from '@/lib/temesCatala';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const TABS = [
  { id: 'biblioteca', label: 'Biblioteca', color: 'var(--bone)' },
  { id: 'subscripcions', label: 'Subscripcions', color: 'var(--wr-amber)' },
  { id: 'generar', label: 'Generar amb IA', color: 'var(--wr-red-2)' },
] as const;

export default function InformesPage() {
  const [tab, setTab] = useState('biblioteca');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/informes/semanal`)
      .then(r => r.json()).then(setData).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  const coherencia = data?.coherencia ?? [];
  const maxTema = temas.length > 0 ? Math.max(...temas.map((t: any) => t.n || t.count || 1)) : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Informes"
        title={<>Informes i <em style={{ color: 'var(--bone)', fontWeight: 400 }}>subscripcions.</em></>}
        info="Biblioteca d'informes generats, subscripcions automàtiques i generació d'informes sota demanda amb IA."
        actions={<StatusLine color="var(--wr-phosphor)">Informe setmanal · {actas} actes</StatusLine>}
      />
      <HelpBanner
        pageKey="informes"
        title="Informes i subscripcions"
        description="Biblioteca d'informes generats i sistema de briefs automàtics. Pots generar un informe executiu sota demanda amb la IA, o configurar subscripcions per rebre resums periòdics per email o Telegram."
        dataSource="Generació automàtica basada en les actes processades de la setmana"
        tips={[
          "L'informe generat amb IA és perfecte per reunions de direcció",
          "Configura subscripcions per rebre un brief cada dilluns amb el resum setmanal",
          "Pots personalitzar els temes i municipis de cada subscripció",
        ]}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 16px', background: tab === t.id ? 'var(--ink-3)' : 'transparent',
            border: 'none', borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            borderRight: '1px solid var(--line)',
            color: tab === t.id ? 'var(--paper)' : 'var(--fog)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 26px' }}>
        {tab === 'biblioteca' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PanelBox title="Temes més debatuts" subtitle="setmana" tone="amber">
              {loading ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--wr-amber)' }} /></div>
              ) : temas.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>Sense dades encara</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {temas.map((t: any, i: number) => (
                    <TrendingBar key={i} label={traduirTema(t.tema || t.nombre)} value={t.n || t.count || 0} max={maxTema} tone={i < 2 ? 'red' : 'amber'} />
                  ))}
                </div>
              )}
            </PanelBox>

            <PanelBox title="Coherència regidors AC" subtitle="alineació" tone="phos">
              {loading ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--wr-phosphor)' }} /></div>
              ) : coherencia.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)' }}>Sense dades encara</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {coherencia.map((c: any, i: number) => {
                    const score = c.indice_coherencia ?? 100;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--paper)' }}>{c.nombre}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: score >= 80 ? 'var(--wr-phosphor)' : score >= 50 ? 'var(--wr-amber)' : 'var(--wr-red-2)', fontWeight: 700 }}>{score}%</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--line)' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? 'var(--wr-phosphor)' : score >= 50 ? 'var(--wr-amber)' : 'var(--wr-red-2)' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', marginTop: 2 }}>{c.municipio} · {c.total_votaciones} vots</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelBox>
          </div>
        )}

        {tab === 'subscripcions' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 12 }}>
              Subscripcions
            </div>
            <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Rep briefs automàtics per email o Telegram amb els temes que t&apos;interessen. Configura la freqüència i els filtres.
            </p>
            <a href="/suscripciones" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--wr-amber)', color: 'var(--ink)', border: 'none',
              padding: '12px 18px', fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
              textDecoration: 'none',
            }}>◼ GESTIONAR SUBSCRIPCIONS →</a>
          </div>
        )}

        {tab === 'generar' && (
          <div>
            <div style={{ textAlign: 'center', padding: '40px 0 30px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--paper)', marginBottom: 12 }}>
                Generar informe <em style={{ color: 'var(--wr-red-2)' }}>sota demanda</em>
              </div>
              <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
                La IA analitza totes les dades processades i genera un informe executiu complet.
              </p>
              <button onClick={generateReport} disabled={generating} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--wr-red)', color: 'var(--paper)', border: '1px solid var(--wr-red)',
                padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12,
                letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
                cursor: 'pointer', opacity: generating ? 0.5 : 1,
                boxShadow: '0 0 24px -6px rgba(255,90,60,.4)',
              }}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generating ? 'Generant...' : '◼ GENERAR INFORME →'}
              </button>
            </div>

            {report && (
              <PanelBox title="Informe generat" subtitle="IA" tone="phos">
                <div className="markdown-body" style={{ fontSize: 13 }}>
                  {report.split('\n').map((line, i) => {
                    if (line.startsWith('###')) return <h3 key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper)', margin: '16px 0 6px', fontWeight: 400 }}>{line.replace(/^#+\s*/, '')}</h3>;
                    if (line.startsWith('##')) return <h2 key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--paper)', margin: '16px 0 6px', fontWeight: 400 }}>{line.replace(/^#+\s*/, '')}</h2>;
                    if (line.startsWith('#')) return <h1 key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--paper)', margin: '16px 0 8px', fontWeight: 400 }}>{line.replace(/^#+\s*/, '')}</h1>;
                    if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} style={{ marginLeft: 16, fontSize: 12, color: 'var(--bone)' }}>• {line.replace(/^[-•]\s*/, '')}</p>;
                    if (line.trim()) return <p key={i} style={{ fontSize: 12, color: 'var(--bone)', lineHeight: 1.5 }}>{line}</p>;
                    return <br key={i} />;
                  })}
                </div>
              </PanelBox>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
