import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

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

export type SfxName = keyof typeof SFX;

const players = new Map<SfxName, AudioPlayer>();

export function preloadSfx(): void {
  void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  for (const name of Object.keys(SFX) as SfxName[]) {
    if (players.has(name)) continue;
    const player = createAudioPlayer(SFX[name]);
    player.volume = 0.6;
    players.set(name, player);
  }
}

export async function playSfx(name: SfxName, enabled = true, questieSpeaking = false): Promise<void> {
  if (!enabled || questieSpeaking) return;
  const player = players.get(name);
  if (!player) return;
  try {
    await player.seekTo(0);
    player.volume = 0.6;
    player.play();
  } catch {}
}

export function releaseSfx(): void {
  for (const player of players.values()) {
    try { player.remove(); } catch {}
  }
  players.clear();
}
