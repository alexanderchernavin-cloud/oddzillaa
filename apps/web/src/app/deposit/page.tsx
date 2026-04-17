'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, Loader2, ArrowDownToLine } from 'lucide-react';
import { getAccessToken, refresh } from '../../lib/auth-client';
import { apiBaseUrl } from '../../lib/api-url';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
}

interface DepositTx {
  id: string;
  amountUsdt: number;
  status: string;
  txHash: string | null;
  createdAt: string;
}

export default function DepositPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState('TRC20');
  const [deposits, setDeposits] = useState<DepositTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      const res = await refresh();
      if (!res) {
        setError('Please log in to access deposits');
        setLoading(false);
        return;
      }
      token = getAccessToken();
    }

    const [addrRes, depsRes] = await Promise.all([
      fetch(`${apiBaseUrl()}/api/wallet/deposit-address`, {
        headers: authHeaders(),
        credentials: 'include',
      }),
      fetch(`${apiBaseUrl()}/api/wallet/deposits`, {
        headers: authHeaders(),
        credentials: 'include',
      }),
    ]);

    if (addrRes.ok) {
      const data = await addrRes.json();
      setAddress(data.address);
      setNetwork(data.network);
    }
    if (depsRes.ok) {
      setDeposits(await depsRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Deposit</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowDownToLine className="h-6 w-6 text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-semibold">Deposit USDT</h1>
      </div>

      {address && (
        <div className="rounded border border-border bg-card p-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">
            Send USDT ({network}) to this address
          </p>

          <div className="flex justify-center rounded bg-white p-4">
            <QRCodeSVG value={address} size={180} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-border bg-black/30 px-3 py-2 text-sm font-mono">
              {address}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              className="rounded border border-border p-2 text-muted transition-colors hover:text-foreground"
            >
              {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <p className="mt-3 text-xs text-muted">
            Only send USDT on the {network} network. Deposits are confirmed by admin.
          </p>
        </div>
      )}

      {deposits.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Deposit history</h2>
          {deposits.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded border border-border bg-card px-4 py-3"
            >
              <div>
                <span className="text-sm font-semibold tabular-nums">${d.amountUsdt.toFixed(2)}</span>
                <span className="ml-2 text-xs text-muted">
                  {new Date(d.createdAt).toLocaleString()}
                </span>
              </div>
              <span
                className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  d.status === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
