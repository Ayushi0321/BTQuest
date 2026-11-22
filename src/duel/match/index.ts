// Train Duel auto-matchmaking (server pairs riders on the same line; demo riders as fallback).
export { DEMO_RIDERS, DemoMatchmaker, type DemoOptions } from './demoMatchmaker';
export { SupabaseMatchmaker } from './supabaseMatchmaker';
export type { JoinParams, Matchmaker, MatchOffer, MatchPhase, MatchRider, MatchSource, MatchState } from './types';
export { finishCurrentMatch, useMatchmaking } from './useMatchmaking';
