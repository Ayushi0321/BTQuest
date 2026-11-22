import { supabase } from '@/lib/supabase';
import { matchWinner, resolvePowerRound } from '@/features/duel/rules';
import type { DuelTransport } from '@/features/duel/transport';
import type { DuelCard, DuelState, PublicRider, RoundResult } from '@/features/duel/types';

type RoomPresence = {
  nickname: string;
  mascot: string;
  ready: boolean;
};

type RoomPayload = {
  from: string;
  to: string;
  matchId: string;
};

type PickPayload = RoomPayload & {
  round: number;
  card: DuelCard;
};

type SupabaseChannel = ReturnType<typeof supabase.channel>;

export class SupabaseDuelTransport implements DuelTransport {
  private channel: SupabaseChannel | null = null;
  private trainId: string | null = null;
  private me: PublicRider | null = null;
  private opponent: PublicRider | null = null;
  private localSide: 'a' | 'b' = 'a';
  private duel: DuelState | null = null;
  private pendingInvites = new Map<string, { from: PublicRider; expiresAt: number }>();
  private inviteTarget: string | null = null;
  private readonly picks = new Map<string, Map<number, { a?: DuelCard; b?: DuelCard }>>();
  private readonly pickTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly ridersListeners = new Set<(riders: PublicRider[]) => void>();
  private readonly inviteListeners = new Set<(from: PublicRider, duelId: string) => void>();
  private readonly roundListeners = new Set<(result: RoundResult) => void>();
  private readonly opponentLeftListeners = new Set<() => void>();
  private readonly duelStartedListeners = new Set<(state: DuelState) => void>();

  // supabase.channel(topic) returns any channel already registered under that
  // topic, and removeChannel() only unregisters it once the server confirms the
  // close. Re-joining before that finishes would hand us the old, already
  // subscribed channel, and adding listeners to it throws. So every join waits
  // for the previous removal, and a newer join/leave cancels an older join.
  private removing: Promise<unknown> = Promise.resolve();
  private joinToken = 0;
  // Matchmade duel: set by joinMatch, the duel starts when the opponent shows up.
  private matchId: string | null = null;
  private matchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly sessionId: string) {}

  joinTrainRoom(trainId: string, me: PublicRider): void {
    if (this.trainId === trainId) return;
    this.leaveTrainRoom();
    this.trainId = trainId;
    this.me = me;
    const token = ++this.joinToken;
    void this.openChannel(`train:${trainId}`, token);
  }

  /**
   * Duel picked by the server matchmaker: both riders join `duel:<matchId>`.
   * No invite step. The duel starts once each sees the other; the lower session id plays side a.
   */
  joinMatch(matchId: string, me: PublicRider): void {
    const room = `duel:${matchId}`;
    if (this.trainId === room) return;
    this.leaveTrainRoom();
    this.trainId = room;
    this.me = me;
    this.matchId = matchId;
    const token = ++this.joinToken;
    void this.openChannel(room, token);
    // Opponent never arrived (app closed, offline): end it like a leave.
    this.matchTimer = setTimeout(() => {
      if (this.matchId === matchId && !this.duel) for (const cb of this.opponentLeftListeners) cb();
    }, 30_000);
  }

  private async openChannel(name: string, token: number): Promise<void> {
    await this.removing;
    // A leftover channel on this topic (e.g. from a previous transport instance).
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
    if (stale) await supabase.removeChannel(stale).catch(() => undefined);
    if (token !== this.joinToken) return;

    this.channel = supabase.channel(name, {
      config: {
        presence: { key: this.sessionId },
        broadcast: { self: false },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => this.emitRiders())
      .on('presence', { event: 'join' }, () => this.emitRiders())
      .on('presence', { event: 'leave' }, () => this.emitRiders())
      .on('broadcast', { event: 'invite' }, ({ payload }: { payload: RoomPayload }) => this.onInvitePayload(payload))
      .on('broadcast', { event: 'accept' }, ({ payload }: { payload: RoomPayload }) => this.onAcceptPayload(payload))
      .on('broadcast', { event: 'decline' }, ({ payload }: { payload: RoomPayload }) => this.onDeclinePayload(payload))
      .on('broadcast', { event: 'pick' }, ({ payload }: { payload: PickPayload }) => this.onPickPayload(payload))
      .on('broadcast', { event: 'leave' }, ({ payload }: { payload: RoomPayload }) => this.onLeavePayload(payload))
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || !this.channel || !this.me) return;
        await this.channel.track({
          nickname: this.me.nickname,
          mascot: this.me.mascotStationId,
          ready: true,
        });
      });
  }

  leaveTrainRoom(): void {
    const matchId = this.duel?.duelId;
    if (this.channel && this.me && this.opponent && matchId) {
      void this.channel.send({
        type: 'broadcast',
        event: 'leave',
        payload: { from: this.sessionId, to: this.opponent.riderId, matchId } satisfies RoomPayload,
      });
    }
    this.joinToken++;
    if (this.channel) {
      const channel = this.channel;
      void channel.untrack();
      this.removing = supabase.removeChannel(channel).catch(() => undefined);
    }
    for (const timer of this.pickTimers.values()) clearTimeout(timer);
    this.pickTimers.clear();
    if (this.matchTimer) clearTimeout(this.matchTimer);
    this.matchTimer = null;
    this.matchId = null;
    this.channel = null;
    this.trainId = null;
    this.opponent = null;
    this.duel = null;
  }

  onRidersChanged(cb: (riders: PublicRider[]) => void): () => void {
    this.ridersListeners.add(cb);
    this.emitRiders();
    return () => this.ridersListeners.delete(cb);
  }

  sendInvite(): void {
    if (!this.channel || !this.me) return;
    const target = this.inviteTarget;
    if (!target) return;
    this.localSide = 'a';
    const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    void this.channel.send({
      type: 'broadcast',
      event: 'invite',
      payload: { from: this.sessionId, to: target, matchId } satisfies RoomPayload,
    });
  }

  sendInviteTo(riderId: string): void {
    this.inviteTarget = riderId;
    this.sendInvite();
  }

  onInvite(cb: (from: PublicRider, duelId: string) => void): () => void {
    this.inviteListeners.add(cb);
    return () => this.inviteListeners.delete(cb);
  }

  acceptInvite(duelId: string): void {
    if (!this.channel || !this.me) return;
    const pending = this.pendingInvites.get(duelId);
    if (!pending || pending.expiresAt < Date.now()) return;
    this.localSide = 'b';
    this.opponent = pending.from;
    this.pendingInvites.delete(duelId);
    void this.channel.send({
      type: 'broadcast',
      event: 'accept',
      payload: { from: this.sessionId, to: pending.from.riderId, matchId: duelId } satisfies RoomPayload,
    });
    this.startDuel(duelId, pending.from);
  }

  declineInvite(duelId: string): void {
    if (!this.channel) return;
    const pending = this.pendingInvites.get(duelId);
    if (!pending) return;
    void this.channel.send({
      type: 'broadcast',
      event: 'decline',
      payload: { from: this.sessionId, to: pending.from.riderId, matchId: duelId } satisfies RoomPayload,
    });
    this.pendingInvites.delete(duelId);
  }

  sendPick(duelId: string, round: number, card: DuelCard): void {
    if (!this.channel || !this.opponent) return;
    void this.channel.send({
      type: 'broadcast',
      event: 'pick',
      payload: { from: this.sessionId, to: this.opponent.riderId, matchId: duelId, round, card } satisfies PickPayload,
    });
    this.recordPick(duelId, round, this.sessionId, card);
  }

  onRoundResolved(cb: (r: RoundResult) => void): () => void {
    this.roundListeners.add(cb);
    return () => this.roundListeners.delete(cb);
  }

  onOpponentLeft(cb: () => void): () => void {
    this.opponentLeftListeners.add(cb);
    return () => this.opponentLeftListeners.delete(cb);
  }

  onDuelStarted(cb: (state: DuelState) => void): () => void {
    this.duelStartedListeners.add(cb);
    if (this.duel) cb({ ...this.duel });
    return () => this.duelStartedListeners.delete(cb);
  }

  private emitRiders(): void {
    if (!this.channel) {
      for (const cb of this.ridersListeners) cb([]);
      return;
    }
    const state = this.channel.presenceState<RoomPresence>();
    const riders: PublicRider[] = [];
    for (const [riderId, entries] of Object.entries(state)) {
      if (riderId === this.sessionId) continue;
      const entry = entries[0];
      if (!entry || entry.ready !== true) continue;
      riders.push({
        riderId,
        nickname: entry.nickname,
        mascotStationId: entry.mascot,
      });
    }
    for (const cb of this.ridersListeners) cb(riders);

    if (this.matchId && !this.duel && riders[0]) {
      const opponent = riders[0];
      this.localSide = this.sessionId < opponent.riderId ? 'a' : 'b';
      if (this.matchTimer) clearTimeout(this.matchTimer);
      this.matchTimer = null;
      this.startDuel(this.matchId, opponent);
    }
  }

  private onInvitePayload(payload: RoomPayload): void {
    if (payload.to !== this.sessionId || payload.from === this.sessionId) return;
    const from = this.findRider(payload.from);
    if (!from) return;
    this.pendingInvites.set(payload.matchId, { from, expiresAt: Date.now() + 20_000 });
    setTimeout(() => {
      const pending = this.pendingInvites.get(payload.matchId);
      if (pending?.expiresAt && pending.expiresAt <= Date.now()) this.pendingInvites.delete(payload.matchId);
    }, 20_100);
    for (const cb of this.inviteListeners) cb(from, payload.matchId);
  }

  private onAcceptPayload(payload: RoomPayload): void {
    if (payload.to !== this.sessionId || payload.from === this.sessionId) return;
    const opponent = this.findRider(payload.from);
    if (!opponent) return;
    this.localSide = 'a';
    this.opponent = opponent;
    this.startDuel(payload.matchId, opponent);
  }

  private onDeclinePayload(payload: RoomPayload): void {
    if (payload.to !== this.sessionId) return;
  }

  private onPickPayload(payload: PickPayload): void {
    if (payload.to !== this.sessionId || payload.from === this.sessionId) return;
    this.recordPick(payload.matchId, payload.round, payload.from, payload.card);
  }

  private onLeavePayload(payload: RoomPayload): void {
    if (payload.to !== this.sessionId) return;
    this.finishWithoutReward();
  }

  private findRider(riderId: string): PublicRider | null {
    if (!this.channel) return null;
    const state = this.channel.presenceState<RoomPresence>();
    const entry = state[riderId]?.[0];
    if (!entry) return null;
    return { riderId, nickname: entry.nickname, mascotStationId: entry.mascot };
  }

  private startDuel(matchId: string, opponent: PublicRider): void {
    if (!this.me) return;
    this.opponent = opponent;
    this.duel = {
      duelId: matchId,
      me: this.me,
      opponent,
      round: 1,
      hand: [],
      opponentHand: [],
      rounds: [],
      aWins: 0,
      bWins: 0,
      waitingForOpponent: false,
      status: 'playing',
      winner: null,
    };
    for (const cb of this.duelStartedListeners) cb({ ...this.duel });
  }

  private recordPick(matchId: string, round: number, from: string, card: DuelCard): void {
    if (!this.duel || this.duel.duelId !== matchId || this.duel.round !== round) return;
    let rounds = this.picks.get(matchId);
    if (!rounds) {
      rounds = new Map();
      this.picks.set(matchId, rounds);
    }
    const picked = rounds.get(round) ?? {};
    const fromSide = from === this.sessionId ? this.localSide : this.localSide === 'a' ? 'b' : 'a';
    if (fromSide === 'a') picked.a = card;
    else picked.b = card;
    rounds.set(round, picked);

    if (picked.a && picked.b && (picked.a.power ?? 0) > 0 && (picked.b.power ?? 0) > 0) {
      const timer = this.pickTimers.get(matchId);
      if (timer) clearTimeout(timer);
      const pureResult = resolvePowerRound(picked.a, picked.b, matchId, round);
      const result: RoundResult = this.localSide === 'b'
        ? { ...pureResult, winner: pureResult.winner === 'a' ? 'b' : pureResult.winner === 'b' ? 'a' : 'draw' }
        : pureResult;
      this.duel.rounds = [...this.duel.rounds, result];
      this.duel.aWins += result.winner === 'a' ? 1 : 0;
      this.duel.bWins += result.winner === 'b' ? 1 : 0;
      for (const cb of this.roundListeners) cb(result);

      const winner = matchWinner(this.duel.rounds);
      if (winner) {
        this.duel.status = 'finished';
        this.duel.winner = winner;
        for (const cb of this.duelStartedListeners) cb({ ...this.duel });
        this.picks.delete(matchId);
      } else {
        this.duel.round++;
        this.duel.waitingForOpponent = false;
        for (const cb of this.duelStartedListeners) cb({ ...this.duel });
        this.startPickTimer(matchId);
      }
      return;
    }

    this.duel.waitingForOpponent = true;
    this.startPickTimer(matchId);
  }

  private startPickTimer(matchId: string): void {
    const existing = this.pickTimers.get(matchId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      if (!this.duel || this.duel.duelId !== matchId) return;
      this.finishWithoutReward();
    }, 30_000);
    this.pickTimers.set(matchId, timer);
  }

  private finishWithoutReward(): void {
    if (!this.duel) return;
    const timer = this.pickTimers.get(this.duel.duelId);
    if (timer) clearTimeout(timer);
    this.pickTimers.delete(this.duel.duelId);
    this.duel.status = 'finished';
    this.duel.winner = null;
    for (const cb of this.opponentLeftListeners) cb();
  }
}
