// Gemini API client (plain fetch, works in Expo Go).
// Docs: https://ai.google.dev/gemini-api/docs — if a model name stops working, pick a current one there.

const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
export const GEMINI_MODEL = 'gemini-3.7-flash';

// Offline safety net: EXPO_PUBLIC_QUESTIE_OFFLINE=1 skips Gemini entirely (hand-written answers only).
// After a quota error (HTTP 429) Gemini is paused for 10 minutes so the app falls back instantly
// instead of waiting on failing calls.
const FORCE_OFFLINE = process.env.EXPO_PUBLIC_QUESTIE_OFFLINE === '1';
let pausedUntil = 0;

export class GeminiUnavailable extends Error {}

/** true when Questie should use offline content (forced offline, or paused after a quota error). */
export const geminiOffline = () => !KEY || FORCE_OFFLINE || Date.now() < pausedUntil;

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
export type GeminiTurn = { role: 'user' | 'model'; parts: GeminiPart[] };
export type Source = { title: string; uri: string };

type Options = {
  system?: string;      // persona / rules
  search?: boolean;     // ground the answer with Google Search (for real-world facts)
  timeoutMs?: number;
};

/** Low-level call. Returns the text and, when grounded, the web sources Gemini used. */
export async function generate(contents: GeminiTurn[], opts: Options = {}): Promise<{ text: string; sources: Source[] }> {
  if (!KEY) throw new GeminiUnavailable('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
  if (FORCE_OFFLINE) throw new GeminiUnavailable('Questie offline mode is on');
  if (Date.now() < pausedUntil) throw new GeminiUnavailable('Gemini paused after a quota error');
  const controller = new AbortController();
  const timer = opts.timeoutMs ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;
  try {
    const body: Record<string, unknown> = { contents };
    if (opts.system) body.system_instruction = { parts: [{ text: opts.system }] };
    if (opts.search) body.tools = [{ google_search: {} }];
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') pausedUntil = Date.now() + 30_000; // no internet → retry in 30 s
      throw new GeminiUnavailable(String(e));
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const quota = res.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED';
      if (quota) {
        pausedUntil = Date.now() + 10 * 60_000;
        console.warn('[Gemini] quota reached — Questie uses offline answers for 10 minutes');
      }
      throw new GeminiUnavailable(data?.error?.message ?? `Gemini HTTP ${res.status}`);
    }
    const cand = data.candidates?.[0];
    const text: string = cand?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? '';
    const sources: Source[] = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c: { web?: { title?: string; uri?: string } }) => c.web)
      .filter((w: { uri?: string } | undefined): w is { title: string; uri: string } => !!w?.uri)
      .map((w: { title?: string; uri: string }) => ({ title: w.title ?? w.uri, uri: w.uri }));
    return { text, sources };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Simple one-shot prompt → text. */
export async function askGemini(prompt: string, opts: Options = {}): Promise<string> {
  return (await generate([{ role: 'user', parts: [{ text: prompt }] }], opts)).text;
}
