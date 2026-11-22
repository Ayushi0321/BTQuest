import type { Rarity } from '@/components/StampCard';

export type DuelElement = 'storm' | 'moon' | 'sun';

export type PublicRider = {
  riderId: string;
  nickname: string;
  mascotStationId: string;
};

export type DuelCard = {
  uid?: string;
  stationId: string;
  seed: number;
  rarity: Rarity;
  edition?: 'champion';
  placeCode?: string;
  element?: DuelElement;
  time?: 'dawn' | 'day' | 'dusk' | 'night';
  weather?: 'leaves' | 'snow' | 'rain' | 'stars' | 'petals' | 'none';
  power?: number;
};

export type RoundResult = {
  duelId: string;
  round: number;
  a: DuelCard;
  b: DuelCard;
  winner: 'a' | 'b' | 'draw';
  aElement: DuelElement;
  bElement: DuelElement;
  aPower?: number;
  bPower?: number;
  aTotal?: number;
  bTotal?: number;
};

export type DuelMatchWinner = 'a' | 'b' | 'draw' | null;

export type DuelState = {
  duelId: string;
  me: PublicRider;
  opponent: PublicRider;
  round: number;
  hand: DuelCard[];
  opponentHand: DuelCard[];
  rounds: RoundResult[];
  aWins: number;
  bWins: number;
  waitingForOpponent: boolean;
  status: 'playing' | 'finished';
  winner: DuelMatchWinner;
};
