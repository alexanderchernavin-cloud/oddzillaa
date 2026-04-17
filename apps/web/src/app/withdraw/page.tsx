'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowUpFromLine, Loader2 } from 'lucide-react';
import { getAccessToken, refresh } from '../../lib/auth-client';
import { apiBaseUrl } from '../../lib/api-url';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
}

interface WithdrawalReq {
  id: string;
  amountUsdt: number;
  toAddress: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
};

export default function WithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      const res = await refresh();
      if (!res) {
        setError('Please log in to access withdrawals');
        setLoading(false);
        return;
      }
      token = getAccessToken();
    }

    const res = await fetch(`${apiBaseUrl()}/api/wallet/withdrawals`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (res.ok) setWithdrawals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    const res = await fetch(`${apiBaseUrl()}/api/wallet/withdraw`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ amount: Number(amount), toAddress }),
    });

    if (res.ok) {
      setSuccess('Withdrawal request submitted');
      setAmount('');
      setToAddress('');
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? 'Withdrawal failed');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpFromLine className="h-6 w-6 text-orange-400" aria-hidden />
        <h1 className="text-2xl font-semibold">Withdraw USDT</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded border border-border bg-card p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">Amount (USDT)</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm"
            placeholder="100.00"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">To Address (TRC20)</label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            required
            className="w-full rounded border border-border bg-black/30 px-3 py-2 text-sm font-mono"
            placeholder="T..."
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-orange-600 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Request Withdrawal'}
        </button>

        <p className="text-xs text-muted">
          Withdrawals require admin approval. Your balance will be locked until processed.
        </p>
      </form>

      {withdrawals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Withdrawal history</h2>
          {withdrawals.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded border border-border bg-card px-4 py-3"
            >
              <div>
                <span className="text-sm font-semibold tabular-nums">${w.amountUsdt.toFixed(2)}</span>
                <span className="ml-2 text-xs text-muted font-mono truncate max-w-[200px] inline-block align-middle">
                  {w.toAddress}
                </span>
                <span className="ml-2 text-xs text-muted">
                  {new Date(w.createdAt).toLocaleString()}
                </span>
              </div>
              <span
                className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[w.status] ?? 'text-muted'}`}
              >
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
