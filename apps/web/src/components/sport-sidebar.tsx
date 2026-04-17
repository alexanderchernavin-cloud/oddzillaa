'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, Crosshair, Swords, Flame, Zap } from 'lucide-react';
import { apiBaseUrl } from '../lib/api-url';

interface Sport {
  id: string;
  name: string;
  slug: string;
}

const SPORT_ICON_MAP: Record<string, React.ReactNode> = {
  'Counter-Strike 2': <Crosshair size={16} />,
  'Dota 2': <Swords size={16} />,
  'League of Legends': <Flame size={16} />,
  Valorant: <Zap size={16} />,
};

export function SportSidebar() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl()}/api/sports`)
      .then((r) => r.json())
      .then((data) => setSports(data as Sport[]))
      .catch(() => {});
  }, []);

  return (
    <nav className="flex flex-col gap-0.5 py-2">
      <button
        type="button"
        onClick={() => setActive(null)}
        className={[
          'flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium transition-colors',
          active === null
            ? 'bg-accent/10 text-accent'
            : 'text-muted hover:bg-card hover:text-foreground',
        ].join(' ')}
      >
        <Gamepad2 size={16} />
        <span>All Esports</span>
      </button>

      {sports.map((sport) => (
        <button
          key={sport.id}
          type="button"
          onClick={() => setActive(sport.id)}
          className={[
            'flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium transition-colors',
            active === sport.id
              ? 'bg-accent/10 text-accent'
              : 'text-muted hover:bg-card hover:text-foreground',
          ].join(' ')}
        >
          {SPORT_ICON_MAP[sport.name] ?? <Gamepad2 size={16} />}
          <span>{sport.name}</span>
        </button>
      ))}
    </nav>
  );
}
