// Power math for a round: mini-game power + element advantage + rarity bonus.
// Pure functions — both phones run the same maths on the same numbers, so they always agree.
// If your src/duel/rules.ts already has `beats`, you can swap this one for it.

import type { Rarity } from '@/components/StampCard';

import type { ClashResult, DuelCardView, DuelElement, Fighter } from './types';

export const ELEMENT_BONUS = 25;
export const RARITY_BONUS: Record<Rarity, number> = { C: 0, R: 5, E: 10, L: 15 };
/** A gap bigger than this knocks the loser out of the arena. */
export const KO_GAP = 40;

const BEATS: Record<DuelElement, DuelElement> = { sun: 'storm', storm: 'moon', moon: 'sun' };

export const beats = (a: DuelElement, b: DuelElement) => BEATS[a] === b;

export const clampPower = (p: number) => Math.max(0, Math.min(100, Math.round(p)));

export function makeFighter(name: string, card: DuelCardView, power: number, other: DuelCardView): Fighter {
  const p = clampPower(power);
  const elementBonus = beats(card.element, other.element) ? ELEMENT_BONUS : 0;
  const rarityBonus = RARITY_BONUS[card.rarity];
  return { name, card, power: p, elementBonus, rarityBonus, total: p + elementBonus + rarityBonus };
}

export function clashResult(you: Fighter, opp: Fighter): ClashResult {
  if (you.total === opp.total) return 'tie';
  return you.total > opp.total ? 'you' : 'opp';
}

/** "72 + ⚡25 + 5" — the breakdown shown under each power bar. */
export function breakdown(f: Fighter): string {
  return `${f.power} + ⚡${f.elementBonus} + ${f.rarityBonus}`;
}
