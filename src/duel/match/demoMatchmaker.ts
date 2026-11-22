// Demo riders: a scripted matchmaker that behaves like the real one, so the pitch never depends
// on Wi-Fi or on a second phone. By default the first rider backs out after you say yes, to show
// the automatic re-match ("Swift Ken can't duel right now — finding another rider…").

import { MatchStore } from './base';
import type { JoinParams, Matchmaker, MatchOffer, MatchRider } from './types';

export const DEMO_RIDERS: MatchRider[] = [
  { id: 'demo-ken', nickname: 'Swift Ken #46', mascot: 'KEN' },
  { id: 'demo-davi', nickname: 'Sunny Davi #12', mascot: 'DAV' },
  { id: 'demo-ally', nickname: 'Cozy Ally #7', mascot: 'ALE' },
  { id: 'demo-mitts', nickname: 'Brave Mitts #31', mascot: 'POR' },
];

export type DemoOptions = {
  /** first rider says no after you accept, to show the re-match (default true) */
  firstBacksOut?: boolean;
  searchMs?: number;   // time to "find" a rider
  answerMs?: number;   // time the other rider takes to answer
  restMs?: number;     // break after saying no or after a duel
  answerWindowSec?: number;
};

export class DemoMatchmaker implements Matchmaker {
  readonly source = 'demo' as const;
  private store = new MatchStore('demo');
  private timers: ReturnType<typeof setTimeout>[] = [];
  private next = 0;
  private params: JoinParams | null = null;
  private o: Required<DemoOptions>;

  constructor(opts: DemoOptions = {}) {
    this.o = { firstBacksOut: true, searchMs: 2500, answerMs: 1600, restMs: 20000, answerWindowSec: 20, ...opts };
  }

  subscribe = (fn: Parameters<Matchmaker['subscribe']>[0]) => this.store.subscribe(fn);
  getState = () => this.store.get();

  async start(p: JoinParams) {
    const fresh = !this.params;
    this.params = p;
    if (fresh) this.search();
  }

  async stop() {
    this.clear();
    this.params = null;
    this.store.set({ phase: 'off', offer: null, looking: 0, restingUntil: null, error: null });
  }

  async respond(accept: boolean) {
    const s = this.store.get();
    if (!s.offer || s.phase !== 'offer') return;
    this.clear();
    if (!accept) {
      this.store.iDeclined = true;
      return this.rest();
    }
    const offer = s.offer;
    this.store.patch({ phase: 'waiting', offer: { ...offer, myAnswer: true } });
    this.later(this.o.answerMs, () => {
      const backsOut = this.o.firstBacksOut && offer.opponent.id === DEMO_RIDERS[0].id;
      if (backsOut) {
        // they said no: I keep my place and get the next rider (the store adds the note)
        this.store.set({ phase: 'searching', offer: null, looking: 2, restingUntil: null, error: null });
        this.later(1800, () => this.offerNext());
      } else {
        this.store.set({ phase: 'ready', offer: { ...offer, myAnswer: true, theirAnswer: true, status: 'ready' }, looking: 1, restingUntil: null, error: null });
      }
    });
  }

  async expire() {
    if (this.store.get().phase !== 'offer') return;
    this.clear();
    this.store.iDeclined = true;
    this.rest();
  }

  async finish() {
    this.clear();
    this.rest();
  }

  // ───────── script ─────────

  private search() {
    this.store.set({ phase: 'searching', offer: null, looking: 3, restingUntil: null, error: null });
    this.later(this.o.searchMs, () => this.offerNext());
  }

  private offerNext() {
    if (!this.params) return;
    const rider = DEMO_RIDERS[this.next % DEMO_RIDERS.length];
    this.next += 1;
    const offer: MatchOffer = {
      id: `demo-${Date.now()}`,
      line: this.params.line,
      trainId: this.params.trainId ?? 'demo-train',
      opponent: rider,
      expiresAt: Date.now() + this.o.answerWindowSec * 1000,
      myAnswer: null,
      theirAnswer: null,
      status: 'pending',
      source: 'demo',
      isBot: true,
    };
    this.store.set({ phase: 'offer', offer, looking: 2, restingUntil: null, error: null });
  }

  private rest() {
    const until = Date.now() + this.o.restMs;
    this.store.set({ phase: 'resting', offer: null, looking: 2, restingUntil: until, error: null });
    this.later(this.o.restMs, () => this.search());
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, ms));
  }

  private clear() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
