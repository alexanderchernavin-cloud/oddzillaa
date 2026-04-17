'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Mail } from 'lucide-react';
import { apiBaseUrl } from '../../lib/api-url';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`${apiBaseUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-12">
        <div className="flex flex-col items-center text-center">
          <Mail className="h-12 w-12 text-emerald-400 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-muted">
            If an account with that email exists, we&apos;ve sent a password reset link.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-xs text-muted hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-muted" />
        <h1 className="text-2xl font-semibold">Forgot password</h1>
      </div>
      <p className="text-sm text-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent py-2.5 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <Link href="/login" className="block text-center text-xs text-muted hover:text-foreground">
        Back to sign in
      </Link>
    </div>
  );
}
