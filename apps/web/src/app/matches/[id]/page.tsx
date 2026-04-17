import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, Clock } from 'lucide-react';
import { getMatch } from '../../../lib/api-client';
import { MatchDetailLive } from './match-detail-live';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let match: Awaited<ReturnType<typeof getMatch>>;
  try {
    match = await getMatch(id);
  } catch {
    notFound();
  }

  const statusBadge =
    match.status === 'live' ? (
      <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
        <Activity className="h-3 w-3" aria-hidden /> Live
      </span>
    ) : (
      <span className="flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Clock className="h-3 w-3" aria-hidden /> {match.status}
      </span>
    );

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to matches
      </Link>

      <div className="rounded border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted mb-1">
          {match.sportName} &middot; {match.tournamentName}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {match.homeName} <span className="text-muted">vs</span> {match.awayName}
          </h1>
          {statusBadge}
        </div>
        {match.homeScore !== null && match.awayScore !== null && (
          <p className="text-2xl font-bold tabular-nums text-accent mt-1">
            {match.homeScore} &ndash; {match.awayScore}
          </p>
        )}
      </div>

      <MatchDetailLive match={match} />
    </div>
  );
}
