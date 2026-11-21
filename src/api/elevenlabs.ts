import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { hashString } from '@/lib/random';

// ElevenLabs text-to-speech → a playable audio URI.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
//
// Saving credits (ElevenLabs bills per character):
//  • every line is cached on the phone — replaying it is free
//  • identical lines requested at the same time share ONE request
//  • a daily character budget: over budget → Questie switches to the phone's voice until tomorrow
//  • speed is NOT sent to ElevenLabs (so one cached file serves every voice-speed setting)

const KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const MODEL_ID = 'eleven_flash_v2_5'; // fast + cheapest per character
export const DAILY_CHAR_LIMIT = Number(process.env.EXPO_PUBLIC_ELEVENLABS_DAILY_CHARS) || 2000;

export const hasElevenLabs = () => !!KEY;

export class BudgetError extends Error {}

const inflight = new Map<string, Promise<string>>();
const webCache = new Map<string, string>();

/** Returns a local audio URI for `text`, generating it with ElevenLabs only if it isn't cached yet. */
export function synthesize(text: string): Promise<string> {
  if (!KEY) return Promise.reject(new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY in .env'));
  const id = hashString(`${VOICE_ID}|${MODEL_ID}|${text}`).toString(36);
  const running = inflight.get(id);
  if (running) return running;
  const job = make(id, text).finally(() => inflight.delete(id));
  inflight.set(id, job);
  return job;
}

async function make(id: string, text: string): Promise<string> {
  if (Platform.OS !== 'web') {
    const file = new File(Paths.cache, `questie-${id}.mp3`);
    if (file.exists) return file.uri; // cached → free
    const bytes = await request(text);
    file.create({ overwrite: true });
    file.write(bytes);
    return file.uri;
  }
  const hit = webCache.get(id);
  if (hit) return hit;
  const url = URL.createObjectURL(new Blob([await request(text)], { type: 'audio/mpeg' }));
  webCache.set(id, url);
  return url;
}

async function request(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const usage = await getUsage();
  if (usage.used + text.length > usage.limit) throw new BudgetError(`Daily ElevenLabs budget reached (${usage.used}/${usage.limit} characters)`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
  });
  if (!res.ok) {
    let msg = `ElevenLabs HTTP ${res.status}`;
    try { msg = (await res.json())?.detail?.message ?? msg; } catch {}
    throw new Error(msg);
  }
  await addUsage(text.length);
  return new Uint8Array(await res.arrayBuffer());
}

/* ------------------------------------------------------------ daily budget */

const USAGE_KEY = 'tquest.elevenlabs.usage';
const today = () => new Date().toISOString().slice(0, 10);

/** Characters sent to ElevenLabs today (only real requests count — cached replays are free). */
export async function getUsage(): Promise<{ used: number; limit: number }> {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    const v = raw ? (JSON.parse(raw) as { date: string; used: number }) : null;
    return { used: v && v.date === today() ? v.used : 0, limit: DAILY_CHAR_LIMIT };
  } catch {
    return { used: 0, limit: DAILY_CHAR_LIMIT };
  }
}

async function addUsage(n: number) {
  const { used } = await getUsage();
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ date: today(), used: used + n })).catch(() => {});
}
