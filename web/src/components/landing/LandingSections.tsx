'use client';

import { useEffect, useState } from 'react';
import { INTEL_FEED, CONTRADICTIONS, TERMINAL_PRESETS, RIVALS, THREAT_TOPICS } from './data';
import { Tag, StatusLine, DotGrid, SevDot, CornerBrack } from './primitives';
import { LiveIntelPanel } from './LiveIntelPanel';

const ctaPrimary = {
  display: 'inline-flex' as const, alignItems: 'center' as const, gap: 8,
  background: 'var(--wr-red)', color: 'var(--paper)', border: '1px solid var(--wr-red)',
  padding: '13px 18px', fontFamily: 'var(--font-mono)',
  fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' as const, fontWeight: 700, cursor: 'pointer',
};

export function LandingNav({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 28px', borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, position: 'relative',
          border: '1px solid var(--paper)', display: 'grid', placeItems: 'center',
          background: 'var(--paper)', color: 'var(--ink)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 20 L12 3 L20 20 Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 20 L12 12 L16 20" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="7" r="1.2" fill="currentColor" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1, letterSpacing: '-.01em' }}>AjuntamentIA</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
            Sala d&apos;Intel·ligència · municipal
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        {['Producte', 'Metodologia', 'Seguretat', 'Demo'].map(l => (
          <span key={l} style={{ color: 'var(--bone)', padding: '8px 10px', cursor: 'pointer', letterSpacing: '.06em' }}>{l}</span>
        ))}
        <button onClick={onEnter} style={{
          background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--paper)',
          padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700,
        }}>Entrar a la Sala d&apos;Intel·ligència →</button>
      </div>
    </div>
  );
}

export function LandingMarquee() {
  const items = [
    'INTEL·LIGÈNCIA POLÍTICA EN TEMPS REAL',
    '947 MUNICIPIS · 82.352 ACTES · 142.108 PUNTS',
    'CONTRADICCIONS DETECTADES AVUI · 37',
    'SPEECHES PREPARATS AQUESTA SETMANA · 14',
    'DOSSIERS RIVAL ACTIUS · 9',
    'ECO SOCIAL PROCESSAT · 1,2M MENCIONS',
  ];
  const seq = [...items, ...items];
  return (
    <div style={{
      borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
      background: 'var(--ink-2)', overflow: 'hidden', padding: '8px 0',
    }}>
      <div className="ticker" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone)', letterSpacing: '.15em' }}>
        {seq.map((t, i) => (
          <span key={i} style={{ padding: '0 28px', display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: 'var(--wr-red-2)' }}>◆</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingHero({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ position: 'relative', padding: '56px 28px 40px', overflow: 'hidden' }}>
      <DotGrid size={28} opacity={0.07} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 44, alignItems: 'end' }}>
        <div>
          <Tag tone="red" style={{ marginBottom: 22 }}>◼ CLASSIFICAT · NOMÉS ÚS INTERN DEL PARTIT</Tag>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 'clamp(52px, 7.2vw, 112px)', lineHeight: .94, letterSpacing: '-.02em',
            margin: '0 0 18px', color: 'var(--paper)',
          }}>
            Cada paraula<br />
            que han dit.<br />
            <span style={{ fontStyle: 'italic', color: 'var(--wr-red-2)' }}>Cada vot</span><br />
            que han trencat.
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.5,
            color: 'var(--bone)', maxWidth: 560, margin: '0 0 28px',
          }}>
            AjuntamentIA llegeix els 947 plens municipals de Catalunya, el Parlament, la premsa
            i les xarxes — i els transforma en <strong style={{ color: 'var(--paper)' }}>munició política</strong>: contradiccions,
            promeses trencades, dades per citar, speeches preparats abans que el rival entri a la sala.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>
            <button onClick={onEnter} style={ctaPrimary}>
              Obrir Sala d&apos;Intel·ligència →
            </button>
            <button style={{
              background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line)',
              padding: '13px 18px', fontFamily: 'var(--font-mono)',
              fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Veure cas real 4:12 ▶</button>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <StatusLine color="var(--wr-phosphor)">Pipeline actiu · últim batch fa 4 min</StatusLine>
            <StatusLine color="var(--wr-amber)">3 alertes altes pendents</StatusLine>
            <StatusLine color="var(--wr-red-2)">12 contradiccions noves avui</StatusLine>
          </div>
        </div>
        <LiveIntelPanel />
      </div>
    </div>
  );
}

export function LandingHow() {
  const cards = [
    { n: '01', t: 'Ho escolten tot', d: 'Plens, debats del Parlament, DSPC, RSS de premsa, Bluesky. Tot indexat cada 15 minuts.' },
    { n: '02', t: 'Ho creuen tot', d: 'Què han dit al Parlament? Què han votat al poble? El sistema ho enfronta i detecta la contradicció.' },
    { n: '03', t: "Et donen l'arma", d: 'Chatbot amb 5 modes — Monitor, Atacar, Defensar, Comparar, Oportunitat. Cita literal + font.' },
    { n: '04', t: 'Abans que entreu', d: 'Dossier del pleno preparat. Cites a llençar, dades a citar, respostes a rèpliques probables.' },
  ];
  return (
    <div style={{ padding: '50px 28px', borderTop: '1px solid var(--line)', background: 'var(--ink-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <Tag tone="bone" style={{ marginBottom: 10 }}>MÈTODE</Tag>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, margin: 0, letterSpacing: '-.02em', lineHeight: .95 }}>
            La sala no s&apos;improvisa.<br /><span style={{ fontStyle: 'italic', color: 'var(--bone)' }}>Es prepara.</span>
          </h2>
        </div>
        <div style={{ maxWidth: 320, color: 'var(--fog)', fontSize: 14, lineHeight: 1.5 }}>
          Quatre passos, cada 24h. El que abans prenia una setmana d&apos;assessors ara és una consulta de 6 segons.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: 'var(--ink)', border: '1px solid var(--line)', padding: '22px 20px 26px',
            minHeight: 220, position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fog)', letterSpacing: '.16em' }}>/{c.n}</div>
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, margin: '0 0 12px', fontWeight: 400, lineHeight: 1.05 }}>{c.t}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--bone)', margin: 0 }}>{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingTerminal() {
  const presets = TERMINAL_PRESETS;
  const [sel, setSel] = useState(0);
  const [chars, setChars] = useState(0);
  const full = presets[sel].lines.map(l => l.t).join('\n');

  useEffect(() => {
    setChars(0);
    const id = setInterval(() => {
      setChars((c) => {
        if (c >= full.length) { clearInterval(id); return c; }
        return c + Math.max(1, Math.floor(full.length / 180));
      });
    }, 18);
    return () => clearInterval(id);
  }, [sel, full]);

  const rendered: { c: string; t: string }[] = [];
  let acc = 0;
  for (const line of presets[sel].lines) {
    if (acc >= chars) break;
    const remain = chars - acc;
    const visible = line.t.slice(0, remain);
    rendered.push({ c: line.c, t: visible });
    acc += line.t.length + 1;
  }
  const done = chars >= full.length;

  return (
    <div style={{ padding: '50px 28px', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20 }}>
        <div>
          <Tag tone="phos" style={{ marginBottom: 10 }}>◼ DEMO · CHAT MULTI-MODE</Tag>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, margin: 0, letterSpacing: '-.02em', lineHeight: .95 }}>
            Pregunta.<br /><span style={{ fontStyle: 'italic', color: 'var(--wr-phosphor)' }}>Dispara.</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 460, justifyContent: 'flex-end' }}>
          {presets.map((p, i) => (
            <button key={i} onClick={() => setSel(i)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.05em',
              padding: '8px 10px', cursor: 'pointer',
              background: sel === i ? 'var(--paper)' : 'transparent',
              color: sel === i ? 'var(--ink)' : 'var(--bone)',
              border: '1px solid ' + (sel === i ? 'var(--paper)' : 'var(--line)'),
            }}>{p.q}</button>
          ))}
        </div>
      </div>
      <div style={{
        background: '#0a0a0a', border: '1px solid var(--line)',
        boxShadow: '0 30px 100px -60px rgba(139,211,91,.25)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)',
          fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase',
        }}>
          <span style={{ display: 'inline-flex', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#c2412a' }} />
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#d4a017' }} />
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#8bd35b' }} />
          </span>
          <span style={{ marginLeft: 8 }}>ajuntamentia@intel : ~/query</span>
          <span style={{ marginLeft: 'auto', color: 'var(--wr-phosphor)' }}>● encrypted</span>
        </div>
        <div style={{ padding: '22px 20px', minHeight: 300, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ color: 'var(--paper)', marginBottom: 10 }}>
            <span style={{ color: 'var(--wr-phosphor)' }}>$ </span>
            ajuntamentia query --{presets[sel].q}
          </div>
          {rendered.map((l, i) => (
            <div key={i} style={{ color: l.c, whiteSpace: 'pre-wrap' }}>{l.t}</div>
          ))}
          {!done && <span className="blink" style={{ color: 'var(--wr-phosphor)' }}>█</span>}
          {done && (
            <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
              {['Exportar PDF', 'Enviar a Telegram', 'Desar al dossier'].map(a => (
                <button key={a} style={{
                  background: 'transparent', border: '1px solid var(--line)', color: 'var(--bone)',
                  padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
                  letterSpacing: '.06em', cursor: 'pointer',
                }}>{a}</button>
              ))}
              <button style={{
                background: 'transparent', border: '1px solid var(--wr-red)', color: 'var(--wr-red-2)',
                padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '.06em', cursor: 'pointer',
              }}>Generar contraataque →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LandingDossier() {
  return (
    <div style={{ padding: '56px 28px', borderTop: '1px solid var(--line)', background: '#0a0806' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 8 }}>
            Arxiu · contradiccions ready-to-fire · actualitzat 03:47
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 84, margin: 0, lineHeight: .92, letterSpacing: '-.025em' }}>
            El diari que <span style={{ fontStyle: 'italic' }}>no volen</span><br />
            que publiqueu.
          </h2>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 92, lineHeight: 1, fontStyle: 'italic', color: 'var(--wr-red)' }}>
          ₁₂
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.18em', color: 'var(--mute)' }}>
            contradiccions · 7 dies
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        {CONTRADICTIONS.map((c, i) => (
          <article key={i} style={{
            background: '#fbf7ee', border: '1px solid #c9bfa8', padding: '22px 22px 20px',
            position: 'relative', color: '#14110d',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SevDot sev={c.severity} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8a7f68' }}>
                  {c.severity.toUpperCase()} · {c.topic}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a7f68' }}>GAP {c.gap}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.1, margin: '0 0 14px', fontStyle: 'italic' }}>
              {c.rival}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 10, marginBottom: 10 }}>
              <span style={{ color: '#c2412a', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>D</span>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.claim}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a7f68', marginTop: 4 }}>{c.claimSource} · {c.claimDate}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 10 }}>
              <span style={{ color: '#0a8f64', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>F</span>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.counter}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a7f68', marginTop: 4 }}>{c.counterSource} · {c.counterDate}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #c9bfa8', paddingTop: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a7f68' }}>
                DOSSIER · peces {Math.floor(5 + i * 3)} · export pdf/md/telegram
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#c2412a', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                ready to fire →
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ThreatBoard() {
  const rivals = RIVALS;
  const topics = THREAT_TOPICS;
  const risc = (r: string, t: string) => (r.charCodeAt(0) * 13 + t.charCodeAt(0) * 7 + t.length * 3 + r.length) % 5;
  const levelColor = (n: number) => n >= 4 ? 'var(--wr-red-2)' : n >= 3 ? 'var(--wr-red)' : n >= 2 ? 'var(--wr-amber)' : n >= 1 ? 'var(--wr-phosphor-dim)' : 'var(--line)';
  return (
    <div style={{ padding: '70px 28px', borderTop: '1px solid var(--line)', position: 'relative', background: '#080808' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .6,
        backgroundImage: 'linear-gradient(to right, var(--line-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--line-soft) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <Tag tone="red" style={{ marginBottom: 12 }}>◼ THREAT BOARD · T+04:12</Tag>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, margin: 0, letterSpacing: '-.02em', lineHeight: .95, color: 'var(--paper)' }}>
            Cross-reference <span style={{ fontStyle: 'italic', color: 'var(--wr-red-2)' }}>matrix.</span>
          </h2>
          <p style={{ color: 'var(--bone)', fontSize: 14, maxWidth: 560, marginTop: 12, lineHeight: 1.5 }}>
            Risc operatiu per partit × tema. Calculat cada 6 minuts sobre els últims 30 dies d&apos;actes, DSPC, premsa i xarxes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['—', 0], ['BAIX', 1], ['MOD', 2], ['ELEVAT', 3], ['ALT', 4]].map(([l, n]) => (
            <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em', color: 'var(--fog)', textTransform: 'uppercase' }}>
              <span style={{ width: 12, height: 12, background: levelColor(n as number), border: '1px solid var(--line)' }} />
              {l}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', border: '1px solid var(--line)', background: '#050505', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `170px repeat(${topics.length}, 1fr) 110px`, alignItems: 'stretch' }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>rival \ tema</div>
          {topics.map(t => (
            <div key={t} style={{ padding: '14px 6px', borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line-soft)', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--bone)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</div>
          ))}
          <div style={{ padding: '14px 10px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', textAlign: 'right' }}>Σ TOTAL</div>
          {rivals.map((r, ri) => {
            const rowTotal = topics.reduce((a, t) => a + risc(r.short, t), 0);
            return (
              <div key={r.id} style={{ display: 'contents' }}>
                <div style={{ padding: '16px 14px', borderRight: '1px solid var(--line)', borderBottom: ri < rivals.length - 1 ? '1px solid var(--line-soft)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 14, height: 14, background: r.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper)', lineHeight: 1 }}>{r.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Cell {r.short}</div>
                  </div>
                </div>
                {topics.map((t, ti) => {
                  const n = risc(r.short, t);
                  return (
                    <div key={t} style={{ borderRight: '1px solid var(--line-soft)', borderBottom: ri < rivals.length - 1 ? '1px solid var(--line-soft)' : 'none', position: 'relative', minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', background: n >= 4 ? 'rgba(224,104,79,0.08)' : 'transparent' }}>
                      <span style={{ width: n === 0 ? 8 : 10 + n * 4, height: n === 0 ? 8 : 10 + n * 4, background: levelColor(n), boxShadow: n >= 3 ? `0 0 12px ${levelColor(n)}` : 'none' }} />
                      <span style={{ position: 'absolute', bottom: 4, right: 6, fontFamily: 'var(--font-mono)', fontSize: 8.5, color: n >= 3 ? 'var(--paper)' : 'var(--fog)', opacity: .7, letterSpacing: '.1em' }}>
                        {n > 0 ? n + '.' + ((ri * 7 + ti * 3) % 10) : ''}
                      </span>
                    </div>
                  );
                })}
                <div style={{ padding: '0 14px', borderBottom: ri < rivals.length - 1 ? '1px solid var(--line-soft)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: rowTotal >= 20 ? 'var(--wr-red-2)' : rowTotal >= 12 ? 'var(--wr-amber)' : 'var(--bone)' }}>
                  {rowTotal}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LandingCTA({ onEnter }: { onEnter: () => void }) {
  return (
    <div style={{ padding: '90px 28px 110px', borderTop: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
      <DotGrid size={28} opacity={0.08} />
      <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <Tag tone="red" style={{ marginBottom: 22 }}>◼ ACCÉS RESTRINGIT · CREDENCIALS NECESSÀRIES</Tag>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(56px, 8vw, 128px)',
          margin: '0 0 22px', lineHeight: .9, letterSpacing: '-.025em',
        }}>
          Entreu a la sala.
        </h2>
        <p style={{ fontSize: 18, color: 'var(--bone)', maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.5 }}>
          La Sala d&apos;Intel·ligència està operativa 24/7. El pipeline ha processat 82.352 actes. Només queda una cosa: que entreu vosaltres.
        </p>
        <button onClick={onEnter} style={{ ...ctaPrimary, padding: '16px 22px', fontSize: 13 }}>Obrir Sala d&apos;Intel·ligència →</button>
        <div style={{ marginTop: 36, display: 'flex', gap: 26, justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
          <span>RGPD · anonimització per rol</span>
          <span>Audit log complet</span>
          <span>Supabase JWT · RLS actiu</span>
          <span>Self-hosted · EU</span>
        </div>
      </div>
    </div>
  );
}

export function TacticalFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: '#050505', color: 'var(--paper)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
        <div><div style={{ color: 'var(--bone)', marginBottom: 4 }}>◼ COORDENADES</div>41°48&apos;23&quot;N · 01°52&apos;11&quot;E</div>
        <div><div style={{ color: 'var(--bone)', marginBottom: 4 }}>◼ BUILD</div>AYTMT·2026.04·B#4821</div>
        <div><div style={{ color: 'var(--bone)', marginBottom: 4 }}>◼ CHECKSUM</div>A7F3·9C1E·4B22·D108</div>
        <div><div style={{ color: 'var(--bone)', marginBottom: 4 }}>◼ ESTAT</div><span style={{ color: 'var(--wr-phosphor)' }}>● OPERATIU · SECURE CHANNEL</span></div>
      </div>
      <div style={{ padding: '18px 28px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
        <span>AjuntamentIA v2.0 · 2026 · Factoria IA</span>
        <span>Legal · Seguretat · Contacte · Demo privada</span>
      </div>
      <div style={{ padding: '10px 28px', borderTop: '1px solid var(--line)', background: '#3a1208', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--paper)', letterSpacing: '.2em', textTransform: 'uppercase', textAlign: 'center' }}>
        ◼ EYES ONLY · propietat del partit · còpia prohibida · audit log actiu · <span className="blink">●</span> rec
      </div>
    </footer>
  );
}
