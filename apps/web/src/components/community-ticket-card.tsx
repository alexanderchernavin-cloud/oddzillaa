import Link from 'next/link';
import type { CommunityFeedTicketDto } from '@oddzilla/shared';

export function CommunityTicketCard({ ticket }: { ticket: CommunityFeedTicketDto }) {
  const tone =
    ticket.status === 'won'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : ticket.status === 'lost'
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-border bg-card';
  const profit =
    ticket.status === 'won'
      ? ticket.payoutUsdt - ticket.stakeUsdt
      : ticket.status === 'void'
        ? 0
        : -ticket.stakeUsdt;
  const profitClass =
    profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-muted';
  const profitLabel = `${profit > 0 ? '+' : ''}${profit.toFixed(2)} USDT`;

  return (
    <article className={`rounded border p-3 ${tone}`}>
      <header className="mb-3 flex items-center justify-between">
        <Link
          href={`/u/${ticket.author.nickname}`}
          className="text-sm font-medium hover:underline"
        >
          {ticket.author.displayName}
          <span className="ml-1.5 text-muted">@{ticket.author.nickname}</span>
        </Link>
        <span className="text-xs text-muted">
          {new Date(ticket.settledAt).toLocaleDateString()}
        </span>
      </header>

      <ul className="space-y-1 text-sm">
        {ticket.selections.map((sel, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="truncate">
              <span className="text-muted">
                {sel.matchHome} vs {sel.matchAway}
              </span>
              <span className="mx-2 text-muted">&middot;</span>
              <span>{sel.outcomeLabel}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {sel.priceAtSubmit.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-3 text-muted">
          <span>
            Stake: <span className="tabular-nums">${ticket.stakeUsdt.toFixed(2)}</span>
          </span>
          <span>
            Odds: <span className="tabular-nums">{ticket.totalOdds.toFixed(2)}</span>
          </span>
          <span>
            {ticket.numLegs} {ticket.numLegs === 1 ? 'leg' : 'legs'}
          </span>
        </div>
        <div className={`font-semibold tabular-nums ${profitClass}`}>{profitLabel}</div>
      </div>
    </article>
  );
}
