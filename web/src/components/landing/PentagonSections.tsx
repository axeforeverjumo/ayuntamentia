'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MAP_POINTS, CAPABILITIES } from './data';
import { Tag, DotGrid, CornerBrack } from './primitives';

function PanelBox({ title, subtitle, tone = 'phos', big, children }: {
  title: string; subtitle: string; tone?: 'red' | 'amber' | 'phos'; big?: boolean; children: ReactNode;
}) {
  const toneColor = tone === 'red' ? 'var(--wr-red-2)' : tone === 'amber' ? 'var(--wr-amber)' : 'var(--wr-phosphor)';
  return (
    <div style={{ background: '#080808', border: '1px solid var(--line)', position: 'relative', minHeight: big ? 280 : 200 }}>
      <CornerBrack />
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
      }}>
        <span style={{ color: 'var(--bone)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, background: toneColor, borderRadius: 1 }} />
          {title}
        </span>
        <span style={{ color: 'var(--fog)' }}>{subtitle}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

function SignalSpectrum() {
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT(x => x + 1), 80); return () => clearInterval(id); }, []);
  const bars = 60;
  const heights = Array.from({ length: bars }, (_, i) => {
    const n = Math.sin((i + t) / 4) * 0.3 + Math.sin((i + t * 2) / 9) * 0.3 + Math.sin((i + t * 0.5) / 2.2) * 0.2 + 0.55;
    return Math.max(0.08, Math.min(1, n + (Math.random() - .5) * 0.12));
  });
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
        <div><div style={{ color: 'var(--bone)' }}>FREQ</div>2.4GHz · 5G/LTE · WiFi</div>
        <div><div style={{ color: 'var(--bone)' }}>GAIN</div>+24dB · RSSI -42</div>
        <div><div style={{ color: 'var(--wr-amber)' }}>ACTIVE NODES</div>947 / 947</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160, borderBottom: '1px solid var(--line)', paddingBottom: 2, borderLeft: '1px solid var(--line)', paddingLeft: 4 }}>
        {heights.map((h, i) => {
          const hot = h > 0.85;
          return (
            <div key={i} style={{
              flex: 1, height: `${h * 100}%`,
              background: hot ? 'linear-gradient(to top, var(--wr-red-2), var(--wr-amber))' : 'linear-gradient(to top, var(--wr-phosphor-dim), var(--wr-phosphor))',
              boxShadow: hot ? '0 0 6px var(--wr-red-2)' : 'none',
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--fog)', letterSpacing: '.14em' }}>
        <span>0.0</span><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span><span>GHz</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase' }}>
        <span style={{ color: 'var(--wr-phosphor)' }}>● 3 intercepts /s</span>
        <span style={{ color: 'var(--wr-amber)' }}>◆ 12 flagged</span>
        <span style={{ color: 'var(--wr-red-2)' }}>▲ 2 priority</span>
      </div>
    </div>
  );
}

function KillFeed() {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setIdx(x => x + 1), 1800); return () => clearInterval(id); }, []);
  const events = [
    { t: '-00:14', verb: 'NEUTRALITZAT', target: 'NARRATIVA · terrasses Vic', src: 'DSPC §4.2' },
    { t: '-00:47', verb: 'INTERCEPTAT', target: 'POST Twitter · @p·a · T+18min', src: 'OSINT·T' },
    { t: '-01:22', verb: 'COMPROMÈS', target: 'LÍDER LOCAL · Figueres', src: 'CROSS·REF' },
    { t: '-02:03', verb: 'TRACKED', target: 'VOT DIVERGENT · moció 214', src: 'ACTA·247' },
    { t: '-02:41', verb: 'REBATUT', target: 'CITA·FALSA · premsa local', src: 'FACT·K2' },
    { t: '-03:18', verb: 'LOCKED', target: 'CONTRADICCIÓ · 13 dies', src: 'DSPC·VIC' },
    { t: '-04:02', verb: 'FILTRAT', target: 'MEMO INTERN · partit B', src: 'HUMINT' },
    { t: '-05:17', verb: 'NEUTRALITZAT', target: 'MOCIÓ · ocupació', src: 'REPLY·C3' },
  ];
  const visible = Array.from({ length: 6 }, (_, i) => events[(idx + i) % events.length]);
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>
      {visible.map((e, i) => (
        <div key={idx + '-' + i} className="fade-up" style={{
          display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 8, padding: '6px 0',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          <span style={{ color: 'var(--fog)' }}>{e.t}</span>
          <div>
            <div style={{ color: 'var(--wr-red-2)', fontWeight: 700, letterSpacing: '.06em' }}>{e.verb}</div>
            <div style={{ color: 'var(--bone)', fontSize: 10, marginTop: 2 }}>{e.target}</div>
          </div>
          <span style={{ color: 'var(--wr-phosphor)', alignSelf: 'start' }}>{e.src}</span>
        </div>
      ))}
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--wr-red-2)', letterSpacing: '.14em', textAlign: 'right' }}>
        TOTAL TODAY · {47 + idx % 5} engagements →
      </div>
    </div>
  );
}

function TargetList() {
  const targets = [
    { id: 'T-017', name: 'Partit A · BCN', risc: 94, kind: 'HVT' },
    { id: 'T-021', name: 'Partit C · Vic', risc: 88, kind: 'HVT' },
    { id: 'T-034', name: 'Partit B · Figu.', risc: 76, kind: 'TGT' },
    { id: 'T-042', name: 'Partit D · Mataró', risc: 71, kind: 'TGT' },
    { id: 'T-055', name: 'Partit E · Reus', risc: 62, kind: 'TGT' },
  ];
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
      {targets.map((t, i) => {
        const hot = t.risc >= 85;
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 8, padding: '7px 0',
            borderBottom: '1px dashed var(--line-soft)',
          }}>
            <span style={{ color: hot ? 'var(--wr-red-2)' : 'var(--fog)', fontWeight: 700 }}>{t.id}</span>
            <div>
              <div style={{ color: 'var(--bone)', fontSize: 10.5 }}>{t.name}</div>
              <div style={{ color: 'var(--fog)', fontSize: 9, marginTop: 2 }}><span style={{ color: hot ? 'var(--wr-red-2)' : 'var(--wr-amber)' }}>{t.kind}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: hot ? 'var(--wr-red-2)' : 'var(--wr-amber)', fontWeight: 700 }}>{t.risc}%</div>
              <div style={{ height: 2, width: 40, background: '#111', marginTop: 3 }}>
                <div style={{ height: '100%', width: t.risc + '%', background: hot ? 'var(--wr-red-2)' : 'var(--wr-amber)' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssetStatus() {
  const assets = [
    { code: 'CELL·01', loc: 'BCN Central', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·02', loc: 'Vic / Osona', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·03', loc: 'Figueres', stat: 'DEGRADED', tone: 'amber' as const },
    { code: 'CELL·04', loc: 'Tarragona', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·05', loc: 'Reus', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·06', loc: 'Girona', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·07', loc: 'Lleida', stat: 'OP', tone: 'phos' as const },
    { code: 'CELL·08', loc: 'Mataró', stat: 'SILENT', tone: 'red' as const },
  ];
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
      {assets.map((a, i) => {
        const c = a.tone === 'red' ? 'var(--wr-red-2)' : a.tone === 'amber' ? 'var(--wr-amber)' : 'var(--wr-phosphor)';
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '62px 1fr auto', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ color: 'var(--fog)' }}>{a.code}</span>
            <span style={{ color: 'var(--bone)' }}>{a.loc}</span>
            <span style={{ color: c, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: c, borderRadius: 5 }} />
              {a.stat}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function OpsWall() {
  return (
    <div style={{ padding: '70px 28px', borderTop: '1px solid var(--line)', background: '#030303', position: 'relative' }}>
      <DotGrid size={24} opacity={0.1} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <Tag tone="red" style={{ marginBottom: 12 }}>◼ SITUATION ROOM · LIVE · T+04:12</Tag>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 68, margin: 0, letterSpacing: '-.02em', lineHeight: .92, color: 'var(--paper)' }}>
            El mur <span style={{ fontStyle: 'italic', color: 'var(--wr-red-2)' }}>que ells</span> mai veuran.
          </h2>
          <p style={{ color: 'var(--bone)', fontSize: 15, maxWidth: 640, marginTop: 14, lineHeight: 1.5 }}>
            Tots els senyals alhora — interceptacions de xarxa, missatges filtrats, votacions divergents,
            posició geogràfica de cada ping polític. El rival ho fa amb becaris i Excel. Nosaltres amb SIGINT.
          </p>
        </div>
        <div style={{
          padding: '14px 18px', border: '2px solid var(--wr-red-2)', background: 'rgba(212,58,31,.06)',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-red-2)', letterSpacing: '.2em',
          textTransform: 'uppercase', textAlign: 'right', minWidth: 260,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>◼ TS/SCI</div>
          <div style={{ color: 'var(--bone)', marginTop: 4 }}>NOFORN · ORCON · REL PARTIT</div>
          <div style={{ color: 'var(--wr-phosphor)', marginTop: 6 }}>● CHANNEL ACTIVE · AES-256</div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <PanelBox title="SIGINT · xarxes" subtitle="intercepts · T-60s" tone="amber" big>
          <SignalSpectrum />
        </PanelBox>
        <PanelBox title="kill feed" subtitle="engagements today" tone="red">
          <KillFeed />
        </PanelBox>
        <PanelBox title="target board" subtitle="hot · tracked" tone="red">
          <TargetList />
        </PanelBox>
      </div>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PanelBox title="asset status" subtitle="cells · operational" tone="amber">
          <AssetStatus />
        </PanelBox>
        <PanelBox title="cable traffic" subtitle="decrypted · internal" tone="phos">
          <CableTraffic />
        </PanelBox>
      </div>
    </div>
  );
}

function CableTraffic() {
  const cables = [
    { from: 'BCN·CP01', to: 'SALA·OPS', hdr: '[FLASH] — Acta 214·§4.2 desclassificada per anàlisi', body: "Partit A ha repetit l'argumentari #terrasses sense adaptar. Recomana resposta: cita literal del DSPC, 2 abr.", sev: 'FLASH' },
    { from: 'VIC·CP08', to: 'SALA·OPS', hdr: '[PRIORITY] — Moció 247 · vot divergent detectat', body: 'Regidora P·C vota en contra de la seva propia moció. Gap temporal: 11 dies.', sev: 'PRIO' },
    { from: 'FIG·CP03', to: 'SALA·OPS', hdr: '[ROUTINE] — OSINT · post @p_b_oficial flagged', body: 'Contradicció detectada amb programa electoral 2023 · p.18. Ready to publish.', sev: 'NORM' },
  ];
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, maxHeight: 230, overflow: 'hidden' }}>
      {cables.map((c, i) => (
        <div key={i} style={{ borderBottom: '1px dashed var(--line-soft)', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em' }}>
            <span>{c.from} → {c.to}</span>
            <span style={{ color: c.sev === 'FLASH' ? 'var(--wr-red-2)' : c.sev === 'PRIO' ? 'var(--wr-amber)' : 'var(--wr-phosphor)', fontWeight: 700 }}>{c.sev}</span>
          </div>
          <div style={{ color: 'var(--bone)', fontSize: 10.5, marginBottom: 3 }}>{c.hdr}</div>
          <div style={{ color: 'var(--fog)', fontSize: 9.5, lineHeight: 1.4 }}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}

export function CapabilitiesGrid() {
  return (
    <div style={{ padding: '80px 28px', borderTop: '1px solid var(--line)', background: '#040404', position: 'relative' }}>
      <DotGrid size={20} opacity={0.08} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <Tag tone="amber" style={{ marginBottom: 12 }}>◼ CAPABILITIES MATRIX · REV 4.2</Tag>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 72, margin: 0, letterSpacing: '-.025em', lineHeight: .92, color: 'var(--paper)' }}>
            Nou vectors.<br /><span style={{ fontStyle: 'italic', color: 'var(--wr-amber)' }}>Un sol enemic.</span>
          </h2>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', textAlign: 'right' }}>
          <div style={{ color: 'var(--bone)' }}>◼ DOCTRINE · AYTMT-INTEL·SOP</div>
          <div>Compilat · Q2·2026 · 112 pàgines</div>
          <div style={{ color: 'var(--wr-red-2)', marginTop: 6 }}>Accés: només direcció del partit</div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
        {CAPABILITIES.map((c, i) => (
          <div key={i} style={{ background: '#070707', padding: '22px 22px 24px', position: 'relative', minHeight: 180 }}>
            <CornerBrack />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.18em' }}>{c.code}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--wr-red-2)', letterSpacing: '.18em', border: '1px solid var(--wr-red-2)', padding: '2px 6px' }}>{c.clas}</div>
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, margin: '0 0 10px', fontWeight: 400, lineHeight: 1 }}>{c.n}</h3>
            <p style={{ fontSize: 12, color: 'var(--bone)', margin: 0, lineHeight: 1.5 }}>{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MissionCTA({ onEnter }: { onEnter: () => void }) {
  const [t, setT] = useState({ d: 4, h: 12, m: 47, s: 22 });
  useEffect(() => {
    const id = setInterval(() => setT(x => {
      let s = x.s - 1, m = x.m, h = x.h, d = x.d;
      if (s < 0) { s = 59; m--; }
      if (m < 0) { m = 59; h--; }
      if (h < 0) { h = 23; d--; }
      if (d < 0) return x;
      return { d, h, m, s };
    }), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: '90px 28px 110px', borderTop: '1px solid var(--line)', position: 'relative', overflow: 'hidden', background: '#030303' }}>
      <DotGrid size={28} opacity={0.14} />
      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <Tag tone="red" style={{ marginBottom: 20 }}>◼ MISSION WINDOW · PLE MUNICIPAL</Tag>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 'clamp(56px, 7.5vw, 108px)',
              margin: '0 0 22px', lineHeight: .9, letterSpacing: '-.025em', color: 'var(--paper)',
            }}>
              Mentre llegeixes això<br />
              <span style={{ fontStyle: 'italic', color: 'var(--wr-red-2)' }}>ells us guanyen.</span>
            </h2>
            <p style={{ fontSize: 17, color: 'var(--bone)', maxWidth: 540, marginBottom: 30, lineHeight: 1.5 }}>
              El proper ple municipal és en <strong style={{ color: 'var(--paper)' }}>{t.d} dies · {String(t.h).padStart(2, '0')} hores</strong>. Els vostres rivals entraran amb becaris i Excel.
              Vosaltres podríeu entrar-hi amb un <strong style={{ color: 'var(--wr-red-2)' }}>dossier de 14 peces, cites literals i 5 rèpliques preparades</strong>.
            </p>
            <button onClick={onEnter} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--wr-red)', color: 'var(--paper)', border: '1px solid var(--wr-red)',
              padding: '18px 26px', fontFamily: 'var(--font-mono)', fontSize: 13,
              letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 40px -8px rgba(255,90,60,.7)',
            }}>◼ AUTORITZAR DESPLEGAMENT →</button>
            <div style={{ marginTop: 30, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
              <span>RGPD · anonim. per rol</span>
              <span>Audit log</span>
              <span>Supabase JWT · RLS</span>
              <span>Self-hosted EU</span>
            </div>
          </div>
          <div style={{ border: '1px solid var(--wr-red)', background: 'rgba(212,58,31,.05)', padding: 28, position: 'relative' }}>
            <CornerBrack />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-red-2)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>
              ◼ T MINUS · PLE ORDINARI · VIC · 22 ABR 2026
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
              {([['D', t.d], ['H', t.h], ['M', t.m], ['S', t.s]] as [string, number][]).map(([k, v], i) => (
                <div key={i} style={{ background: '#060606', border: '1px solid var(--line)', padding: '16px 6px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 58, color: 'var(--paper)', lineHeight: 1, fontStyle: 'italic' }}>{String(v).padStart(2, '0')}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.2em', marginTop: 6 }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'grid', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--bone)' }}>
              {[
                ['Dossier ready', '✓ 14 peces', 'var(--wr-phosphor)'],
                ['Cites literals', '✓ 9 disponibles', 'var(--wr-phosphor)'],
                ['Rèpliques preparades', '✓ 5 escenaris', 'var(--wr-phosphor)'],
                ['Risc operatiu rival', '⚠ 74% · ALT', 'var(--wr-red-2)'],
              ].map(([l, v, c], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--fog)' }}>{l}</span>
                  <span style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
