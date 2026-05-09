'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-base)' }} />}>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex' }}>
      {/* Left: brand panel */}
      <div style={{
        flex: 1, background: 'var(--bg-base)',
        borderRight: '.5px solid var(--border)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 56px',
      }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--r-md)',
            display: 'grid', placeItems: 'center',
            background: 'var(--brand)', color: '#E8F1F9',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 20 L12 3 L20 20 Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 20 L12 12 L16 20" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="7" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>AjuntamentIA</div>
            <div style={{ fontSize: 11, color: 'var(--text-meta)', marginTop: 3 }}>Intel·ligència política per Aliança Catalana</div>
          </div>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-sans)', fontSize: 38, fontWeight: 600,
          lineHeight: 1.1, color: 'var(--text-primary)', margin: '0 0 20px',
          letterSpacing: '-.02em',
        }}>
          La teva plataforma<br />
          <span style={{ color: 'var(--brand-l)' }}>d&apos;intel·ligència política.</span>
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 0 48px' }}>
          Monitor 24/7 de 947 municipis de Catalunya. Alertes automàtiques, anàlisi de rivals i preparació de speeches amb dades reals dels plens.
        </p>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 460 }}>
          {[
            { label: 'Municipis', v: '947' },
            { label: 'Actes processades', v: '82.352' },
            { label: 'Regidors analitzats', v: '2.400+' },
          ].map((k, i) => (
            <div key={i} style={{
              background: 'var(--bg-surface)', border: '.5px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 9.5, color: 'var(--text-meta)', letterSpacing: '.08em',
                textTransform: 'uppercase', fontWeight: 500, marginBottom: 6,
              }}>{k.label}</div>
              <div style={{ fontSize: 22, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1 }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: login form */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)', borderLeft: '.5px solid var(--border)',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 36px' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
              Accés a la plataforma
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-meta)' }}>
              Introdueix les teves credencials per continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 10, color: 'var(--text-meta)',
                letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500,
              }}>
                Correu electrònic
              </label>
              <input
                type="email"
                required
                placeholder="agent@partit.cat"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--bg-elevated)', border: '.5px solid var(--border-em)',
                  borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {mode === 'password' && (
              <div>
                <label style={{
                  display: 'block', fontSize: 10, color: 'var(--text-meta)',
                  letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500,
                }}>
                  Contrasenya
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'var(--bg-elevated)', border: '.5px solid var(--border-em)',
                    borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', cursor: 'pointer',
                background: 'var(--brand)', color: '#E8F1F9',
                border: '1px solid var(--brand)', borderRadius: 'var(--r-md)',
                fontSize: 13, fontWeight: 600,
                boxShadow: '0 0 24px -6px rgba(15,76,129,.4)',
                opacity: loading ? 0.5 : 1, marginTop: 4,
                transition: 'opacity .15s',
              }}
            >
              {loading ? 'Verificant...' : mode === 'magic' ? 'Enviar accés per correu' : 'Accedir →'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-em)',
                borderRadius: 'var(--r-md)', color: 'var(--text-secondary)',
                padding: '9px', cursor: 'pointer', fontSize: 12,
              }}
            >
              {mode === 'password' ? 'Accedir amb magic link' : 'Accedir amb contrasenya'}
            </button>

            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 12,
                background: msg.includes('correu') ? 'rgba(26,122,74,.1)' : 'rgba(192,57,43,.1)',
                border: `.5px solid ${msg.includes('correu') ? 'rgba(26,122,74,.4)' : 'rgba(192,57,43,.4)'}`,
                color: msg.includes('correu') ? '#1A7A4A' : '#C0392B',
              }}>
                {msg.includes('correu') ? '✓ ' : '⚠ '}{msg}
              </div>
            )}
          </form>
        </div>

        <div style={{
          padding: '16px 36px', borderTop: '.5px solid var(--border)',
          fontSize: 11, color: 'var(--text-meta)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Supabase JWT · RLS</span>
          <span>Audit log actiu</span>
          <span>EU hosted</span>
        </div>
      </div>
    </div>
  );
}
