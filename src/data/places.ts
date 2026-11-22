// Things a rider can scan. Each printed QR code holds "TQUEST:<code>".
// A place scan pulls a painted card for its station; an art scan also unlocks the artwork stamp.

export type QrTarget = {
  code: string;
  kind: 'place' | 'art';
  name: string;
  stationId: string; // the station it belongs to (sets the mascot and scene)
  blurb: string;
  lat: number; // where the printed sign is; a scan only counts within `radius` metres (when demo mode is off)
  lng: number;
  radius: number;
};

export const QR_PREFIX = 'TQUEST:';

export const QR_TARGETS: QrTarget[] = [
  { code: 'HARVARD-YARD', kind: 'place', name: 'Harvard Yard', stationId: 'HAR', blurb: 'The historic heart of Harvard’s campus.', lat: 42.3744, lng: -71.1169, radius: 350 },
  { code: 'MIT-DOME', kind: 'place', name: 'MIT Great Dome', stationId: 'KEN', blurb: 'MIT’s landmark dome above Killian Court.', lat: 42.3596, lng: -71.0921, radius: 300 },
  { code: 'ESPLANADE', kind: 'place', name: 'Charles River Esplanade', stationId: 'CHA', blurb: 'A riverside park along the Charles.', lat: 42.3567, lng: -71.0745, radius: 900 },
  { code: 'BOSTON-COMMON', kind: 'place', name: 'Boston Common', stationId: 'PRK', blurb: 'Boston’s public park since 1634.', lat: 42.355, lng: -71.0656, radius: 500 },
  { code: 'FANEUIL-HALL', kind: 'place', name: 'Faneuil Hall', stationId: 'DTX', blurb: 'Marketplace and meeting hall since 1742.', lat: 42.36, lng: -71.0568, radius: 250 },
  { code: 'SOUTH-STATION', kind: 'place', name: 'South Station', stationId: 'SST', blurb: 'Boston’s big rail and bus hub.', lat: 42.3522, lng: -71.0552, radius: 250 },
  // Green Line B
  { code: 'CITY-HALL-PLAZA', kind: 'place', name: 'City Hall Plaza', stationId: 'GOV', blurb: 'The big brick plaza in front of Boston City Hall.', lat: 42.3603, lng: -71.058, radius: 250 },
  { code: 'PUBLIC-GARDEN', kind: 'place', name: 'Public Garden', stationId: 'ARL', blurb: 'Willows, the lagoon bridge and the swan boats.', lat: 42.3541, lng: -71.0704, radius: 350 },
  { code: 'BOSTON-PUBLIC-LIBRARY', kind: 'place', name: 'Boston Public Library', stationId: 'COP', blurb: 'The grand granite library on Copley Square.', lat: 42.3493, lng: -71.0782, radius: 200 },
  { code: 'FENWAY-PARK', kind: 'place', name: 'Fenway Park', stationId: 'KMR', blurb: 'Boston’s historic ballpark and its tall green wall.', lat: 42.3467, lng: -71.0972, radius: 300 },
  { code: 'BC-GASSON-HALL', kind: 'place', name: 'Gasson Hall', stationId: 'BCL', blurb: 'Boston College’s gothic tower on the Heights.', lat: 42.3355, lng: -71.1703, radius: 250 },
  { code: 'ART-KENDALL-BAND', kind: 'art', name: 'Kendall Band', stationId: 'KEN', blurb: 'Musical sculptures between the tracks.', lat: 42.3625, lng: -71.0862, radius: 250 },
  { code: 'ART-GLOVE-CYCLE', kind: 'art', name: 'Glove Cycle', stationId: 'POR', blurb: 'Bronze gloves along the escalators.', lat: 42.3884, lng: -71.1191, radius: 250 },
];

/** Reads a scanned QR string. Returns undefined if it isn't a TQuest code. */
export function parseQr(data: string): QrTarget | undefined {
  const raw = data.trim();
  if (!raw.toUpperCase().startsWith(QR_PREFIX)) return undefined;
  const code = raw.slice(QR_PREFIX.length).toUpperCase();
  return QR_TARGETS.find((t) => t.code === code);
}
