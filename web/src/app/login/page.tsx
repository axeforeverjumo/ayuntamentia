'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { DotGrid, Tag, Gauge } from '@/components/landing/primitives';
import { TacticalRadar } from '@/components/landing/TacticalRadar';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--ink)' }} />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = getSupabaseBrowser();
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}${next}` },
        });
        if (error) throw error;
        setMsg('Revisa el teu correu per accedir.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err: unknown) {
      setMsg((err as Error).message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grain" style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex' }}>
      {/* Left: tactical panel */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
      }}>
        <DotGrid size={28} opacity={0.06} />

        {/* Command strip */}
        <div style={{
          padding: '8px 24px', borderBottom: '1px solid var(--line)', background: 'var(--ink-2)',
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'var(--fog)', display: 'flex', gap: 20,
        }}>
          <span style={{ color: 'var(--wr-red-2)' }}>◼ CLASSIFICAT</span>
          <span style={{ color: 'var(--wr-phosphor)' }}>● CHANNEL SECURE</span>
          <span>AES-256 · TLS 1.3</span>
          <span style={{ marginLeft: 'auto', color: 'var(--wr-amber)' }}>ACCÉS RESTRINGIT</span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 48px', position: 'relative' }}>
          <Tag tone="red" style={{ marginBottom: 20, alignSelf: 'flex-start' }}>◼ EYES ONLY · AUTORITZACIÓ REQUERIDA</Tag>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 400,
            fontSize: 'clamp(48px, 6vw, 96px)', lineHeight: .92, letterSpacing: '-.02em',
            margin: '0 0 20px', color: 'var(--paper)',
          }}>
            Identifiqueu-vos<br />
            <span style={{ fontStyle: 'italic', color: 'var(--wr-red-2)' }}>per entrar.</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--bone)', maxWidth: 480, margin: '0 0 40px' }}>
            El War Room opera 24/7 amb dades classificades de 947 municipis.
            L&apos;accés requereix credencials verificades i queda registrat a l&apos;audit log.
          </p>

          {/* Stats grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
            background: 'var(--line)', border: '1px solid var(--line)', maxWidth: 420,
          }}>
            {[
              { label: 'Municipis online', v: '947', tone: 'var(--wr-phosphor)' },
              { label: 'Actes processades', v: '82.352', tone: 'var(--wr-phosphor)' },
              { label: 'Threat level', v: 'DEFCON 2', tone: 'var(--wr-red-2)' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--ink-2)', padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: k.tone, lineHeight: 1.1, marginTop: 4 }}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom radar strip */}
        <div style={{
          borderTop: '1px solid var(--line)', background: 'var(--ink-2)',
          display: 'grid', gridTemplateColumns: '180px 1fr', height: 220,
        }}>
          <div style={{
            borderRight: '1px solid var(--line)', padding: 12,
            background: 'radial-gradient(circle at center, #0b1409 0%, var(--ink-2) 70%)',
          }}>
            <TacticalRadar />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--wr-phosphor-dim)', letterSpacing: '.18em', marginTop: 4, textAlign: 'center', textTransform: 'uppercase' }}>
              SWEEP · 360° · LIVE
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Gauge label="Pipeline status" value={100} tone="phos" />
            <Gauge label="Cobertura territorial" value={100} tone="phos" />
            <Gauge label="Risc operatiu" value={74} tone="red" />
            <Gauge label="Canal segur" value={100} tone="phos" />
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        background: 'var(--ink-2)', position: 'relative',
      }}>
        {/* Top classification */}
        <div style={{
          padding: '10px 24px', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.2em',
          textTransform: 'uppercase', color: 'var(--wr-red-2)', textAlign: 'center',
          background: 'rgba(212,58,31,.06)',
        }}>
          ◼ TOP SECRET // SCI // NOFORN
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{
              width: 40, height: 40, border: '1px solid var(--paper)',
              display: 'grid', placeItems: 'center', background: 'var(--paper)', color: 'var(--ink)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 20 L12 3 L20 20 Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 20 L12 12 L16 20" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="7" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1 }}>AyuntamentIA</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                War Room · accés operatiu
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                Identificador operatiu
              </label>
              <input
                type="email"
                required
                placeholder="agent@partit.cat"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px', background: 'var(--ink-2)',
                  border: '1px solid var(--line)', color: 'var(--paper)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
                }}
              />
            </div>

            {mode === 'password' && (
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                  Clau d&apos;accés
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 16px', background: 'var(--ink-2)',
                    border: '1px solid var(--line)', color: 'var(--paper)',
                    fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '15px', cursor: 'pointer',
                background: 'var(--wr-red)', color: 'var(--paper)',
                border: '1px solid var(--wr-red)',
                fontFamily: 'var(--font-mono)', fontSize: 12.5,
                letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700,
                boxShadow: '0 0 30px -6px rgba(255,90,60,.5)',
                opacity: loading ? 0.5 : 1,
                marginTop: 6,
              }}
            >
              {loading ? '◼ VERIFICANT...' : mode === 'magic' ? '◼ ENVIAR MAGIC LINK' : '◼ AUTORITZAR ACCÉS →'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
              style={{
                background: 'transparent', border: '1px solid var(--line)',
                color: 'var(--bone)', padding: '10px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '.08em', textTransform: 'uppercase',
              }}
            >
              {mode === 'password' ? 'Prefereixo magic link' : 'Prefereixo contrasenya'}
            </button>

            {msg && (
              <div style={{
                padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11,
                background: msg.includes('correu') ? 'rgba(139,211,91,.08)' : 'rgba(212,58,31,.08)',
                border: `1px solid ${msg.includes('correu') ? 'var(--wr-phosphor-dim)' : 'rgba(212,58,31,.3)'}`,
                color: msg.includes('correu') ? 'var(--wr-phosphor)' : 'var(--wr-red-2)',
              }}>
                {msg.includes('correu') ? '✓ ' : '⚠ '}{msg}
              </div>
            )}
          </form>
        </div>

        {/* Bottom security badges */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--line)', background: 'var(--ink-2)',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fog)',
          letterSpacing: '.14em', textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Supabase JWT · RLS</span>
          <span>Audit log actiu</span>
          <span>EU hosted</span>
        </div>

        <div style={{
          padding: '8px 24px', borderTop: '1px solid var(--line)',
          background: '#3a1208', fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--paper)', letterSpacing: '.2em', textTransform: 'uppercase', textAlign: 'center',
        }}>
          ◼ EYES ONLY · <span className="blink">●</span> REC
        </div>
      </div>
    </div>
  );
}
