// Auto-matchmaking: riders on the same line are paired by the system (no one sends an invite).
// Two backends share this shape: Supabase (real riders) and Demo (scripted riders, always works).

export type MatchSource = 'supabase' | 'demo';

export type MatchRider = { id: string; nickname: string; mascot: string };

export type MatchOffer = {
  id: string;
  line: string;
  trainId: string | null;      // set when both riders are on the same train
  opponent: MatchRider;
  /** epoch ms when the 20-second answer window closes */
  expiresAt: number;
  myAnswer: boolean | null;    // null = I haven't answered
  theirAnswer: boolean | null;
  status: 'pending' | 'ready' | 'cancelled' | 'expired' | 'finished';
  source: MatchSource;
  /** true for scripted demo riders → play against the BotTransport */
  isBot: boolean;
};

/**
 * off        – not in the queue ("Duel me" is off)
 * searching  – waiting for another rider on the line
 * offer      – "Match found!" — answer within 20 s
 * waiting    – I said yes, waiting for the other rider
 * ready      – both said yes → open the duel screen
 * resting    – short break after saying no / after a duel
 */
export type MatchPhase = 'off' | 'searching' | 'offer' | 'waiting' | 'ready' | 'resting';

export type MatchState = {
  phase: MatchPhase;
  offer: MatchOffer | null;
  /** other riders looking for a duel on this line right now */
  looking: number;
  restingUntil: number | null;
  source: MatchSource;
  /** one-off message to show, e.g. "Swift Ken can't duel right now — finding another rider…" */
  note: { id: number; text: string } | null;
  error: string | null;
};

export type JoinParams = {
  line: string;                // 'red', 'green-b', …
  trainId?: string | null;     // MBTA vehicle id, when the trip is locked to a train
  nickname: string;
  mascot: string;              // station id for the rider's mascot, e.g. 'DAV'
};

export interface Matchmaker {
  readonly source: MatchSource;
  start(p: JoinParams): Promise<void>;
  stop(): Promise<void>;
  respond(accept: boolean): Promise<void>;
  /** the answer window ran out on screen */
  expire(): Promise<void>;
  /** the duel is over (call from the duel screen) */
  finish(): Promise<void>;
  subscribe(fn: (s: MatchState) => void): () => void;
  getState(): MatchState;
}

export const OFF_STATE = (source: MatchSource): MatchState => ({
  phase: 'off', offer: null, looking: 0, restingUntil: null, source, note: null, error: null,
});
