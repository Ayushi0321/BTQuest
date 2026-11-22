// Shared types for the painted Train Duel UI kit (src/duel/ui).
// These are UI-only shapes: map your own duel types onto them where you render.

import type { Rarity } from '@/components/StampCard';

export type DuelElement = 'sun' | 'storm' | 'moon';

/** A card as the duel UI needs it: enough to paint it with <StampCard> plus its element. */
export type DuelCardView = {
  uid: string;
  stationId: string;
  seed: number;
  rarity: Rarity;
  placeCode?: string;
  element: DuelElement;
};

/** One side of a clash, after both players finished their mini-game. */
export type Fighter = {
  name: string;          // "You" or the opponent's nickname
  card: DuelCardView;
  power: number;         // mini-game result, 0–100
  elementBonus: number;  // 25 if this card's element beats the other one, else 0
  rarityBonus: number;   // C 0 · R 5 · E 10 · L 15
  total: number;         // power + elementBonus + rarityBonus
};

export type ClashResult = 'you' | 'opp' | 'tie';
