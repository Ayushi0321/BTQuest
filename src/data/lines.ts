import type { Direction, RouteId } from '@/api/mbta';
import { GREEN_B_COORDS, GREEN_B_SHAPE } from '@/data/greenLineMap';
import { RED_LINE_SHAPE, STATION_COORDS as RED_COORDS, type LatLng } from '@/data/redLineMap';
import { GREEN_B_STATIONS, RED_STATIONS, stationById } from '@/data/stations';
import type { Palette } from '@/theme/colors';

export type LineId = RouteId;

export type Line = {
  id: LineId;
  name: string;
  short: string;
  tone: 'red' | 'green';
  /** Station ids in direction 0 order, one list per through route (the Red Line has an Ashmont and a Braintree route). */
  sequences: string[][];
  /** Track for each sequence, same order, used to draw the trip. */
  paths: LatLng[][];
  /** Track pieces drawn faded behind the trip. */
  track: LatLng[][];
  /** Picker order. */
  stations: string[];
  toward: (direction: Direction, to: string) => string;
  /** Legendary card a rider wins for a matched duel on this line. The code must be listed in pull_card on the server. */
  champion: { stationId: string; name: string; code: string };
};

const redTrunk = RED_STATIONS.filter((s) => !s.branch).map((s) => s.id);
const redBranch = (b: 'ashmont' | 'braintree') => RED_STATIONS.filter((s) => s.branch === b).map((s) => s.id);
const greenB = ['GOV', 'PRK', ...GREEN_B_STATIONS.filter((s) => s.id !== 'GOV').map((s) => s.id)];

export const LINES: Line[] = [
  {
    id: 'Red',
    name: 'Red Line',
    short: 'RL',
    tone: 'red',
    sequences: [[...redTrunk, ...redBranch('ashmont')], [...redTrunk, ...redBranch('braintree')]],
    paths: [
      [...RED_LINE_SHAPE.trunk, ...RED_LINE_SHAPE.ashmont.slice(1)],
      [...RED_LINE_SHAPE.trunk, ...RED_LINE_SHAPE.braintree.slice(1)],
    ],
    track: [RED_LINE_SHAPE.trunk, RED_LINE_SHAPE.ashmont, RED_LINE_SHAPE.braintree],
    stations: RED_STATIONS.map((s) => s.id),
    toward: (direction, to) => {
      if (direction === 1) return 'Alewife';
      const branch = stationById(to)?.branch;
      return branch === 'ashmont' ? 'Ashmont' : branch === 'braintree' ? 'Braintree' : 'Ashmont / Braintree';
    },
    champion: { stationId: 'KEN', name: 'Red Line Champion', code: 'RED-CHAMPION' },
  },
  {
    id: 'Green-B',
    name: 'Green Line B',
    short: 'B',
    tone: 'green',
    sequences: [greenB],
    paths: [GREEN_B_SHAPE],
    track: [GREEN_B_SHAPE],
    stations: greenB,
    toward: (direction) => (direction === 0 ? 'Boston College' : 'Government Center'),
    champion: { stationId: 'COP', name: 'Green Line Champion', code: 'GREEN-B-CHAMPION' },
  },
];

export const lineById = (id: LineId): Line => LINES.find((l) => l.id === id) ?? LINES[0];

/** Coordinates of every station on every line. */
export const COORDS: Record<string, LatLng> = { ...RED_COORDS, ...GREEN_B_COORDS };

export function lineColors(c: Palette, line: Line) {
  return line.tone === 'green'
    ? { main: c.green, btn: c.greenBtn, tint: c.greenTint, ink: c.greenInk }
    : { main: c.red, btn: c.redBtn, tint: c.redTint, ink: c.redInk };
}
