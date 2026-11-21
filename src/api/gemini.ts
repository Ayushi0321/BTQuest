const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-3.7-flash';

export async function askGemini(prompt: string): Promise<string> {
  if (!KEY) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
}