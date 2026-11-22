// Every station in the app, each with its own mascot. Line order and branches live in data/lines.ts.
// mbtaId = MBTA V3 API parent-station id.

export type BodyShape = 'car' | 'round' | 'tall' | 'bean';
export type Accessory =
  | 'grad' | 'headphones' | 'antenna' | 'leaf' | 'clock' | 'tophat'
  | 'fin' | 'crown' | 'beanie' | 'mitten' | 'cross' | 'star' | 'bow';
export type Scene = 'river' | 'park' | 'city' | 'campus' | 'tower' | 'shore' | 'theatre';

export type Station = {
  id: string;          // short code used in the app (e.g. 'KEN')
  name: string;        // display name
  mbtaId: string;      // MBTA V3 parent station id
  mascot: string;      // mascot's name
  shape: BodyShape;
  color: string;       // mascot body color
  accessory: Accessory;
  scene: Scene;        // background used on painted stamp cards
  branch?: 'ashmont' | 'braintree';
  art?: { title: string; artist: string; story: string };
};

/** Red Line, north to south: trunk, then the Ashmont branch, then the Braintree branch. */
export const RED_STATIONS: Station[] = [
  { id: 'ALE', name: 'Alewife', mbtaId: 'place-alfcl', mascot: 'Ally', shape: 'bean', color: '#5BB3B0', accessory: 'fin', scene: 'park' },
  { id: 'DAV', name: 'Davis', mbtaId: 'place-davis', mascot: 'Davi', shape: 'round', color: '#E9806E', accessory: 'star', scene: 'city' },
  {
    id: 'POR', name: 'Porter', mbtaId: 'place-portr', mascot: 'Mitts', shape: 'car', color: '#F0A04B', accessory: 'mitten', scene: 'city',
    art: { title: 'Glove Cycle', artist: 'Mags Harries', story: 'Bronze gloves are scattered along the escalators and platform, as if riders dropped them while hurrying for the train.' },
  },
  { id: 'HAR', name: 'Harvard', mbtaId: 'place-harsq', mascot: 'Harv', shape: 'tall', color: '#C7615A', accessory: 'grad', scene: 'campus' },
  { id: 'CEN', name: 'Central', mbtaId: 'place-cntsq', mascot: 'Cee', shape: 'round', color: '#A479B8', accessory: 'headphones', scene: 'theatre' },
  {
    id: 'KEN', name: 'Kendall/MIT', mbtaId: 'place-knncl', mascot: 'Ken', shape: 'car', color: '#6E93D6', accessory: 'antenna', scene: 'river',
    art: { title: 'Kendall Band', artist: 'Paul Matisse', story: 'Three musical sculptures live between the tracks. Pull a handle on the platform and you can play them while you wait.' },
  },
  { id: 'CHA', name: 'Charles/MGH', mbtaId: 'place-chmnl', mascot: 'Charlie', shape: 'bean', color: '#6CC19A', accessory: 'cross', scene: 'river' },
  { id: 'PRK', name: 'Park Street', mbtaId: 'place-pktrm', mascot: 'Parker', shape: 'round', color: '#5DB884', accessory: 'leaf', scene: 'park' },
  { id: 'DTX', name: 'Downtown Crossing', mbtaId: 'place-dwnxg', mascot: 'Dot', shape: 'tall', color: '#E58BB0', accessory: 'bow', scene: 'city' },
  { id: 'SST', name: 'South Station', mbtaId: 'place-sstat', mascot: 'Southie', shape: 'car', color: '#E26B60', accessory: 'clock', scene: 'tower' },
  { id: 'BWY', name: 'Broadway', mbtaId: 'place-brdwy', mascot: 'Bway', shape: 'tall', color: '#9C7BD0', accessory: 'tophat', scene: 'theatre' },
  { id: 'AND', name: 'Andrew', mbtaId: 'place-andrw', mascot: 'Andy', shape: 'round', color: '#E6B23A', accessory: 'beanie', scene: 'city' },
  { id: 'JFK', name: 'JFK/UMass', mbtaId: 'place-jfk', mascot: 'Jay', shape: 'car', color: '#5A80C6', accessory: 'crown', scene: 'shore' },
  { id: 'SAV', name: 'Savin Hill', mbtaId: 'place-shmnl', mascot: 'Sav', shape: 'bean', color: '#4FB0A5', accessory: 'leaf', scene: 'shore', branch: 'ashmont' },
  { id: 'FLD', name: 'Fields Corner', mbtaId: 'place-fldcr', mascot: 'Fieldy', shape: 'round', color: '#EE9A45', accessory: 'beanie', scene: 'city', branch: 'ashmont' },
  { id: 'SHM', name: 'Shawmut', mbtaId: 'place-smmnl', mascot: 'Shaw', shape: 'tall', color: '#E08070', accessory: 'headphones', scene: 'park', branch: 'ashmont' },
  { id: 'ASH', name: 'Ashmont', mbtaId: 'place-asmnl', mascot: 'Ash', shape: 'car', color: '#9AA6B2', accessory: 'tophat', scene: 'city', branch: 'ashmont' },
  { id: 'NQU', name: 'North Quincy', mbtaId: 'place-nqncy', mascot: 'Quinn', shape: 'bean', color: '#6E93D6', accessory: 'fin', scene: 'shore', branch: 'braintree' },
  { id: 'WOL', name: 'Wollaston', mbtaId: 'place-wlsta', mascot: 'Wolly', shape: 'round', color: '#6CC19A', accessory: 'star', scene: 'shore', branch: 'braintree' },
  { id: 'QCY', name: 'Quincy Center', mbtaId: 'place-qnctr', mascot: 'Q', shape: 'tall', color: '#E6B23A', accessory: 'crown', scene: 'tower', branch: 'braintree' },
  { id: 'QAD', name: 'Quincy Adams', mbtaId: 'place-qamnl', mascot: 'Addie', shape: 'car', color: '#E58BB0', accessory: 'bow', scene: 'park', branch: 'braintree' },
  { id: 'BRA', name: 'Braintree', mbtaId: 'place-brntn', mascot: 'Brain', shape: 'bean', color: '#5DB884', accessory: 'clock', scene: 'park', branch: 'braintree' },
];

/** Green Line B branch, Government Center to Boston College. Park Street is shared with the Red Line. */
export const GREEN_B_STATIONS: Station[] = [
  { id: 'GOV', name: 'Government Center', mbtaId: 'place-gover', mascot: 'Govi', shape: 'tall', color: '#7FA7D9', accessory: 'tophat', scene: 'city' },
  { id: 'BOY', name: 'Boylston', mbtaId: 'place-boyls', mascot: 'Boyd', shape: 'round', color: '#E9A15B', accessory: 'headphones', scene: 'theatre' },
  { id: 'ARL', name: 'Arlington', mbtaId: 'place-armnl', mascot: 'Arlo', shape: 'bean', color: '#7CC4A4', accessory: 'bow', scene: 'park' },
  { id: 'COP', name: 'Copley', mbtaId: 'place-coecl', mascot: 'Copper', shape: 'car', color: '#D98C5F', accessory: 'grad', scene: 'tower' },
  { id: 'HYN', name: 'Hynes Convention Center', mbtaId: 'place-hymnl', mascot: 'Hyde', shape: 'tall', color: '#9C7BD0', accessory: 'star', scene: 'city' },
  { id: 'KMR', name: 'Kenmore', mbtaId: 'place-kencl', mascot: 'Kenzie', shape: 'round', color: '#E26B60', accessory: 'beanie', scene: 'theatre' },
  { id: 'BLA', name: 'Blandford Street', mbtaId: 'place-bland', mascot: 'Blanche', shape: 'bean', color: '#6E93D6', accessory: 'leaf', scene: 'river' },
  { id: 'BUE', name: 'Boston University East', mbtaId: 'place-buest', mascot: 'Easton', shape: 'car', color: '#C7615A', accessory: 'grad', scene: 'campus' },
  { id: 'BUC', name: 'Boston University Central', mbtaId: 'place-bucen', mascot: 'Centra', shape: 'tall', color: '#E58BB0', accessory: 'headphones', scene: 'campus' },
  { id: 'AMY', name: 'Amory Street', mbtaId: 'place-amory', mascot: 'Amos', shape: 'round', color: '#5BB3B0', accessory: 'antenna', scene: 'campus' },
  { id: 'BAB', name: 'Babcock Street', mbtaId: 'place-babck', mascot: 'Babs', shape: 'bean', color: '#F0A04B', accessory: 'mitten', scene: 'city' },
  { id: 'PAC', name: 'Packard’s Corner', mbtaId: 'place-brico', mascot: 'Pax', shape: 'car', color: '#A479B8', accessory: 'clock', scene: 'city' },
  { id: 'HAV', name: 'Harvard Avenue', mbtaId: 'place-harvd', mascot: 'Ava', shape: 'tall', color: '#6CC19A', accessory: 'star', scene: 'theatre' },
  { id: 'GRG', name: 'Griggs Street', mbtaId: 'place-grigg', mascot: 'Grigg', shape: 'round', color: '#9AA6B2', accessory: 'beanie', scene: 'city' },
  { id: 'ALS', name: 'Allston Street', mbtaId: 'place-alsgr', mascot: 'Stony', shape: 'bean', color: '#E6B23A', accessory: 'antenna', scene: 'city' },
  { id: 'WAR', name: 'Warren Street', mbtaId: 'place-wrnst', mascot: 'Wren', shape: 'car', color: '#5DB884', accessory: 'leaf', scene: 'park' },
  { id: 'WSH', name: 'Washington Street', mbtaId: 'place-wascm', mascot: 'Washi', shape: 'tall', color: '#7096DA', accessory: 'tophat', scene: 'city' },
  { id: 'SUT', name: 'Sutherland Road', mbtaId: 'place-sthld', mascot: 'Suki', shape: 'round', color: '#EE9A45', accessory: 'bow', scene: 'park' },
  { id: 'CHW', name: 'Chiswick Road', mbtaId: 'place-chswk', mascot: 'Chiz', shape: 'bean', color: '#C08AB9', accessory: 'crown', scene: 'park' },
  { id: 'CHH', name: 'Chestnut Hill Avenue', mbtaId: 'place-chill', mascot: 'Chet', shape: 'car', color: '#B5835A', accessory: 'leaf', scene: 'park' },
  { id: 'SOU', name: 'South Street', mbtaId: 'place-sougr', mascot: 'Sunny', shape: 'tall', color: '#E9806E', accessory: 'star', scene: 'park' },
  { id: 'BCL', name: 'Boston College', mbtaId: 'place-lake', mascot: 'Collie', shape: 'round', color: '#B0413E', accessory: 'grad', scene: 'campus' },
];

export const STATIONS: Station[] = [...RED_STATIONS, ...GREEN_B_STATIONS];

export const stationById = (id: string): Station | undefined => STATIONS.find((s) => s.id === id);
export const stationByMbtaId = (mbtaId: string): Station | undefined => STATIONS.find((s) => s.mbtaId === mbtaId);

/** The station whose mascot represents a rider: their favorite, or one picked from their username. */
export function riderMascot(fav: string | null | undefined, username: string): string {
  if (fav && stationById(fav)) return fav;
  let h = 0;
  for (const ch of username.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return STATIONS[Math.abs(h) % STATIONS.length].id;
}
