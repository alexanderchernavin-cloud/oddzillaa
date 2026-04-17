'use client';

import { useEffect, useState, useCallback } from 'react';
import { OddsCell } from '../../../components/odds-cell';
import { getSocket } from '../../../lib/ws-client';
import { useBetSlip } from '../../../hooks/use-bet-slip';
import type { MatchDto } from '@oddzilla/shared';

type PriceMap = Record<string, number | null>;
type StatusMap = Record<string, string>;

function marketLabel(type: string, specifier?: string): string {
  switch (type) {
    case 'match_winner':
      return 'Match Winner';
    case 'map_winner':
      return `Map Winner${specifier ? ` (${specifier})` : ''}`;
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function MatchDetailLive({ match }: { match: MatchDto }) {
  const { toggleSelection, isSelected } = useBetSlip();

  const [prices, setPrices] = useState<PriceMap>(() => {
    const map: PriceMap = {};
    for (const mkt of match.markets) {
      for (const oc of mkt.outcomes) {
        map[oc.id] = oc.price;
      }
    }
    return map;
  });

  const [marketStatuses, setMarketStatuses] = useState<StatusMap>(() => {
    const map: StatusMap = {};
    for (const mkt of match.markets) {
      map[mkt.id] = mkt.status;
    }
    return map;
  });

  const handleUpdate = useCallback(
    (raw: string) => {
      try {
        const delta = JSON.parse(raw);
        if (delta.matchId !== match.id) return;

        setPrices((prev) => {
          const next = { ...prev };
          for (const mkt of delta.markets) {
            for (const oc of mkt.outcomes) {
              next[oc.id] = oc.price;
            }
          }
          return next;
        });

        setMarketStatuses((prev) => {
          const next = { ...prev };
          for (const mkt of delta.markets) {
            next[mkt.id] = mkt.status;
          }
          return next;
        });
      } catch {
        // ignore
      }
    },
    [match.id],
  );

  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe', match.id);
    socket.on('match.update', handleUpdate);
    return () => {
      socket.off('match.update', handleUpdate);
      socket.emit('unsubscribe', match.id);
    };
  }, [match.id, handleUpdate]);

  return (
    <div className="space-y-4">
      {match.markets.map((mkt) => {
        const status = marketStatuses[mkt.id] ?? mkt.status;
        const isSuspended = status === 'suspended';

        return (
          <div key={mkt.id} className="rounded border border-border overflow-hidden">
            <div className="flex items-center justify-between bg-surface px-3 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                {marketLabel(mkt.type, mkt.specifier ?? undefined)}
              </h3>
              {isSuspended && (
                <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
                  Suspended
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3">
              {mkt.outcomes.map((oc) => {
                const currentPrice = isSuspended ? null : (prices[oc.id] ?? oc.price);
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
                        marketId: mkt.id,
                        marketType: mkt.type,
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
  );
}
