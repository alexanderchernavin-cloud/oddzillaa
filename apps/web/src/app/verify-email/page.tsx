'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiBaseUrl } from '../../lib/api-url';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    fetch(`${apiBaseUrl()}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted mb-4" />
          <p className="text-muted">Verifying your email...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Email verified</h1>
          <p className="text-muted mb-6">Your email has been successfully verified.</p>
          <Link
            href="/"
            className="rounded bg-accent px-6 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
          >
            Go to Home
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Verification failed</h1>
          <p className="text-muted mb-6">
            This link is invalid or has expired. Try requesting a new verification email.
          </p>
          <Link
            href="/login"
            className="rounded bg-accent px-6 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
