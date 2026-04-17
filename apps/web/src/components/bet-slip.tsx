'use client';

import { useState } from 'react';
import { X, Trash2, Loader2, ChevronUp, ChevronDown, Receipt } from 'lucide-react';
import { useBetSlip } from '../hooks/use-bet-slip';
import { getAccessToken } from '../lib/auth-client';
import { apiBaseUrl } from '../lib/api-url';

const QUICK_STAKES = [5, 10, 25, 50, 100];

export function BetSlipDocked() {
  const { selections, stake, setStake, removeSelection, clearSlip, totalOdds, potentialPayout } =
    useBetSlip();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function placeBet() {
    setPlacing(true);
    setError(null);
    setSuccess(null);
    try {
      const token = getAccessToken();
      if (!token) {
        setError('Please log in to place a bet');
        return;
      }
      const res = await fetch(`${apiBaseUrl()}/api/betting/tickets`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          selections: selections.map((s) => ({
            outcomeId: s.outcomeId,
            priceAtSubmit: s.price,
          })),
          stakeUsdt: stake,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Error ${res.status}`);
      }
      setSuccess('Bet placed!');
      clearSlip();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  const empty = selections.length === 0;

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Receipt size={14} className="text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Bet Slip
          </h3>
          {!empty && (
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent tabular-nums">
              {selections.length}
            </span>
          )}
        </div>
        {!empty && (
          <button
            type="button"
            onClick={clearSlip}
            className="text-muted transition-colors hover:text-foreground"
            title="Clear all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-xs text-muted">Click on odds to add selections</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-1.5">
            {selections.map((sel) => (
              <div
                key={sel.outcomeId}
                className="rounded border border-border bg-card p-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted truncate">
                      {sel.matchHome} vs {sel.matchAway}
                    </p>
                    <p className="text-xs text-foreground mt-0.5">
                      {sel.label}
                      <span className="ml-1 text-[10px] text-muted">({sel.marketType.replace('_', ' ')})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-accent">
                      {sel.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSelection(sel.outcomeId)}
                      className="text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-3 py-3 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted mb-1.5 block">
                Stake (USDT)
              </label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value) || 0)}
                className="w-full rounded border border-border bg-card px-3 py-2 text-right text-sm font-bold tabular-nums text-foreground outline-none focus:border-accent/50"
              />
              <div className="mt-1.5 flex gap-1">
                {QUICK_STAKES.map((qs) => (
                  <button
                    key={qs}
                    type="button"
                    onClick={() => setStake(qs)}
                    className={[
                      'flex-1 rounded py-1 text-[11px] font-medium transition-colors',
                      stake === qs
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-card text-muted border border-border hover:text-foreground hover:border-foreground/20',
                    ].join(' ')}
                  >
                    ${qs}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Total Odds</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {totalOdds.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Potential Payout</span>
                <span className="font-bold tabular-nums text-emerald-400">
                  ${potentialPayout.toFixed(2)}
                </span>
              </div>
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}
            {success && <p className="text-[11px] text-emerald-400">{success}</p>}

            <button
              type="button"
              onClick={placeBet}
              disabled={placing || stake <= 0}
              className="w-full rounded bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {placing ? (
                <Loader2 size={16} className="mx-auto animate-spin" />
              ) : (
                `Place Bet · $${(stake).toFixed(2)}`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BetSlipMobile() {
  const { selections, totalOdds } = useBetSlip();
  const [open, setOpen] = useState(false);

  if (selections.length === 0) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-border bg-bg animate-slide-up">
          <div className="flex justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted hover:text-foreground"
            >
              <ChevronDown size={20} />
            </button>
          </div>
          <BetSlipDocked />
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-border bg-card px-4 py-3 lg:hidden"
        >
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Bet Slip
            </span>
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent tabular-nums">
              {selections.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted">
              Odds: <span className="font-bold text-foreground">{totalOdds.toFixed(2)}</span>
            </span>
            <ChevronUp size={16} className="text-muted" />
          </div>
        </button>
      )}
    </>
  );
}
