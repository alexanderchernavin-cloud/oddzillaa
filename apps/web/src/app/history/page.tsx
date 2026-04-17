'use client';

import { useEffect, useState, useCallback } from 'react';
import { Receipt, Loader2 } from 'lucide-react';
import { getAccessToken, refresh } from '../../lib/auth-client';
import { apiBaseUrl } from '../../lib/api-url';
import { getSocket } from '../../lib/ws-client';
import { useToast } from '../../components/toast';
import type { TicketListDto, TicketDto } from '@oddzilla/shared';

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  accepted: 'text-blue-400 bg-blue-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  won: 'text-emerald-400 bg-emerald-500/10',
  lost: 'text-red-400 bg-red-500/10',
  void: 'text-zinc-400 bg-zinc-500/10',
  cashout: 'text-orange-400 bg-orange-500/10',
};

export default function HistoryPage() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      const res = await refresh();
      if (!res) {
        setError('Please log in to view your bet history');
        setLoading(false);
        return;
      }
      token = getAccessToken();
    }
    const res = await fetch(`${apiBaseUrl()}/api/betting/tickets?pageSize=50`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      setError('Failed to load tickets');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as TicketListDto;
    setTickets(data.tickets);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();

    function onTicketUpdate(raw: string) {
      try {
        const update = JSON.parse(raw) as { ticketId: string; status: string; payout: number };
        setTickets((prev) =>
          prev.map((t) =>
            t.id === update.ticketId ? { ...t, status: update.status as any } : t,
          ),
        );

        if (update.status === 'won') {
          addToast(`Bet won! Payout: $${update.payout.toFixed(2)}`, 'success');
        } else if (update.status === 'lost') {
          addToast('Bet lost', 'error');
        } else if (update.status === 'void') {
          addToast('Bet voided — stake refunded', 'info');
        }
      } catch {
        // ignore
      }
    }

    socket.on('ticket.update', onTicketUpdate);
    return () => {
      socket.off('ticket.update', onTicketUpdate);
    };
  }, [addToast]);

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
        <Receipt className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="text-2xl font-semibold">Bet history</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Receipt className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="text-2xl font-semibold">Bet history</h1>
        <p className="text-muted">No bets placed yet. Click odds on the matches page to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-muted" aria-hidden />
        <h1 className="text-2xl font-semibold">Bet history</h1>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColors[ticket.status] ?? 'text-muted'}`}
                >
                  {ticket.status}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {new Date(ticket.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Stake: </span>
                <span className="text-sm font-semibold tabular-nums">${ticket.stakeUsdt.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {ticket.selections.map((sel) => (
                <div key={sel.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted">{sel.matchHome} vs {sel.matchAway}</span>
                    <span className="text-muted"> &middot; {sel.marketType}: </span>
                    <span className="font-medium">{sel.outcomeLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{sel.priceAtSubmit.toFixed(2)}</span>
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase ${statusColors[sel.status] ?? 'text-muted'}`}
                    >
                      {sel.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
              <div>
                <span className="text-muted">Total Odds: </span>
                <span className="font-semibold tabular-nums">{ticket.totalOdds.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted">
                  {ticket.status === 'won' ? 'Payout: ' : 'Potential: '}
                </span>
                <span className={`font-semibold tabular-nums ${ticket.status === 'won' ? 'text-emerald-400' : ''}`}>
                  ${ticket.potentialPayout.toFixed(2)}
                </span>
              </div>
            </div>

            {ticket.rejectReason && (
              <p className="mt-2 text-xs text-red-400">Reason: {ticket.rejectReason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
