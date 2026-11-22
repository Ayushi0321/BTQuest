/**
 * Trip geometry on any line: stop order, direction and branches. Pure logic, no React or network.
 * Each line lists its stations in MBTA direction 0 order, one sequence per through route
 * (data/lines.ts). Direction 0 = forward along a sequence, 1 = backward.
 */
import type { Direction, Train } from '@/api/mbta';
import { lineById, type LineId } from '@/data/lines';
import { stationById } from '@/data/stations';

export type TripPlan = {
  line: LineId;
  from: string;
  to: string;
  direction: Direction;
  /** App station ids from `from` to `to` inclusive, in travel order. */
  stops: string[];
};

/**
 * Work out the stops between two stations on one line. Fails for the same station twice,
 * stations not on the line, and trips that need a change of train (Ashmont ↔ Braintree branches).
 */
export function planTrip(lineId: LineId, from: string, to: string): TripPlan | { error: string } {
  const line = lineById(lineId);
  const a = stationById(from);
  const b = stationById(to);
  if (!a || !b || !line.stations.includes(from) || !line.stations.includes(to)) {
    return { error: `Pick two stations on the ${line.name}` };
  }
  if (a.id === b.id) return { error: 'Pick two different stations' };
  for (const seq of line.sequences) {
    const ia = seq.indexOf(from);
    const ib = seq.indexOf(to);
    if (ia === -1 || ib === -1) continue;
    return ia < ib
      ? { line: lineId, from, to, direction: 0, stops: seq.slice(ia, ib + 1) }
      : { line: lineId, from, to, direction: 1, stops: seq.slice(ib, ia + 1).reverse() };
  }
  return { error: `${a.name} → ${b.name} needs a change of train` };
}

/**
 * Stations a train passes before reaching `from` when travelling in `direction`.
 * A train whose current/next station is in here is still on its way to the rider.
 */
export function stationsBefore(lineId: LineId, from: string, direction: Direction): Set<string> {
  const out = new Set<string>();
  for (const seq of lineById(lineId).sequences) {
    const i = seq.indexOf(from);
    if (i === -1) continue;
    for (const id of direction === 0 ? seq.slice(0, i) : seq.slice(i + 1)) out.add(id);
  }
  return out;
}

/**
 * Will this train still stop at `stationId`? Uses the headsign (the trip's last stop), so a
 * short-turn that ends early doesn't count. Unknown headsigns are assumed to be fine.
 */
export function trainReaches(lineId: LineId, train: Train, stationId: string): boolean {
  const line = lineById(lineId);
  const terminal = line.stations.map((id) => stationById(id)).find((s) => s?.name === train.headsign);
  if (!terminal || terminal.id === stationId) return true;
  const rest = planTrip(lineId, stationId, terminal.id);
  return !('error' in rest) && rest.direction === train.direction;
}

/** Right direction, and the train gets all the way to the rider's destination. */
export function trainServesTrip(train: Train, plan: TripPlan): boolean {
  return train.direction === plan.direction && trainReaches(plan.line, train, plan.to);
}

/** Straight-line distance in metres between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
