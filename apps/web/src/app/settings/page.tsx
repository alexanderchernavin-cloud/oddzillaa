'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Shield, Loader2 } from 'lucide-react';
import { getAccessToken, refresh, fetchMe } from '../../lib/auth-client';
import { apiBaseUrl } from '../../lib/api-url';
import type { UserProfile } from '@oddzilla/shared';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'security' | 'responsible'>('profile');

  useEffect(() => {
    async function load() {
      let token = getAccessToken();
      if (!token) {
        const res = await refresh();
        if (!res) { router.push('/login'); return; }
        token = getAccessToken();
      }
      const me = await fetchMe();
      if (!me) { router.push('/login'); return; }
      setUser(me);
      if (me.mustChangePassword) setTab('security');
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {user.mustChangePassword && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          You must change your password before continuing.
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'profile' as const, label: 'Profile', icon: User },
          { id: 'security' as const, label: 'Security', icon: Lock },
          { id: 'responsible' as const, label: 'Responsible Gambling', icon: Shield },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} onUpdate={setUser} />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'responsible' && <ResponsibleGamblingTab />}
    </div>
  );
}

function ProfileTab({ user, onUpdate }: { user: UserProfile; onUpdate: (u: UserProfile) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${apiBaseUrl()}/api/users/me`, {
      method: 'PATCH',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ displayName }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full rounded border border-border bg-black/20 px-3 py-2 text-sm text-muted"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          minLength={2}
          maxLength={40}
          required
          className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-accent px-6 py-2 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {success ? 'Saved!' : saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch(`${apiBaseUrl()}/api/auth/change-password`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? 'Failed to change password');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={12}
          className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[10px] text-muted">Minimum 12 characters</p>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400">Password changed successfully</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-accent px-6 py-2 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Changing...' : 'Change password'}
      </button>
    </form>
  );
}

function ResponsibleGamblingTab() {
  const [selfExcludedUntil, setSelfExcludedUntil] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [excludeDays, setExcludeDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl()}/api/users/me/responsible-gambling`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setSelfExcludedUntil(data.selfExcludedUntil);
      setDailyLimit(data.dailyDepositLimit?.toString() ?? '');
      setWeeklyLimit(data.weeklyDepositLimit?.toString() ?? '');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (excludeDays) body.selfExcludeDays = Number(excludeDays);
    body.dailyDepositLimit = dailyLimit ? Number(dailyLimit) : null;
    body.weeklyDepositLimit = weeklyLimit ? Number(weeklyLimit) : null;

    const res = await fetch(`${apiBaseUrl()}/api/users/me/responsible-gambling`, {
      method: 'PATCH',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setSelfExcludedUntil(data.selfExcludedUntil);
      setExcludeDays('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setSaving(false);
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;

  const isExcluded = selfExcludedUntil && new Date(selfExcludedUntil) > new Date();

  return (
    <div className="max-w-md space-y-6">
      {isExcluded && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          You are self-excluded until {new Date(selfExcludedUntil!).toLocaleDateString()}.
          Betting is disabled during this period.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            Self-exclusion (days)
          </label>
          <div className="flex gap-2">
            {[7, 30, 90, 365].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setExcludeDays(String(d))}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  excludeDays === String(d)
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted">
            This action cannot be reversed. You will not be able to bet during the exclusion period.
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            Daily deposit limit (USDT)
          </label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            min="0"
            step="1"
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
            placeholder="No limit"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            Weekly deposit limit (USDT)
          </label>
          <input
            type="number"
            value={weeklyLimit}
            onChange={(e) => setWeeklyLimit(e.target.value)}
            min="0"
            step="1"
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
            placeholder="No limit"
          />
        </div>

        {success && <p className="text-xs text-emerald-400">Settings saved</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-accent px-6 py-2 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
