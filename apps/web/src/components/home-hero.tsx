'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { fetchMe, getAccessToken, onAuthChange } from '../lib/auth-client';
import type { UserProfile } from '@oddzilla/shared';

export function HomeHero() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => {
      setUser(u);
      setChecked(true);
    });
    return onAuthChange(() => {
      if (getAccessToken()) {
        fetchMe().then(setUser);
      } else {
        setUser(null);
      }
    });
  }, []);

  if (!checked) return null;

  if (user) {
    return (
      <div className="rounded border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-accent" />
          <span className="text-sm text-foreground">
            Welcome back, <span className="font-semibold">{user.displayName}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-accent/20 bg-accent/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Live Esports Betting</h1>
          <p className="text-xs text-muted mt-1">
            CS2, Dota 2, League of Legends, Valorant. Real-time odds updating every tick.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/signup"
            className="rounded bg-accent px-4 py-2 text-xs font-bold text-bg transition-opacity hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
