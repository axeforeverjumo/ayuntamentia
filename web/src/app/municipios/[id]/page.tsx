"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Users, FileText, ChevronLeft,
  AlertCircle, CheckCircle2, Loader2, Calendar,
} from "lucide-react";
import { ContextualChat } from "@/components/ui/ContextualChat";
import { PanelBox } from "@/components/warroom/PanelBox";
import { StatusBadge } from "@/components/warroom/StatusBadge";
import { APP_ROUTES, buildRoute } from "@/lib/routes";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function MunicipioDetailPage() {
  const params = useParams();
  const id = params.id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [alertasList, setAlertasList] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/municipios/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(true); else setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/alertas/?municipio_id=${id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAlertasList(Array.isArray(d) ? d : (d.results || [])))
      .catch(() => setAlertasList([]));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Loader2 style={{ width: 24, height: 24, color: 'var(--brand)' }} className="animate-spin" />
    </div>
  );

  if (error || !data) {
    return (
      <div style={{ padding: 24 }}>
        <Link href={APP_ROUTES.municipis} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-meta)', textDecoration: 'none', marginBottom: 24 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Municipis
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
          <AlertCircle style={{ width: 40, height: 40, color: '#dc2626', marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No s&apos;ha pogut carregar el municipi</p>
        </div>
      </div>
    );
  }

  const composicion = data.composicion || [];
  const concejales = data.concejales || [];
  const plenos = data.ultimos_plenos || [];
  const temas = data.temas_frecuentes || [];
  const alertas = data.alertas || {};
  const maxComp = Math.max(...composicion.map((c: any) => c.count || 0), 1);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Link href={APP_ROUTES.municipis} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-meta)', textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Municipis
      </Link>

      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin style={{ width: 22, height: 22, color: 'var(--text-meta)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>{data.nombre}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>{data.comarca}</span>
              <span>·</span>
              <span>{data.provincia}</span>
              {data.poblacion && <><span>·</span><span>{data.poblacion.toLocaleString()} hab.</span></>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {data.tiene_ac && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 11, background: 'rgba(22,163,74,.1)', border: '.5px solid rgba(22,163,74,.3)', color: '#16a34a' }}>
                  <CheckCircle2 style={{ width: 11, height: 11 }} /> Aliança Catalana present
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 11, background: 'rgba(15,76,129,.1)', border: '.5px solid rgba(15,76,129,.3)', color: 'var(--brand-l)' }}>
                {data.actas_procesadas || 0} actes processades
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Left: composición + plenos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Composición */}
          {composicion.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '.5px solid var(--border)' }}>
                <Users style={{ width: 14, height: 14, color: 'var(--text-meta)' }} />
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Composició del ple</h2>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {composicion.map((c: any) => (
                  <div key={c.partido} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)', width: 128, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.partido}</span>
                    <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 'var(--r-full)', height: 10, border: '.5px solid var(--border)' }}>
                      <div
                        style={{
                          height: 10, borderRadius: 'var(--r-full)',
                          background: c.partido.includes("ALIAN") ? 'var(--brand)' : '#8FA6BF',
                          width: `${(c.count / maxComp) * 100}%`,
                          boxShadow: c.partido.includes("ALIAN") ? 'none' : '0 0 0 .5px rgba(143,166,191,.4)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-meta)', width: 20, textAlign: 'right' }}>{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos plenos */}
          <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '.5px solid var(--border)' }}>
              <FileText style={{ width: 14, height: 14, color: 'var(--text-meta)' }} />
              <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Últims plens</h2>
            </div>
            <div>
              {plenos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-meta)', textAlign: 'center', padding: '32px 20px', margin: 0 }}>Sense plens processats</p>
              ) : (
                plenos.map((p: any) => (
                  <Link key={p.id} href={buildRoute('actes', p.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '.5px solid var(--border)', textDecoration: 'none', transition: 'background .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar style={{ width: 14, height: 14, color: 'var(--text-meta)' }} />
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 2px' }}>{p.fecha}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-meta)', margin: 0 }}>{p.tipo} · {p.num_puntos} punts</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Concejales */}
          <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '.5px solid var(--border)' }}>
              <Users style={{ width: 14, height: 14, color: 'var(--text-meta)' }} />
              <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Regidors ({concejales.length})</h2>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {concejales.map((c: any) => (
                <div key={c.id} style={{ padding: '8px 16px', borderBottom: '.5px solid var(--border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-meta)', margin: 0 }}>{c.partido} · {c.cargo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          <div style={{ background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-meta)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Alertes</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: '#dc2626' }}>🔴 {alertas.altas || 0}</span>
              <span style={{ color: '#d97706' }}>🟡 {alertas.medias || 0}</span>
              <span style={{ color: '#16a34a' }}>🟢 {alertas.bajas || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intel·ligència local */}
      <PanelBox title="Intel·ligència local" tone="amber" subtitle={`Temes emergents a ${data.nombre}`}>
        {temas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {temas.slice(0, 5).map((t: any) => (
              <div key={t.tema} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--bone)' }}>{t.tema}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--wr-amber)' }}>{t.count} mencions</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fog)' }}>
            Anàlisi en curs — les tendències locals apareixeran quan hi hagi prou actes processades
          </p>
        )}
      </PanelBox>

      {/* Alertes + Recepció social */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <PanelBox title="Alertes del municipi" tone="red" subtitle={data.nombre}>
          {alertasList.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--wr-phosphor)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              Cap alerta activa per aquest municipi
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alertasList.map((a: any, i: number) => (
                <div key={i} style={{ borderBottom: '1px dashed var(--line-soft)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--paper)', fontWeight: 500, fontSize: 13 }}>{a.titulo || a.title}</span>
                    <StatusBadge tone="red">{a.severitat || a.severidad || a.severity || 'alta'}</StatusBadge>
                  </div>
                  {(a.descripcio || a.descripcion) && (
                    <p style={{ fontSize: 12, color: 'var(--bone)', margin: 0 }}>{a.descripcio || a.descripcion}</p>
                  )}
                  {(a.fecha || a.data) && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', marginTop: 4 }}>{a.fecha || a.data}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelBox>

        <PanelBox title="Recepció social local" tone="phos" subtitle={`Mencions a premsa sobre ${data.nombre}`}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fog)' }}>
            Properament — el sistema monitorarà la premsa local d&apos;aquest municipi
          </p>
        </PanelBox>
      </div>

      <ContextualChat
        contextType="municipi"
        contextId={String(id)}
        contextLabel={data.nombre}
        contextPrompt={`Respon NOMÉS sobre el municipi de ${data.nombre} (${data.comarca}, ${data.provincia}). Utilitza les actes processades d'aquest municipi, les seves votacions i els seus regidors. No parlis d'altres municipis.`}
      />
    </div>
  );
}
