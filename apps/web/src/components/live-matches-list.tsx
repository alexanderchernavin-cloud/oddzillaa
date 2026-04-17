'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { getSocket } from '../lib/ws-client';
import { OddsCell } from './odds-cell';
import { useBetSlip } from '../hooks/use-bet-slip';
import type { MatchDto } from '@oddzilla/shared';

type PriceMap = Record<string, Record<string, number | null>>;

const SPORT_ICONS: Record<string, string> = {
  'Counter-Strike 2': 'CS2',
  'Dota 2': 'D2',
  'League of Legends': 'LoL',
  Valorant: 'VAL',
};

function SportBadge({ name }: { name: string }) {
  const abbr = SPORT_ICONS[name] ?? name.slice(0, 3).toUpperCase();
  return (
    <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
      {abbr}
    </span>
  );
}

export function LiveMatchesList({ initialMatches }: { initialMatches: MatchDto[] }) {
  const [matches] = useState(initialMatches);
  const { toggleSelection, isSelected } = useBetSlip();
  const [prices, setPrices] = useState<PriceMap>(() => {
    const map: PriceMap = {};
    for (const m of initialMatches) {
      map[m.id] = {};
      for (const mkt of m.markets) {
        for (const oc of mkt.outcomes) {
          map[m.id]![oc.id] = oc.price;
        }
      }
    }
    return map;
  });

  const handleUpdate = useCallback((raw: string) => {
    try {
      const delta = JSON.parse(raw);
      setPrices((prev) => {
        const next = { ...prev };
        const matchPrices = { ...(next[delta.matchId] ?? {}) };
        for (const mkt of delta.markets) {
          for (const oc of mkt.outcomes) {
            matchPrices[oc.id] = oc.price;
          }
        }
        next[delta.matchId] = matchPrices;
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const matchIds = matches.map((m) => m.id);
    for (const id of matchIds) socket.emit('subscribe', id);
    socket.on('match.update', handleUpdate);
    return () => {
      socket.off('match.update', handleUpdate);
      for (const id of matchIds) socket.emit('unsubscribe', id);
    };
  }, [matches, handleUpdate]);

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded border border-border bg-card p-12 text-center">
        <Gamepad2 size={32} className="text-muted" />
        <p className="text-sm text-muted">No live matches right now. Check back soon.</p>
      </div>
    );
  }

  const grouped = matches.reduce<Record<string, MatchDto[]>>((acc, m) => {
    const key = `${m.sportName} - ${m.tournamentName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([league, leagueMatches]) => (
        <div key={league} className="overflow-hidden rounded border border-border">
          <div className="flex items-center gap-2 bg-surface px-3 py-2">
            <SportBadge name={leagueMatches[0].sportName} />
            <span className="text-xs font-medium text-muted">{league}</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Live</span>
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {leagueMatches.map((match) => {
              const mainMarket = match.markets.find((m) => m.type === 'match_winner');
              return (
                <div
                  key={match.id}
                  className="flex items-center gap-3 bg-card px-3 py-2.5 transition-colors hover:bg-card-hover"
                >
                  <Link
                    href={`/matches/${match.id}`}
                    className="flex-1 min-w-0 space-y-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {match.homeName}
                      </span>
                      {match.homeScore !== null && match.awayScore !== null && (
                        <span className="shrink-0 text-xs font-bold tabular-nums text-accent">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        {match.awayName}
                      </span>
                    </div>
                  </Link>

                  <div
                    className="flex shrink-0 gap-1.5"
                    onClick={(e) => e.preventDefault()}
                  >
                    {mainMarket?.outcomes.map((oc) => {
                      const currentPrice = prices[match.id]?.[oc.id] ?? oc.price;
                      return (
                        <OddsCell
                          key={oc.id}
                          label={oc.label}
                          price={currentPrice}
                          outcomeId={oc.id}
                          selected={isSelected(oc.id)}
                          onToggle={() =>
                            currentPrice &&
                            toggleSelection({
                              outcomeId: oc.id,
                              outcomeFeedId: oc.feedId,
                              label: oc.label,
                              marketId: mainMarket.id,
                              marketType: mainMarket.type,
                              matchHome: match.homeName,
                              matchAway: match.awayName,
                              price: currentPrice,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
