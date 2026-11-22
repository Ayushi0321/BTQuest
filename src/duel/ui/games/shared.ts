import { useEffect, useRef } from 'react';

import type { BuzzPattern } from '@/lib/haptics';

import type { SfxName } from '../sfx';

/** Everything a charge-up mini-game gets from <ChargePhase>. */
export type GameProps = {
  width: number;
  height: number;
  /** same seed on both phones is not needed — each player plays their own game */
  seed: string;
  /** false during the 3-2-1 intro and after time is up */
  running: boolean;
  comfort: boolean;
  /** live power 0–100 while playing (drives the power bar) */
  onPower: (power: number) => void;
  /** call when the game ends early (e.g. all dots connected) */
  onFinish: (power: number) => void;
  play: (s: SfxName) => void;
  haptic: (p: BuzzPattern) => void;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Calls `cb(dtMs, elapsedMs)` every animation frame while `running`. */
export function useFrame(cb: (dt: number, elapsed: number) => void, running: boolean) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!running) return;
    let id = 0;
    const start = now();
    let last = start;
    const loop = () => {
      const t = now();
      const dt = Math.min(50, t - last);
      last = t;
      ref.current(dt, t - start);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
