import AsyncStorage from '@react-native-async-storage/async-storage';

// Progress of the checked-in ride, saved so a full app close keeps the stations already collected.

const KEY = 'tquest.ride.progress.v1';

export type RideProgress = {
  id: string;
  fired: string[];
  passedAt: Record<string, number>;
  lockedId?: string;
  lockedSource?: string;
};

export async function loadRideProgress(id: string): Promise<RideProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as RideProgress) : null;
    return p?.id === id ? p : null;
  } catch {
    return null;
  }
}

export function saveRideProgress(p: RideProgress): void {
  AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
}

export function clearRideProgress(): void {
  AsyncStorage.removeItem(KEY).catch(() => {});
}
