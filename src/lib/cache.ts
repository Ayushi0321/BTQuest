import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny persistent cache for generated text (card stories, artwork histories),
// so the same card doesn't call Gemini twice.

const mem = new Map<string, unknown>();

export async function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  const k = 'tquest.cache.' + key;
  if (mem.has(k)) return mem.get(k) as T;
  try {
    const raw = await AsyncStorage.getItem(k);
    if (raw) {
      const v = JSON.parse(raw) as T;
      mem.set(k, v);
      return v;
    }
  } catch {}
  const v = await make();
  mem.set(k, v);
  AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
  return v;
}
