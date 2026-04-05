'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      router.push('/dashboard');
      return;
    }

    // Sign up
    if (!name.trim()) { setError('Name is required.'); setLoading(false); return; }

    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    if (data.user) {
      // Check if this is the very first user — make them admin
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const isFirst = (count ?? 0) === 0;
      const initials = name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

      await supabase.from('users').insert({
        auth_id: data.user.id,
        email: email.trim(),
        name: name.trim(),
        initials,
        role: isFirst ? 'admin' : 'member',
        zone: isFirst ? 'Admin' : 'General',
        avatar_color: { bg: '#0a1f3a', text: '#4a9eff' },
        status: 'active',
      });

      if (data.session) {
        // Email confirmation disabled — logged in immediately
        router.push('/dashboard');
      } else {
        setInfo('Check your email to confirm your account, then log in.');
        setMode('login');
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="text-[20px] font-semibold text-white tracking-wide" style={{ fontFamily: 'var(--font-space-mono)' }}>
            ORBITDEV
          </div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] mt-0.5" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // mission control
          </div>
        </div>

        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-6">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: '#070b14' }}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className="flex-1 py-1.5 rounded text-[12px] transition-all cursor-pointer"
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  background: mode === m ? '#0d1a30' : 'transparent',
                  color: mode === m ? '#4a9eff' : '#3d5278',
                  border: mode === m ? '1px solid #1a3060' : '1px solid transparent',
                }}
              >
                {m === 'login' ? 'sign in' : 'sign up'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div>
                <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  full name <span className="text-[#ef4444]">*</span>
                </div>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Kim Lee"
                  className="w-full text-[12px] px-3 py-2.5 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] transition-colors"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                />
              </div>
            )}

            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>
                email
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@team.dev"
                className="w-full text-[12px] px-3 py-2.5 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] transition-colors"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              />
            </div>

            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>
                password
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full text-[12px] px-3 py-2.5 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] transition-colors"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              />
            </div>

            {error && (
              <div className="text-[11px] text-[#ef4444] px-3 py-2 rounded-lg" style={{ background: '#2a0808', border: '1px solid #5a1010' }}>
                {error}
              </div>
            )}

            {info && (
              <div className="text-[11px] text-[#22c55e] px-3 py-2 rounded-lg" style={{ background: '#052210', border: '1px solid #0a3a1a' }}>
                {info}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer disabled:opacity-50 mt-1"
              style={{ background: '#0d1a30', color: '#4a9eff', border: '1px solid #1a3060', fontFamily: 'var(--font-space-mono)' }}
            >
              {loading ? '…' : mode === 'login' ? 'sign in →' : 'create account →'}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="mt-4 text-[10px] text-[#2d3d5a] text-center leading-relaxed" style={{ fontFamily: 'var(--font-space-mono)' }}>
              The first account created becomes admin.<br />
              Admins can promote other members later.
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-[11px] text-[#3d5278] hover:text-[#6b7fa3] transition-colors" style={{ fontFamily: 'var(--font-space-mono)' }}>
            ← continue without signing in
          </a>
        </div>
      </div>
    </div>
  );
}
