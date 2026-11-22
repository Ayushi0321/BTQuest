import type { DuelCard, DuelElement, DuelMatchWinner, RoundResult } from './types';

export type RoundWinner = 'a' | 'b' | 'draw';

const RARITY_RANK: Record<DuelCard['rarity'], number> = { C: 1, R: 2, E: 3, L: 4 };

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b7f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

export function getElement(card: DuelCard): DuelElement {
  if (card.element) return card.element;
  if (card.weather === 'rain' || card.weather === 'snow') return 'storm';
  if (card.time === 'dusk' || card.time === 'night' || card.weather === 'stars') return 'moon';

  const rng = makeRng(hashString(`${card.stationId}:${card.seed}`));
  const time = pick(rng, ['dawn', 'day', 'day', 'dusk', 'night'] as const);
  let weather = pick(rng, ['leaves', 'leaves', 'leaves', 'none', 'rain', 'snow', 'stars'] as const);

  if (weather === 'none' && time === 'night') weather = 'stars';

  const indoorLandmarks = ['ART-KENDALL-BAND', 'ART-GLOVE-CYCLE'];
  if (card.placeCode && indoorLandmarks.includes(card.placeCode)) weather = 'none';

  if (weather === 'rain' || weather === 'snow') return 'storm';
  if (time === 'dusk' || time === 'night' || weather === 'stars') return 'moon';
  return 'sun';
}

export function resolveRound(a: DuelCard, b: DuelCard, duelId = '', round = 1): RoundResult {
  const aElement = getElement(a);
  const bElement = getElement(b);
  let winner: RoundWinner = 'draw';

  if (aElement !== bElement) {
    const aWins =
      (aElement === 'sun' && bElement === 'storm') ||
      (aElement === 'storm' && bElement === 'moon') ||
      (aElement === 'moon' && bElement === 'sun');
    winner = aWins ? 'a' : 'b';
  } else if (RARITY_RANK[a.rarity] !== RARITY_RANK[b.rarity]) {
    winner = RARITY_RANK[a.rarity] > RARITY_RANK[b.rarity] ? 'a' : 'b';
  }

  return { duelId, round, a, b, winner, aElement, bElement };
}

export function matchWinner(rounds: RoundResult[]): DuelMatchWinner {
  let aWins = 0;
  let bWins = 0;
  for (const round of rounds) {
    if (round.winner === 'a') aWins++;
    if (round.winner === 'b') bWins++;
  }
  if (aWins >= 2) return 'a';
  if (bWins >= 2) return 'b';
  return null;
}

export function beats(a: DuelElement, b: DuelElement): boolean {
  return (a === 'sun' && b === 'storm') ||
    (a === 'storm' && b === 'moon') ||
    (a === 'moon' && b === 'sun');
}

export function rarityBonus(rarity: DuelCard['rarity']): number {
  return { C: 0, R: 5, E: 10, L: 15 }[rarity];
}

export function chargeTotal(card: DuelCard): number {
  const power = Math.max(0, Math.min(100, card.power ?? 0));
  return power + rarityBonus(card.rarity);
}

export function resolvePowerRound(a: DuelCard, b: DuelCard, duelId = '', round = 1): RoundResult {
  const aElement = getElement(a);
  const bElement = getElement(b);
  const aPower = Math.max(0, Math.min(100, a.power ?? 0));
  const bPower = Math.max(0, Math.min(100, b.power ?? 0));
  const aTotal = aPower + (beats(aElement, bElement) ? 25 : 0) + rarityBonus(a.rarity);
  const bTotal = bPower + (beats(bElement, aElement) ? 25 : 0) + rarityBonus(b.rarity);
  return {
    duelId,
    round,
    a: { ...a, power: aPower },
    b: { ...b, power: bPower },
    winner: aTotal === bTotal ? 'draw' : aTotal > bTotal ? 'a' : 'b',
    aElement,
    bElement,
    aPower,
    bPower,
    aTotal,
    bTotal,
  };
}
