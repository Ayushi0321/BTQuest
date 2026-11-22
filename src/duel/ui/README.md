# TQuest painted Train Duel UI

Drop-in screens for every step of a duel round, painted in the same style as the stamp cards.
No new packages: it uses what TQuest already has (react-native-svg, expo-audio, expo-haptics, Animated).

## What's inside

| File | Step | What it does |
|---|---|---|
| `HandPicker.tsx` | pick | 3-card fan of real `StampCard`s with element badges. Tap to lift + big preview, "Play this card" confirms. Shows the opponent's face-down card. |
| `ChargePhase.tsx` | charge | "3 · 2 · 1 · GO!" then a 6-second mini-game for your card's element, live POWER bar, timer ring. |
| `games/SunGame.tsx` | ☀ Sun | **Stop at noon**: tap when the sun swings through the gold zone. 3 tries. |
| `games/StormGame.tsx` | ⚡ Storm | **Connect the dots**: drag 1 → 6 to draw the lightning bolt. Fast and clean = more power. |
| `games/MoonGame.tsx` | ☾ Moon | **Star catcher**: drag the sleepy moon to catch falling stars (+12) and dodge rain clouds (−15). |
| `ClashArena.tsx` | clash | Cards flip, power bars fill, charge + 2 bumps (POW), winner's element strikes, tug-of-war push (KO if the gap > 40). Tap to skip. Result banner sits below the arena. |
| `DuelResult.tsx` | end | "You win!" confetti or "Good duel!", final score, winning card, Questie line, Rematch / Back. |
| `power.ts` | maths | `makeFighter()`, `clashResult()`: power + ⚡25 element bonus + rarity bonus (C0 R5 E10 L15). |
| `sfx.ts` | sound | `useDuelFx()` → `play`, `haptic`, `comfort`, all following the rider's Hear-it-your-way settings. |
| `src/app/duel-lab.tsx` | demo | Open **/duel-lab** to try every step with demo cards. Delete before shipping. |

Comfort mode (You tab) is respected everywhere: slower games, no shaking, no flashing.

## Install

1. Unzip at the project root (it adds `src/duel/ui/`, `src/app/duel-lab.tsx` and `assets/sfx/*.mp3`).
2. `npx expo start -c`
3. Open the lab: in Expo Go press the dev menu → or temporarily add a button with `router.push('/duel-lab')`.

## Wiring it into the duel screen

```tsx
import { ChargePhase, ClashArena, DuelResult, HandPicker, ScorePill, makeFighter, type DuelCardView } from '@/duel/ui';

// map your cards → DuelCardView (uid, stationId, seed, rarity, placeCode?, element: 'sun'|'storm'|'moon')

{phase === 'pick' && <HandPicker hand={hand} opponentName={opp.nickname} opponentReady={oppPicked} width={W} height={H} onPlay={(card) => sendPick(card)} />}
{phase === 'charge' && <ChargePhase card={myCard} opponentName={opp.nickname} opponentDone={oppPowerArrived} width={W} height={H} onDone={(power) => sendPower(power)} />}
{phase === 'clash' && (
  <ClashArena
    you={makeFighter('You', myCard, myPower, oppCard)}
    opp={makeFighter(opp.nickname, oppCard, oppPower, myCard)}
    width={W}
    onDone={(result) => nextRound(result)}  // update the score HERE, after the animation
  />
)}
{phase === 'end' && <DuelResult won={won} you={score.you} opp={score.opp} oppName={opp.nickname} winningCard={lastWinner} width={W} onRematch={rematch} onBack={() => router.back()} />}
```

Both phones run `makeFighter` + `clashResult` on the same two `{card, power}` pairs, so they always agree on the winner.
