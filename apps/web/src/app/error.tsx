'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-16 w-16 text-red-400 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted mb-6 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-accent px-6 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
