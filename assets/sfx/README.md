# TQuest duel sound effects

12 original sounds synthesized for TQuest (no samples, no third-party audio), free to use in the app.
Drop this folder into the project at `assets/sfx/`.

| file | when |
|---|---|
| select.mp3 | card lifted |
| flip.mp3 | card flips face up |
| whoosh.mp3 | cards charge |
| hit.mp3 | each bump / impact |
| sun.mp3 / storm.mp3 / moon.mp3 | winner's element effect |
| ko.mp3 | loser knocked out |
| roundWin.mp3 / roundLose.mp3 | round result |
| matchWin.mp3 | match won |
| tick.mp3 | last 3 seconds of timer |

```ts
// src/lib/sfx.ts — static requires so Metro bundles them
export const SFX = {
  select: require('../../assets/sfx/select.mp3'),
  flip: require('../../assets/sfx/flip.mp3'),
  whoosh: require('../../assets/sfx/whoosh.mp3'),
  hit: require('../../assets/sfx/hit.mp3'),
  sun: require('../../assets/sfx/sun.mp3'),
  storm: require('../../assets/sfx/storm.mp3'),
  moon: require('../../assets/sfx/moon.mp3'),
  ko: require('../../assets/sfx/ko.mp3'),
  roundWin: require('../../assets/sfx/roundWin.mp3'),
  roundLose: require('../../assets/sfx/roundLose.mp3'),
  matchWin: require('../../assets/sfx/matchWin.mp3'),
  tick: require('../../assets/sfx/tick.mp3'),
} as const;
```
