// Red Line stations, north to south (Alewife → JFK/UMass → Ashmont / Braintree branches).
// mbtaId = MBTA V3 API parent-station id. Double-check against
// https://api-v3.mbta.com/stops?filter[route]=Red before relying on them.

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

export const STATIONS: Station[] = [
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

export const stationById = (id: string): Station | undefined => STATIONS.find((s) => s.id === id);
export const stationByMbtaId = (mbtaId: string): Station | undefined => STATIONS.find((s) => s.mbtaId === mbtaId);
