import { OFF_STATE, type MatchOffer, type MatchSource, type MatchState } from './types';

/** Shared listener plumbing + "your opponent backed out" note detection. */
export class MatchStore {
  private state: MatchState;
  private listeners = new Set<(s: MatchState) => void>();
  private noteId = 0;
  /** set by the backend right before it reports my own "no", so we don't blame the other rider */
  iDeclined = false;

  constructor(readonly source: MatchSource) {
    this.state = OFF_STATE(source);
  }

  get = () => this.state;

  subscribe = (fn: (s: MatchState) => void) => {
    this.listeners.add(fn);
    fn(this.state);
    return () => { this.listeners.delete(fn); };
  };

  /** Change some fields and keep the rest (never re-sends an old note). */
  patch(p: Partial<Omit<MatchState, 'note' | 'source'>>) {
    const { note: _note, source: _source, ...rest } = this.state;
    this.set({ ...rest, ...p });
  }

  set(next: Omit<MatchState, 'note' | 'source'> & { note?: string | null }) {
    const prev = this.state;
    let note: MatchState['note'] = null;
    if (next.note) {
      note = { id: ++this.noteId, text: next.note };
    } else if (
      // I had an offer (or said yes) with someone, and now that match is gone without me saying no
      prev.offer && (prev.phase === 'offer' || prev.phase === 'waiting') &&
      next.offer?.id !== prev.offer.id && next.phase !== 'off' && !this.iDeclined
    ) {
      const who = prev.offer.opponent.nickname;
      note = {
        id: ++this.noteId,
        text: next.offer ? `${who} couldn't duel — new match found!` : `${who} can't duel right now — finding another rider…`,
      };
    }
    this.iDeclined = false;
    this.state = { ...next, note, source: this.source } as MatchState;
    this.listeners.forEach((l) => l(this.state));
  }
}

export function phaseFor(queueStatus: string | null, offer: MatchOffer | null): MatchState['phase'] {
  if (!queueStatus) return 'off';
  if (offer?.status === 'ready') return 'ready';
  if (offer?.status === 'pending') return offer.myAnswer === true ? 'waiting' : 'offer';
  if (queueStatus === 'resting') return 'resting';
  return 'searching';
}
