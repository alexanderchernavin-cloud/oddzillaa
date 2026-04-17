'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

const STORAGE_KEY = 'oddzilla_age_verified';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setVerified(stored === 'true');
  }, []);

  if (verified === null) return null;

  if (verified) return <>{children}</>;

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVerified(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-bg p-8 text-center shadow-2xl">
        <Shield className="mx-auto h-12 w-12 text-accent mb-4" />
        <h1 className="text-2xl font-bold mb-2">Age Verification</h1>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          You must be 18 years or older to access Oddzilla. By entering, you confirm that you are of
          legal age and agree to our{' '}
          <Link href="/terms" className="text-accent underline">
            Terms of Service
          </Link>
          .
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.assign('https://www.google.com')}
            className="flex-1 rounded border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            I am under 18
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex-1 rounded bg-accent py-2.5 text-sm font-bold text-bg transition-opacity hover:opacity-90"
          >
            I am 18+
          </button>
        </div>
      </div>
    </div>
  );
}
