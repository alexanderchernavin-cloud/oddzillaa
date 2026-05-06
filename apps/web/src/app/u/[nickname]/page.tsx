import Link from 'next/link';
import { Trophy, Calendar, TrendingUp, Award } from 'lucide-react';
import {
  getCommunityProfile,
  getCommunityProfileTickets,
} from '../../../lib/community-client';
import type {
  CommunityProfileDto,
  ProfileTicketDto,
  ProfileTicketsDto,
} from '@oddzilla/shared';

export const dynamic = 'force-dynamic';

type LoadResult =
  | { kind: 'ok'; profile: CommunityProfileDto; tickets: ProfileTicketsDto }
  | { kind: 'not_found' }
  | { kind: 'error' };

async function load(nickname: string): Promise<LoadResult> {
  try {
    const [profile, tickets] = await Promise.all([
      getCommunityProfile(nickname),
      getCommunityProfileTickets(nickname, 1, 10),
    ]);
    return { kind: 'ok', profile, tickets };
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return { kind: 'not_found' };
    }
    return { kind: 'error' };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const result = await load(nickname);

  if (result.kind === 'not_found') {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Profile not found</h1>
        <p className="mt-2 text-sm text-muted">
          @{nickname} hasn&apos;t set up a public profile, or no longer shares their tickets.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-card px-4 py-2 text-sm hover:bg-card-hover"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-muted">
        Could not load this profile.
      </div>
    );
  }

  const { profile, tickets } = result;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ProfileHeader profile={profile} />
      <ProfileTicketList tickets={tickets} />
    </div>
  );
}

function ProfileHeader({ profile }: { profile: CommunityProfileDto }) {
  const winPct = (profile.winRate * 100).toFixed(1);
  const roiPct = (profile.roi * 100).toFixed(1);
  const roiPositive = profile.roi >= 0;

  return (
    <header className="rounded border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
          <p className="mt-0.5 text-sm text-muted">@{profile.nickname}</p>
          {profile.bio && <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>}
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            <Calendar size={12} />
            Joined {new Date(profile.joinedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Win rate" value={`${winPct}%`} icon={<Trophy size={14} />} />
        <Stat
          label="ROI"
          value={`${roiPositive ? '+' : ''}${roiPct}%`}
          tone={roiPositive ? 'positive' : 'negative'}
          icon={<TrendingUp size={14} />}
        />
        <Stat label="Settled bets" value={profile.totalSettled.toString()} />
        <Stat label="Badges" value={profile.badgeCount.toString()} icon={<Award size={14} />} />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : '';
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function ProfileTicketList({ tickets }: { tickets: ProfileTicketsDto }) {
  if (tickets.tickets.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
          Recent settled tickets
        </h2>
        <div className="rounded border border-border bg-card p-6 text-center text-sm text-muted">
          No settled tickets yet.
        </div>
      </section>
    );
  }
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
        Recent settled tickets
      </h2>
      <ul className="space-y-2">
        {tickets.tickets.map((t) => (
          <li key={t.id}>
            <TicketRow ticket={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TicketRow({ ticket }: { ticket: ProfileTicketDto }) {
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
    <div className={`rounded border p-3 ${tone}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <ul className="space-y-1 text-sm">
            {ticket.selections.map((sel, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <span className="text-muted">{sel.matchHome} vs {sel.matchAway}</span>
                  <span className="mx-2 text-muted">&middot;</span>
                  <span>{sel.outcomeLabel}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {sel.priceAtSubmit.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-3 text-muted">
          <span>Stake: <span className="tabular-nums">${ticket.stakeUsdt.toFixed(2)}</span></span>
          <span>Odds: <span className="tabular-nums">{ticket.totalOdds.toFixed(2)}</span></span>
          <span>{new Date(ticket.settledAt).toLocaleDateString()}</span>
        </div>
        <div className={`font-semibold tabular-nums ${profitClass}`}>{profitLabel}</div>
      </div>
    </div>
  );
}
