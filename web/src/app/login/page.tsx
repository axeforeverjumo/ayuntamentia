'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
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
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#e6edf3] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-[#161b22] p-8 rounded-lg border border-[#30363d]"
      >
        <h1 className="text-xl font-semibold">AyuntamentIA</h1>
        <p className="text-sm text-[#8b949e]">Accés restringit a personal autoritzat.</p>

        <input
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
        />
        {mode === 'password' && (
          <input
            type="password"
            required
            placeholder="contrasenya"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#0d1117] border border-[#30363d] text-sm"
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#238636] hover:bg-[#2ea043] text-white py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '...' : mode === 'magic' ? 'Envia magic link' : 'Entra'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
          className="w-full text-xs text-[#8b949e] hover:text-[#e6edf3]"
        >
          {mode === 'password' ? 'Prefereixo magic link' : 'Prefereixo contrasenya'}
        </button>

        {msg && <p className="text-sm text-amber-400">{msg}</p>}
      </form>
    </div>
  );
}
