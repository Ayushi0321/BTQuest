/**
 * useRideDetector(enabled): while nobody is checked in, notice a rider moving along with a live
 * train and suggest checking in. A guess needs two checks in a row near the same train, with the
 * phone and the train both having moved the same way by about the same distance. Standing on a
 * platform, walking past the tracks or a train going by doesn't trigger it.
 * Foreground only: it runs while the app is open.
 */
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getTrains, type Train } from '@/api/mbta';
import { LINES, type LineId } from '@/data/lines';
import { DEMO_MODE } from '@/hooks/useTrip';
import { distanceMeters } from '@/lib/linePlan';

const CHECK_MS = 15_000;
const NEAR_M = 200;
const MOVED_M = 80;
const MATCH_M = 120;
const FIX_MAX_AGE_MS = 60_000;
const SNOOZE_MS = 15 * 60_000;

export type RideGuess = { line: LineId; stationId: string; train: Train };

// Demo mode has no location or live trains, so the alert fires on a timer with a pretend B train.
const DEMO_DELAY_MS = 8_000;
const DEMO_GUESS: RideGuess = {
  line: 'Green-B',
  stationId: 'BUC',
  train: { vehicleId: 'DEMO', lat: 42.35008, lng: -71.10687, bearing: 270, direction: 0, status: 'STOPPED_AT', stationId: 'BUC', headsign: 'Boston College' },
};

type Fix = { lat: number; lng: number; t: number };

export function useRideDetector(enabled: boolean): { guess: RideGuess | null; dismiss: () => void } {
  const [guess, setGuess] = useState<RideGuess | null>(null);
  const snoozedUntil = useRef(0);

  const dismiss = useCallback(() => {
    snoozedUntil.current = Date.now() + SNOOZE_MS;
    setGuess(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (DEMO_MODE) {
      const t = setTimeout(() => setGuess(DEMO_GUESS), DEMO_DELAY_MS);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    let sub: Location.LocationSubscription | undefined;
    let fix: Fix | null = null;
    let prev: { vehicleId: string; lat: number; lng: number; tLat: number; tLng: number } | null = null;

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      const s = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 5_000 },
        (p) => { fix = { lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp }; },
      );
      if (cancelled) s.remove();
      else sub = s;
    })().catch(() => {});

    const check = async () => {
      const f = fix;
      if (AppState.currentState !== 'active' || Date.now() < snoozedUntil.current) return;
      if (!f || Date.now() - f.t > FIX_MAX_AGE_MS) return;

      const results = await Promise.all(LINES.map(async (l) => ({ line: l, trains: await getTrains(l.id).catch(() => [] as Train[]) })));
      if (cancelled) return;

      let best: { line: LineId; train: Train; dist: number } | null = null;
      for (const { line, trains } of results) {
        for (const t of trains) {
          if (!t.stationId || !line.stations.includes(t.stationId)) continue;
          const dist = distanceMeters(f.lat, f.lng, t.lat, t.lng);
          if (dist <= NEAR_M && (!best || dist < best.dist)) best = { line: line.id, train: t, dist };
        }
      }
      if (!best) {
        prev = null;
        return;
      }

      const t = best.train;
      let together = false;
      if (prev && prev.vehicleId === t.vehicleId) {
        const phoneMoved = distanceMeters(prev.lat, prev.lng, f.lat, f.lng);
        const trainMoved = distanceMeters(prev.tLat, prev.tLng, t.lat, t.lng);
        // Gap between where the phone went and where the train went, from the same start offset.
        const drift = distanceMeters(f.lat - prev.lat + prev.tLat, f.lng - prev.lng + prev.tLng, t.lat, t.lng);
        together = phoneMoved >= MOVED_M && trainMoved >= MOVED_M && drift <= MATCH_M;
      }
      if (together) {
        snoozedUntil.current = Date.now() + SNOOZE_MS;
        prev = null;
        setGuess({ line: best.line, stationId: t.stationId!, train: t });
      } else {
        prev = { vehicleId: t.vehicleId, lat: f.lat, lng: f.lng, tLat: t.lat, tLng: t.lng };
      }
    };

    const timer = setInterval(check, CHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      sub?.remove();
    };
  }, [enabled]);

  return { guess: enabled ? guess : null, dismiss };
}
