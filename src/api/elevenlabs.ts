import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { hashString } from '@/lib/random';

// ElevenLabs text-to-speech → a playable audio URI.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
// Audio is cached by (text, voice, speed), so replaying a story or a card line costs nothing.

const KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
// Pick Questie's voice in the ElevenLabs Voice Library and put its id in .env.
const VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const MODEL_ID = 'eleven_flash_v2_5'; // low-latency model, good for live announcements

export const hasElevenLabs = () => !!KEY;

const webCache = new Map<string, string>();

/** Returns a local audio URI for `text`, generating it with ElevenLabs if it isn't cached yet. */
export async function synthesize(text: string, speed = 1): Promise<string> {
  if (!KEY) throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY in .env');
  const s = Math.max(0.7, Math.min(1.2, speed));
  const id = hashString(`${VOICE_ID}|${MODEL_ID}|${s}|${text}`).toString(36);

  if (Platform.OS !== 'web') {
    const file = new File(Paths.cache, `questie-${id}.mp3`);
    if (file.exists) return file.uri;
    const bytes = await request(text, s);
    file.create({ overwrite: true });
    file.write(bytes);
    return file.uri;
  }
  // web preview: keep audio in memory
  const hit = webCache.get(id);
  if (hit) return hit;
  const url = URL.createObjectURL(new Blob([await request(text, s)], { type: 'audio/mpeg' }));
  webCache.set(id, url);
  return url;
}

async function request(text: string, speed: number): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: { stability: 0.45, similarity_boost: 0.8, speed } }),
  });
  if (!res.ok) {
    let msg = `ElevenLabs HTTP ${res.status}`;
    try { msg = (await res.json())?.detail?.message ?? msg; } catch {}
    throw new Error(msg);
  }
  return new Uint8Array(await res.arrayBuffer());
}
