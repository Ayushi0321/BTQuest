// Things a rider can scan. Each printed QR code holds "TQUEST:<code>".
// A place scan pulls a painted card for its station; an art scan also unlocks the artwork stamp.

export type QrTarget = {
  code: string;
  kind: 'place' | 'art';
  name: string;
  stationId: string; // the Red Line station it belongs to (sets the mascot and scene)
  blurb: string;
};

export const QR_PREFIX = 'TQUEST:';

export const QR_TARGETS: QrTarget[] = [
  { code: 'HARVARD-YARD', kind: 'place', name: 'Harvard Yard', stationId: 'HAR', blurb: 'The historic heart of Harvard’s campus.' },
  { code: 'MIT-DOME', kind: 'place', name: 'MIT Great Dome', stationId: 'KEN', blurb: 'MIT’s landmark dome above Killian Court.' },
  { code: 'ESPLANADE', kind: 'place', name: 'Charles River Esplanade', stationId: 'CHA', blurb: 'A riverside park along the Charles.' },
  { code: 'BOSTON-COMMON', kind: 'place', name: 'Boston Common', stationId: 'PRK', blurb: 'Boston’s public park since 1634.' },
  { code: 'FANEUIL-HALL', kind: 'place', name: 'Faneuil Hall', stationId: 'DTX', blurb: 'Marketplace and meeting hall since 1742.' },
  { code: 'SOUTH-STATION', kind: 'place', name: 'South Station', stationId: 'SST', blurb: 'Boston’s big rail and bus hub.' },
  { code: 'ART-KENDALL-BAND', kind: 'art', name: 'Kendall Band', stationId: 'KEN', blurb: 'Musical sculptures between the tracks.' },
  { code: 'ART-GLOVE-CYCLE', kind: 'art', name: 'Glove Cycle', stationId: 'POR', blurb: 'Bronze gloves along the escalators.' },
];

/** Reads a scanned QR string. Returns undefined if it isn't a TQuest code. */
export function parseQr(data: string): QrTarget | undefined {
  const raw = data.trim();
  if (!raw.toUpperCase().startsWith(QR_PREFIX)) return undefined;
  const code = raw.slice(QR_PREFIX.length).toUpperCase();
  return QR_TARGETS.find((t) => t.code === code);
}
