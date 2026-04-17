'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

interface OddsCellProps {
  price: number | null;
  label: string;
  outcomeId?: string;
  selected?: boolean;
  onToggle?: () => void;
}

export function OddsCell({ price, label, outcomeId, selected, onToggle }: OddsCellProps) {
  const prevPrice = useRef<number | null>(null);
  const [flash, setFlash] = useState<'none' | 'up' | 'down'>('none');

  useEffect(() => {
    if (prevPrice.current !== null && price !== null && price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? 'up' : 'down');
      const timeout = setTimeout(() => setFlash('none'), 600);
      prevPrice.current = price;
      return () => clearTimeout(timeout);
    }
    prevPrice.current = price;
  }, [price]);

  const suspended = price === null;
  const clickable = !suspended && !!outcomeId && !!onToggle;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onToggle!()}
      className={[
        'flex flex-col items-center justify-center rounded px-3 py-2 text-center transition-all duration-150 min-w-[72px]',
        suspended
          ? 'bg-surface cursor-not-allowed opacity-50'
          : selected
            ? 'bg-accent/15 border border-accent/40'
            : 'bg-card border border-border hover:bg-card-hover',
        flash === 'up' ? 'animate-flash-up' : '',
        flash === 'down' ? 'animate-flash-down' : '',
      ].join(' ')}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted leading-tight">
        {label}
      </span>
      {suspended ? (
        <Lock size={12} className="mt-0.5 text-muted" />
      ) : (
        <span
          className={[
            'text-sm font-bold tabular-nums leading-tight mt-0.5',
            selected ? 'text-accent' : 'text-foreground',
          ].join(' ')}
        >
          {price.toFixed(2)}
        </span>
      )}
    </button>
  );
}
