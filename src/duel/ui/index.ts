// Painted Train Duel UI kit — drop-in screens for each step of a round.
//   pick   → <HandPicker>
//   charge → <ChargePhase>   (Sun: Stop at noon · Storm: Connect the dots · Moon: Star catcher)
//   clash  → <ClashArena>    (use makeFighter() to build both sides from the two picks + powers)
//   end    → <DuelResult>
// Try them all at /duel-lab.

export { ChargePhase } from './ChargePhase';
export { ClashArena } from './ClashArena';
export { DuelResult } from './DuelResult';
export { HandPicker } from './HandPicker';
export { CardBack, ELEMENT, ElementBadge, PaintedButton, PaintedPanel } from './paintKit';
export { ELEMENT_BONUS, KO_GAP, RARITY_BONUS, beats, breakdown, clashResult, makeFighter } from './power';
export { useDuelFx, useDuelSfx, type SfxName } from './sfx';
export type { ClashResult, DuelCardView, DuelElement, Fighter } from './types';
export { PowerBar, ScorePill, StampLabel, TimerRing } from './widgets';
