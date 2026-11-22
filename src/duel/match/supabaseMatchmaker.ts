// Real riders: the server (supabase/migrations/…_train_duel_matchmaking.sql) does the pairing.
// We join the queue, keep a heartbeat going, and listen to Realtime changes on our matches.
// Every server call returns the full state, so the app never has to guess.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import { MatchStore, phaseFor } from './base';
import type { JoinParams, Matchmaker, MatchOffer } from './types';

const HEARTBEAT_MS = 8000;

type Row = {
  id: string; line: string; train_id: string | null;
  player_a: string; player_b: string;
  a_nickname: string; a_mascot: string; b_nickname: string; b_mascot: string;
  a_accepted: boolean | null; b_accepted: boolean | null;
  status: MatchOffer['status']; expires_at: string;
};
type ServerState = { queue_status: string | null; resting_until: string | null; looking: number; match: Row | null };

export class SupabaseMatchmaker implements Matchmaker {
  readonly source = 'supabase' as const;
  private store = new MatchStore('supabase');
  private params: JoinParams | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private channel: RealtimeChannel | null = null;
  private busy = false;
  private again = false;

  constructor(private supabase: SupabaseClient, private userId: string) {}

  subscribe = (fn: Parameters<Matchmaker['subscribe']>[0]) => this.store.subscribe(fn);
  getState = () => this.store.get();

  /** Throws if the server isn't reachable or the SQL isn't installed — the hook then falls back to demo. */
  async start(p: JoinParams) {
    this.params = p;
    await this.join(true);
    if (!this.beat) this.beat = setInterval(() => { void this.join(); }, HEARTBEAT_MS);
    if (!this.channel) {
      const refresh = () => { void this.join(); };
      this.channel = this.supabase
        .channel(`duel-matches-${this.userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_matches', filter: `player_a=eq.${this.userId}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_matches', filter: `player_b=eq.${this.userId}` }, refresh)
        .subscribe();
    }
  }

  async stop() {
    if (this.beat) clearInterval(this.beat);
    this.beat = null;
    if (this.channel) await this.supabase.removeChannel(this.channel);
    this.channel = null;
    this.params = null;
    try { await this.supabase.rpc('duel_leave'); } catch {}
    this.store.set({ phase: 'off', offer: null, looking: 0, restingUntil: null, error: null });
  }

  async respond(accept: boolean) {
    const offer = this.store.get().offer;
    if (!offer) return;
    if (!accept) this.store.iDeclined = true;
    const { data, error } = await this.supabase.rpc('duel_respond', { p_match: offer.id, p_accept: accept });
    if (error) return this.fail(error.message);
    this.apply(data as ServerState);
  }

  /** The server times offers out on the next heartbeat; ask now so the UI updates right away. */
  async expire() {
    const s = this.store.get();
    if (s.phase === 'offer') this.store.iDeclined = true; // I'm the one who didn't answer
    await this.join();
  }

  async finish() {
    const offer = this.store.get().offer;
    if (!offer) return;
    const { data, error } = await this.supabase.rpc('duel_finish', { p_match: offer.id });
    if (error) return this.fail(error.message);
    this.apply(data as ServerState);
  }

  private async join(throwOnError = false) {
    if (!this.params) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try {
      const p = this.params;
      const { data, error } = await this.supabase.rpc('duel_join', {
        p_line: p.line, p_train: p.trainId ?? '', p_nickname: p.nickname, p_mascot: p.mascot,
      });
      if (error) {
        if (throwOnError) throw new Error(error.message);
        return this.fail(error.message);
      }
      this.apply(data as ServerState);
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; void this.join(); }
    }
  }

  private apply(s: ServerState) {
    const offer = s.match ? this.toOffer(s.match) : null;
    this.store.set({
      phase: phaseFor(s.queue_status, offer),
      offer,
      looking: s.looking ?? 0,
      restingUntil: s.resting_until ? Date.parse(s.resting_until) : null,
      error: null,
    });
  }

  private toOffer(r: Row): MatchOffer {
    const iAmA = r.player_a === this.userId;
    return {
      id: r.id,
      line: r.line,
      trainId: r.train_id,
      opponent: iAmA
        ? { id: r.player_b, nickname: r.b_nickname, mascot: r.b_mascot }
        : { id: r.player_a, nickname: r.a_nickname, mascot: r.a_mascot },
      expiresAt: Date.parse(r.expires_at),
      myAnswer: iAmA ? r.a_accepted : r.b_accepted,
      theirAnswer: iAmA ? r.b_accepted : r.a_accepted,
      status: r.status,
      source: 'supabase',
      isBot: false,
    };
  }

  private fail(message: string) {
    this.store.patch({ error: message });
  }
}
