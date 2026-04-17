'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface BetSlipSelection {
  outcomeId: string;
  outcomeFeedId: string;
  label: string;
  marketId: string;
  marketType: string;
  matchHome: string;
  matchAway: string;
  price: number;
}

interface BetSlipState {
  selections: BetSlipSelection[];
  stake: number;
  addSelection: (sel: BetSlipSelection) => void;
  removeSelection: (outcomeId: string) => void;
  toggleSelection: (sel: BetSlipSelection) => void;
  clearSlip: () => void;
  setStake: (s: number) => void;
  isSelected: (outcomeId: string) => boolean;
  totalOdds: number;
  potentialPayout: number;
}

const BetSlipContext = createContext<BetSlipState | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSlipSelection[]>([]);
  const [stake, setStake] = useState(10);

  const addSelection = useCallback((sel: BetSlipSelection) => {
    setSelections((prev) => {
      if (prev.find((s) => s.outcomeId === sel.outcomeId)) return prev;
      // Remove any existing selection from the same market (swap)
      const filtered = prev.filter((s) => s.marketId !== sel.marketId);
      return [...filtered, sel];
    });
  }, []);

  const removeSelection = useCallback((outcomeId: string) => {
    setSelections((prev) => prev.filter((s) => s.outcomeId !== outcomeId));
  }, []);

  const toggleSelection = useCallback((sel: BetSlipSelection) => {
    setSelections((prev) => {
      if (prev.find((s) => s.outcomeId === sel.outcomeId)) {
        return prev.filter((s) => s.outcomeId !== sel.outcomeId);
      }
      // Remove any existing selection from the same market (swap)
      const filtered = prev.filter((s) => s.marketId !== sel.marketId);
      return [...filtered, sel];
    });
  }, []);

  const clearSlip = useCallback(() => setSelections([]), []);

  const isSelected = useCallback(
    (outcomeId: string) => selections.some((s) => s.outcomeId === outcomeId),
    [selections],
  );

  const totalOdds = selections.reduce((acc, s) => acc * s.price, 1);
  const potentialPayout = Number((stake * totalOdds).toFixed(2));

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        stake,
        addSelection,
        removeSelection,
        toggleSelection,
        clearSlip,
        setStake,
        isSelected,
        totalOdds,
        potentialPayout,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip(): BetSlipState {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within BetSlipProvider');
  return ctx;
}
