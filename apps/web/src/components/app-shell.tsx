'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  LogOut,
  User,
  Wallet,
  Menu,
  X,
  Gamepad2,
  History,
  Shield,
  Settings,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trophy,
  Users,
} from 'lucide-react';
import * as auth from '../lib/auth-client';
import { onAuthChange } from '../lib/auth-client';
import { apiBaseUrl } from '../lib/api-url';
import type { UserProfile, WalletDto } from '@oddzilla/shared';
import { BetSlipProvider } from '../hooks/use-bet-slip';
import { BetSlipDocked, BetSlipMobile } from './bet-slip';
import { SportSidebar } from './sport-sidebar';
import { AgeGate } from './age-gate';
import { ConnectionBanner } from './connection-banner';
import { ToastProvider } from './toast';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const profile = await auth.fetchMe();
      setUser(profile);
      if (profile) {
        const token = auth.getAccessToken();
        const res = await fetch(`${apiBaseUrl()}/api/wallet/balance`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (res.ok) {
          const w = (await res.json()) as WalletDto;
          setBalance(w.usdtBalance);
        }
      } else {
        setBalance(null);
      }
    } catch {
      setUser(null);
      setBalance(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    return onAuthChange(() => {
      loadUser();
    });
  }, [loadUser]);

  async function handleLogout() {
    await auth.logout();
    setUser(null);
    setBalance(null);
  }

  return (
    <AgeGate>
      <ToastProvider>
        <BetSlipProvider>
          <div className="flex h-dvh flex-col overflow-hidden">
            <ConnectionBanner />

            {/* Header */}
            <header className="z-30 flex h-12 shrink-0 items-center border-b border-border bg-bg px-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="rounded p-1 text-muted hover:text-foreground lg:hidden"
                >
                  {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground"
                >
                  <Gamepad2 size={16} className="text-accent" />
                  Oddzilla
                </Link>
              </div>

              <nav className="mx-6 hidden items-center gap-1 lg:flex">
                {[
                  { href: '/', label: 'Live', icon: <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> },
                  { href: '/results', label: 'Results', icon: <Trophy size={13} /> },
                  { href: '/community', label: 'Community', icon: <Users size={13} /> },
                  { href: '/history', label: 'My Bets', icon: <History size={13} /> },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
                  >
                    <Shield size={13} />
                    Admin
                  </Link>
                )}
              </nav>

              <div className="ml-auto flex items-center gap-2 text-xs">
                {ready && user ? (
                  <>
                    {balance !== null && (
                      <Link
                        href="/deposit"
                        className="flex items-center gap-1 rounded bg-card px-2.5 py-1.5 tabular-nums transition-colors hover:bg-card-hover"
                      >
                        <Wallet size={12} className="text-emerald-400" />
                        <span className="font-bold text-emerald-400">
                          ${balance.toFixed(2)}
                        </span>
                      </Link>
                    )}
                    <div className="hidden items-center gap-1.5 text-muted sm:flex">
                      <User size={12} />
                      <span>{user.displayName}</span>
                    </div>
                    <Link
                      href="/settings"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-card hover:text-foreground"
                      title="Settings"
                    >
                      <Settings size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-card hover:text-foreground"
                      title="Log out"
                    >
                      <LogOut size={14} />
                    </button>
                  </>
                ) : ready ? (
                  <>
                    <Link
                      href="/login"
                      className="rounded px-3 py-1.5 text-muted transition-colors hover:text-foreground"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="rounded bg-accent px-3 py-1.5 font-medium text-bg transition-opacity hover:opacity-90"
                    >
                      Sign up
                    </Link>
                  </>
                ) : null}
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              <aside
                className={[
                  'z-20 w-52 shrink-0 border-r border-border bg-bg overflow-y-auto scrollbar-thin',
                  'fixed inset-y-12 left-0 transition-transform duration-200 lg:static lg:translate-x-0',
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                ].join(' ')}
              >
                <SportSidebar />
                <div className="border-t border-border px-2 py-2 lg:hidden">
                  <Link
                    href="/results"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                  >
                    <Trophy size={14} />
                    Results
                  </Link>
                  <Link
                    href="/community"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                  >
                    <Users size={14} />
                    Community
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                  >
                    <History size={14} />
                    My Bets
                  </Link>
                  {user && (
                    <>
                      <Link
                        href="/deposit"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                      >
                        <ArrowDownToLine size={14} />
                        Deposit
                      </Link>
                      <Link
                        href="/withdraw"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                      >
                        <ArrowUpFromLine size={14} />
                        Withdraw
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                      >
                        <Settings size={14} />
                        Settings
                      </Link>
                    </>
                  )}
                  {user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-card hover:text-foreground"
                    >
                      <Shield size={14} />
                      Admin
                    </Link>
                  )}
                </div>
              </aside>

              <main className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 lg:p-6">{children}</div>
              </main>

              <aside className="hidden w-72 shrink-0 border-l border-border lg:block overflow-hidden">
                <BetSlipDocked />
              </aside>
            </div>

            <BetSlipMobile />
          </div>
        </BetSlipProvider>
      </ToastProvider>
    </AgeGate>
  );
}
