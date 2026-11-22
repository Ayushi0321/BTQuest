// Duel sound effects (files in assets/sfx, made for TQuest — free to use).
// Call loadDuelSfx() when a duel screen mounts and unloadDuelSfx() when it unmounts,
// or just use the useDuelSfx() hook, which does both and respects the rider's settings.

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import { buzz, type BuzzPattern } from '@/lib/haptics';
import { useQuestieSpeaking } from '@/lib/questieVoice';
import { useFeedback } from '@/state/feedback';

export const SFX = {
  select: require('@/assets/sfx/select.mp3'),
  flip: require('@/assets/sfx/flip.mp3'),
  whoosh: require('@/assets/sfx/whoosh.mp3'),
  hit: require('@/assets/sfx/hit.mp3'),
  sun: require('@/assets/sfx/sun.mp3'),
  storm: require('@/assets/sfx/storm.mp3'),
  moon: require('@/assets/sfx/moon.mp3'),
  ko: require('@/assets/sfx/ko.mp3'),
  roundWin: require('@/assets/sfx/roundWin.mp3'),
  roundLose: require('@/assets/sfx/roundLose.mp3'),
  matchWin: require('@/assets/sfx/matchWin.mp3'),
  tick: require('@/assets/sfx/tick.mp3'),
} as const;

export type SfxName = keyof typeof SFX;

const VOLUME = 0.6;
let players: Partial<Record<SfxName, AudioPlayer>> = {};
let users = 0;

export function loadDuelSfx() {
  users += 1;
  if (users > 1) return;
  for (const name of Object.keys(SFX) as SfxName[]) {
    try {
      const p = createAudioPlayer(SFX[name]);
      p.volume = VOLUME;
      players[name] = p;
    } catch {
      // a missing sound must never break the duel
    }
  }
}

export function unloadDuelSfx() {
  users = Math.max(0, users - 1);
  if (users > 0) return;
  for (const p of Object.values(players)) {
    try { p?.remove(); } catch {}
  }
  players = {};
}

export function playSfxRaw(name: SfxName) {
  const p = players[name];
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
}

/** Returns a play(name) that stays silent when the rider turned voice off or Questie is talking. */
export function useDuelSfx() {
  const { settings } = useFeedback();
  const questieTalking = useQuestieSpeaking();
  useEffect(() => {
    loadDuelSfx();
    return unloadDuelSfx;
  }, []);
  const live = useRef({ on: settings.voice, talking: questieTalking });
  live.current = { on: settings.voice, talking: questieTalking };
  // stable identity, so effects that depend on it don't restart
  return useCallback((name: SfxName) => {
    if (!live.current.on || live.current.talking) return;
    playSfxRaw(name);
  }, []);
}

/** Sound + vibration + comfort flag for duel screens, all following the rider's "Hear it your way" settings. */
export function useDuelFx() {
  const play = useDuelSfx();
  const { settings } = useFeedback();
  const vib = useRef(settings.vibration);
  vib.current = settings.vibration;
  const haptic = useCallback((p: BuzzPattern) => { if (vib.current) buzz(p); }, []);
  return { play, haptic, comfort: settings.comfort };
}
