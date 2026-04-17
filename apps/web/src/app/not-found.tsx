import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Gamepad2 className="h-16 w-16 text-muted mb-6" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-lg text-muted mb-6">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded bg-accent px-6 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  );
}
