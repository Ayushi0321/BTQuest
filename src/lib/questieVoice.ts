import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';

import { hasElevenLabs, synthesize } from '@/api/elevenlabs';

// Questie's voice: ElevenLabs when a key is set, the phone's built-in voice otherwise
// (or if ElevenLabs fails / is slow), so announcements never go silent.
// Only one line plays at a time — a new line cuts off the previous one.

let player: AudioPlayer | null = null;
let token = 0;
let speaking = false;
let modeReady = false;
const listeners = new Set<() => void>();

function setSpeaking(v: boolean) {
  speaking = v;
  listeners.forEach((l) => l());
}

/** React hook: true while Questie is talking (used to animate the avatar). */
export function useQuestieSpeaking(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => speaking,
    () => false
  );
}

function stopPlayback() {
  try { player?.pause(); player?.remove(); } catch {}
  player = null;
  Speech.stop().catch(() => {});
}

export function stopQuestie() {
  token++;
  stopPlayback();
  setSpeaking(false);
}

/** Say a line in Questie's voice. `rate` 0.8–1.15 (rider's voice-speed setting). */
export async function questieSay(text: string, rate = 1): Promise<void> {
  if (!text.trim()) return;
  const my = ++token;
  stopPlayback();
  setSpeaking(true);
  if (!modeReady) {
    modeReady = true;
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }

  if (hasElevenLabs()) {
    try {
      // don't keep the rider waiting: fall back to the device voice after 6 s
      const uri = await Promise.race([
        synthesize(text, rate),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('ElevenLabs timeout')), 6000)),
      ]);
      if (my !== token) return; // a newer line started meanwhile
      const p = createAudioPlayer(uri);
      player = p;
      const sub = p.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish) {
          sub.remove();
          try { p.remove(); } catch {}
          if (player === p) player = null;
          if (my === token) setSpeaking(false);
        }
      });
      p.play();
      return;
    } catch (e) {
      console.warn('[Questie] ElevenLabs unavailable, using device voice:', String(e));
      if (my !== token) return;
    }
  }

  try {
    Speech.speak(text, {
      language: 'en-US',
      rate,
      onDone: () => { if (my === token) setSpeaking(false); },
      onStopped: () => { if (my === token) setSpeaking(false); },
      onError: () => { if (my === token) setSpeaking(false); },
    });
  } catch {
    setSpeaking(false);
  }
}
