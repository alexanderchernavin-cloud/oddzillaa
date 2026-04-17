'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { apiBaseUrl } from '../../lib/api-url';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`${apiBaseUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? 'Reset failed. The link may have expired.');
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <h1 className="text-2xl font-semibold mb-2">Invalid link</h1>
        <p className="text-muted mb-4">This password reset link is missing or invalid.</p>
        <Link href="/forgot-password" className="text-accent text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Password reset</h1>
        <p className="text-muted">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-muted" />
        <h1 className="text-2xl font-semibold">Set new password</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent py-2.5 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
