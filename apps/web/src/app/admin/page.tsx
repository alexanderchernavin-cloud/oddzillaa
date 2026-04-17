'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, Loader2, DollarSign, BarChart3, Users, Settings, RefreshCw, Receipt, ArrowUpDown } from 'lucide-react';
import { getAccessToken, fetchMe } from '../../lib/auth-client';
import { apiBaseUrl } from '../../lib/api-url';
import type { PnlSummaryDto, AdminSettingDto, UserDetailDto, UserListDto } from '@oddzilla/shared';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' } : { 'content-type': 'application/json' };
}

type Tab = 'pnl' | 'settings' | 'users' | 'tickets' | 'transactions' | 'withdrawals';

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('pnl');

  useEffect(() => {
    fetchMe().then((user) => {
      setAuthorized(user?.role === 'admin');
    });
  }, []);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Lock className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="text-2xl font-semibold">Admin backoffice</h1>
        <p className="text-muted">You must be an admin to access this page.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'pnl', label: 'PnL', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tickets', label: 'Tickets', icon: Receipt },
    { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
    { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="text-2xl font-semibold">Admin backoffice</h1>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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

      {tab === 'pnl' && <PnlTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'tickets' && <TicketsTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
    </div>
  );
}

function PnlTab() {
  const [pnl, setPnl] = useState<PnlSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBaseUrl()}/api/admin/pnl`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) setPnl(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;
  if (!pnl) return <p className="text-muted">Failed to load PnL data</p>;

  const cards = [
    { label: 'Total Staked', value: `$${pnl.totalStaked.toFixed(2)}`, icon: DollarSign },
    { label: 'Total Paid Out', value: `$${pnl.totalPaidOut.toFixed(2)}`, icon: DollarSign },
    { label: 'Net PnL', value: `$${pnl.netPnl.toFixed(2)}`, color: pnl.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400', icon: BarChart3 },
    { label: 'Active Tickets', value: String(pnl.activeTickets), icon: BarChart3 },
    { label: 'Total Tickets', value: String(pnl.totalTickets), icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <button type="button" onClick={load} className="flex items-center gap-1 text-xs text-muted hover:text-foreground">
        <RefreshCw size={12} /> Refresh
      </button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-sm border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted">{c.label}</p>
            <p className={`text-lg font-bold tabular-nums ${c.color ?? ''}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<AdminSettingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBaseUrl()}/api/admin/settings`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) setSettings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(key: string) {
    setSaving(true);
    let parsed: unknown;
    try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
    await fetch(`${apiBaseUrl()}/api/admin/settings/${key}`, {
      method: 'PATCH', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ value: parsed }),
    });
    setEditKey(null);
    setSaving(false);
    load();
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;

  return (
    <div className="space-y-3">
      {settings.map((s) => (
        <div key={s.key} className="flex items-center justify-between rounded-sm border border-border bg-card p-3">
          <div>
            <p className="text-sm font-medium">{s.key}</p>
            <p className="text-xs text-muted">Updated: {new Date(s.updatedAt).toLocaleString()}</p>
          </div>
          {editKey === s.key ? (
            <div className="flex items-center gap-2">
              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-32 rounded border border-border bg-black/30 px-2 py-1 text-sm" />
              <button type="button" onClick={() => save(s.key)} disabled={saving} className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Save</button>
              <button type="button" onClick={() => setEditKey(null)} className="text-xs text-muted">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono tabular-nums">{JSON.stringify(s.value)}</span>
              <button type="button" onClick={() => { setEditKey(s.key); setEditValue(JSON.stringify(s.value)); }} className="text-xs text-muted hover:text-foreground">Edit</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<UserDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditUserId, setCreditUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditReason, setCreditReason] = useState('Admin credit');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBaseUrl()}/api/admin/users?pageSize=50`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) { const data = (await res.json()) as UserListDto; setUsers(data.users); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function credit(userId: string) {
    await fetch(`${apiBaseUrl()}/api/admin/users/${userId}/credit`, {
      method: 'POST', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ amount: Number(creditAmount), reason: creditReason }),
    });
    setCreditUserId(null);
    load();
  }

  async function toggleStatus(userId: string, current: string) {
    await fetch(`${apiBaseUrl()}/api/admin/users/${userId}`, {
      method: 'PATCH', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ status: current === 'active' ? 'blocked' : 'active' }),
    });
    load();
  }

  async function toggleRole(userId: string, current: string) {
    await fetch(`${apiBaseUrl()}/api/admin/users/${userId}`, {
      method: 'PATCH', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ role: current === 'admin' ? 'user' : 'admin' }),
    });
    load();
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded-sm border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{u.displayName} <span className="text-muted">({u.email})</span></p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{u.role}</span>
                <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{u.status}</span>
                <span className="text-xs text-muted tabular-nums">Balance: ${u.usdtBalance.toFixed(2)}</span>
                {u.lockedBalance > 0 && <span className="text-xs text-yellow-400 tabular-nums">Locked: ${u.lockedBalance.toFixed(2)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggleRole(u.id, u.role)} className="rounded border border-border px-2 py-1 text-[10px] font-medium text-muted hover:text-foreground">{u.role === 'admin' ? 'Demote' : 'Promote'}</button>
              <button type="button" onClick={() => toggleStatus(u.id, u.status)} className={`rounded border border-border px-2 py-1 text-[10px] font-medium ${u.status === 'active' ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>{u.status === 'active' ? 'Block' : 'Unblock'}</button>
              <button type="button" onClick={() => setCreditUserId(creditUserId === u.id ? null : u.id)} className="rounded border border-border px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10">Credit</button>
            </div>
          </div>
          {creditUserId === u.id && (
            <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
              <div>
                <label className="text-[10px] text-muted">Amount (USDT)</label>
                <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="w-24 rounded border border-border bg-black/30 px-2 py-1 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted">Reason</label>
                <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="w-full rounded border border-border bg-black/30 px-2 py-1 text-sm" />
              </div>
              <button type="button" onClick={() => credit(u.id)} className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Send</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}&pageSize=50` : '?pageSize=50';
    const res = await fetch(`${apiBaseUrl()}/api/admin/tickets${qs}`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) { const data = await res.json(); setTickets(data.tickets); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function voidTicket(id: string) {
    await fetch(`${apiBaseUrl()}/api/admin/tickets/${id}/void`, { method: 'POST', headers: authHeaders(), credentials: 'include' });
    load();
  }

  const statuses = ['', 'pending', 'accepted', 'rejected', 'won', 'lost', 'void'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Filter:</span>
        {statuses.map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)}
            className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${statusFilter === s ? 'border-emerald-500 text-emerald-400' : 'border-border text-muted hover:text-foreground'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <div key={t.id} className="rounded border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted">{t.userDisplayName} ({t.userEmail})</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold tabular-nums">${t.stakeUsdt.toFixed(2)}</span>
                    <span className="text-xs text-muted">@ {t.totalOdds.toFixed(2)}</span>
                    <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase ${t.status === 'won' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'lost' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{t.status}</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {t.selections.map((sel: any) => (
                      <p key={sel.id} className="text-[11px] text-muted">{sel.matchHome} vs {sel.matchAway} &middot; {sel.outcomeLabel} @ {sel.priceAtSubmit.toFixed(2)}</p>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted">{new Date(t.submittedAt).toLocaleString()}</span>
                  {['pending', 'accepted'].includes(t.status) && (
                    <button type="button" onClick={() => voidTicket(t.id)} className="rounded border border-red-500/30 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10">Void</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-sm text-muted">No tickets found</p>}
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBaseUrl()}/api/admin/transactions?pageSize=50`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) { const data = await res.json(); setTxns(data.transactions); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;

  return (
    <div className="space-y-2">
      {txns.map((t: any) => (
        <div key={t.id} className="flex items-center justify-between rounded border border-border bg-card px-4 py-3">
          <div>
            <span className="text-xs text-muted">{t.userEmail}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase ${t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : t.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-400' : t.type === 'payout' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400'}`}>{t.type}</span>
              <span className="text-sm font-semibold tabular-nums">${t.amountUsdt.toFixed(2)}</span>
              <span className={`text-[9px] uppercase ${t.status === 'confirmed' ? 'text-emerald-400' : t.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>{t.status}</span>
            </div>
          </div>
          <span className="text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</span>
        </div>
      ))}
      {txns.length === 0 && <p className="text-sm text-muted">No transactions found</p>}
    </div>
  );
}

function WithdrawalsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBaseUrl()}/api/admin/withdrawals`, { headers: authHeaders(), credentials: 'include' });
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    await fetch(`${apiBaseUrl()}/api/admin/withdrawals/${id}/approve`, { method: 'POST', headers: authHeaders(), credentials: 'include', body: '{}' });
    load();
  }

  async function reject(id: string) {
    await fetch(`${apiBaseUrl()}/api/admin/withdrawals/${id}/reject`, { method: 'POST', headers: authHeaders(), credentials: 'include' });
    load();
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted" />;

  return (
    <div className="space-y-2">
      {requests.map((r: any) => (
        <div key={r.id} className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted">{r.userDisplayName} ({r.userEmail})</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold tabular-nums">${r.amountUsdt.toFixed(2)}</span>
                <span className="text-xs text-muted font-mono">{r.toAddress}</span>
              </div>
              <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => approve(r.id)} className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Approve</button>
              <button type="button" onClick={() => reject(r.id)} className="rounded border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Reject</button>
            </div>
          </div>
        </div>
      ))}
      {requests.length === 0 && <p className="text-sm text-muted">No pending withdrawal requests</p>}
    </div>
  );
}
