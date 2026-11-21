import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Rarity } from '@/components/StampCard';

// The rider's collection and points, shared by every screen.
// TODO (data dev): save this on the device / backend so it survives closing the app.

export type OwnedCard = { uid: string; stationId: string; seed: number; rarity: Rarity; place?: string; placeCode?: string };

// Pull rates shown to riders in Rewards. Pulls only come from riding, never from payments.
export const PULL_RATES: [Rarity, number][] = [['L', 0.01], ['E', 0.07], ['R', 0.22], ['C', 0.7]];

function rollRarity(): Rarity {
  let x = Math.random();
  for (const [r, p] of PULL_RATES) {
    if (x < p) return r;
    x -= p;
  }
  return 'C';
}

const DEMO_CARDS: OwnedCard[] = [
  ['ALE', 3, 'C'], ['ALE', 18, 'R'], ['DAV', 5, 'C'], ['DAV', 27, 'C'], ['POR', 9, 'C'], ['POR', 33, 'R'], ['POR', 2, 'C'],
  ['HAR', 14, 'C'], ['HAR', 40, 'R'], ['CEN', 8, 'C'], ['PRK', 41, 'R'], ['PRK', 77, 'L'], ['DTX', 6, 'C'], ['SST', 12, 'E'], ['SST', 21, 'C'],
].map(([stationId, seed, rarity], i) => ({ uid: 'demo' + i, stationId: stationId as string, seed: seed as number, rarity: rarity as Rarity }));

type Game = {
  cards: OwnedCard[];
  points: number;
  artFound: Record<string, boolean>;
  /** Arriving at a station: adds +10 points and one new card. Returns the card and whether it's the first one there. */
  pull: (stationId: string, place?: { name: string; code: string }) => { card: OwnedCard; isNew: boolean };
  findArt: (stationId: string) => void;
};

const GameCtx = createContext<Game | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<OwnedCard[]>(DEMO_CARDS);
  const [points, setPoints] = useState(1240);
  const [artFound, setArtFound] = useState<Record<string, boolean>>({ POR: true });
  const [pulls, setPulls] = useState(0);

  const pull = useCallback(
    (stationId: string, place?: { name: string; code: string }) => {
      // Demo: the first pull of a session is always Epic so the reveal can be shown off.
      const rarity: Rarity = pulls === 0 ? 'E' : rollRarity();
      const card: OwnedCard = { uid: `${Date.now()}-${Math.random()}`, stationId, seed: 100 + Math.floor(Math.random() * 9000), rarity, place: place?.name, placeCode: place?.code };
      const isNew = !cards.some((c) => c.stationId === stationId);
      setCards((prev) => [...prev, card]);
      setPoints((p) => p + 10);
      setPulls((n) => n + 1);
      return { card, isNew };
    },
    [cards, pulls]
  );

  const findArt = useCallback((stationId: string) => {
    setArtFound((a) => ({ ...a, [stationId]: true }));
    setPoints((p) => p + 50);
  }, []);

  const value = useMemo(() => ({ cards, points, artFound, pull, findArt }), [cards, points, artFound, pull, findArt]);
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Game {
  const g = useContext(GameCtx);
  if (!g) throw new Error('useGame must be used inside <GameProvider>');
  return g;
}

const RANK: Record<Rarity, number> = { L: 4, E: 3, R: 2, C: 1 };
/** Best card first (rarest, then newest). */
export const sortBest = (list: OwnedCard[]) => [...list].sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
