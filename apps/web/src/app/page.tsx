import { getMatches } from '../lib/api-client';
import { LiveMatchesList } from '../components/live-matches-list';
import { HomeHero } from '../components/home-hero';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let matches: Awaited<ReturnType<typeof getMatches>> = [];
  try {
    matches = await getMatches();
  } catch {
    // API might not be up during build
  }

  return (
    <div className="space-y-6">
      <HomeHero />
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Live Matches
          </h2>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
              {matches.length} live
            </span>
          </span>
        </div>
        <LiveMatchesList initialMatches={matches} />
      </section>
    </div>
  );
}
