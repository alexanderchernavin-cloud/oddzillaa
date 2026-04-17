import { Trophy } from 'lucide-react';
import { getMatches } from '../../lib/api-client';
import type { MatchDto } from '@oddzilla/shared';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  let matches: MatchDto[] = [];
  try {
    matches = await getMatches('finished' as any);
  } catch {
    // may not have any finished matches yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-yellow-400" aria-hidden />
        <h1 className="text-2xl font-semibold">Results</h1>
        <span className="text-sm text-muted">({matches.length})</span>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">No finished matches yet.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{match.sportName}</span>
                  <span className="text-xs text-muted">&middot;</span>
                  <span className="text-xs text-muted">{match.tournamentName}</span>
                </div>
                <span className="rounded-sm bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                  Finished
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">{match.homeName}</div>
                  <div className="flex items-center gap-2 text-lg font-bold tabular-nums">
                    <span>{match.homeScore ?? 0}</span>
                    <span className="text-muted">-</span>
                    <span>{match.awayScore ?? 0}</span>
                  </div>
                  <div className="text-sm font-medium">{match.awayName}</div>
                </div>
              </div>

              {match.markets.length > 0 && (
                <div className="mt-3 border-t border-border pt-2">
                  {match.markets
                    .filter((m) => m.status === 'settled')
                    .map((market) => (
                      <div key={market.id} className="flex items-center gap-2 text-xs text-muted">
                        <span>{market.type.replace('_', ' ')}</span>
                        {market.specifier && <span>({market.specifier})</span>}
                        <span>&mdash;</span>
                        {market.outcomes.map((oc) => (
                          <span
                            key={oc.id}
                            className={
                              oc.result === 'won'
                                ? 'text-emerald-400 font-medium'
                                : oc.result === 'lost'
                                  ? 'text-red-400'
                                  : 'text-muted'
                            }
                          >
                            {oc.label} ({oc.result})
                          </span>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
