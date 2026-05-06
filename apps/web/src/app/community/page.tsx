import Link from 'next/link';
import { Users } from 'lucide-react';
import { getSports } from '../../lib/api-client';
import { getCommunityFeed } from '../../lib/community-client';
import { CommunityTicketCard } from '../../components/community-ticket-card';
import type { CommunityFeedDto, SportDto } from '@oddzilla/shared';

export const dynamic = 'force-dynamic';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;

  const [feedResult, sportsResult] = await Promise.allSettled([
    getCommunityFeed({ sortBy: 'recent', sportId: sport, page: 1, pageSize: 20 }),
    getSports(),
  ]);

  const feed: CommunityFeedDto =
    feedResult.status === 'fulfilled'
      ? feedResult.value
      : { tickets: [], total: 0, page: 1, pageSize: 20 };
  const sports: SportDto[] = sportsResult.status === 'fulfilled' ? sportsResult.value : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-muted" />
        <div>
          <h1 className="text-2xl font-semibold">Community</h1>
          <p className="text-xs text-muted">Recently settled tickets from the community.</p>
        </div>
      </div>

      <SportFilter sports={sports} active={sport} />

      {feed.tickets.length === 0 ? (
        <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted">
          {sport ? 'No tickets yet for this sport.' : 'No settled tickets yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {feed.tickets.map((t) => (
            <li key={t.id}>
              <CommunityTicketCard ticket={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SportFilter({ sports, active }: { sports: SportDto[]; active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill href="/community" active={!active}>
        All
      </Pill>
      {sports.map((s) => (
        <Pill key={s.id} href={`/community?sport=${s.id}`} active={active === s.id}>
          {s.name}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-muted hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
