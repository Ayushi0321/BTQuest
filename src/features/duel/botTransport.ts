import { describeCard } from '@/components/StampCard';
import type { OwnedCard } from '@/state/game';

import { matchWinner, resolvePowerRound } from './rules';
import type { DuelTransport } from './transport';
import type { DuelCard, DuelState, PublicRider, RoundResult } from './types';

const BOT_ALBUM_STATIONS = ['ALE', 'DAV', 'POR', 'HAR', 'CEN', 'KEN', 'CHA', 'PRK', 'DTX', 'SST'];

export function ownedCardsToDuelCards(cards: OwnedCard[]): DuelCard[] {
  return cards.map((card) => {
    const described = describeCard(card.stationId, card.seed, card.rarity, card.placeCode);
    const element =
      described.weather === 'rain' || described.weather === 'snow'
        ? 'storm'
        : described.time === 'dusk' || described.time === 'night' || described.weather === 'stars'
          ? 'moon'
          : 'sun';
    return {
      uid: card.uid,
      stationId: card.stationId,
      seed: card.seed,
      rarity: card.rarity,
      placeCode: card.placeCode,
      element,
    };
  });
}

export function makeBotAlbum(count = 18): DuelCard[] {
  const rarities: DuelCard['rarity'][] = ['C', 'C', 'C', 'C', 'R', 'R', 'R', 'E', 'E', 'L'];
  return Array.from({ length: count }, (_, i) => {
    const stationId = BOT_ALBUM_STATIONS[i % BOT_ALBUM_STATIONS.length];
    const rarity = rarities[(i * 7 + 3) % rarities.length];
    const card: DuelCard = { stationId, seed: 100 + i * 137, rarity };
    const described = describeCard(stationId, card.seed, rarity);
    card.element =
      described.weather === 'rain' || described.weather === 'snow'
        ? 'storm'
        : described.time === 'dusk' || described.time === 'night' || described.weather === 'stars'
          ? 'moon'
          : 'sun';
    return card;
  });
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class BotTransport implements DuelTransport {
  private me: PublicRider | null = null;
  private bot: PublicRider = {
    riderId: 'bot-' + Math.random().toString(36).slice(2, 8),
    nickname: 'Swift Ken #' + (10 + Math.floor(Math.random() * 90)),
    mascotStationId: 'KEN',
  };
  private trainId: string | null = null;
  private duel: DuelState | null = null;
  private playerHand: DuelCard[] = [];
  private botHand: DuelCard[] = [];
  private botAlbum: DuelCard[];
  private playerPick: DuelCard | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private duelId = 'duel-' + Date.now();
  private botSeed = Math.floor(Math.random() * 2147483647);

  private readonly riderListeners = new Set<(riders: PublicRider[]) => void>();
  private readonly inviteListeners = new Set<(from: PublicRider, duelId: string) => void>();
  private readonly roundListeners = new Set<(result: RoundResult) => void>();
  private readonly opponentLeftListeners = new Set<() => void>();
  private readonly duelStartedListeners = new Set<(state: DuelState) => void>();

  constructor(playerAlbum: OwnedCard[] = [], botAlbum = makeBotAlbum()) {
    this.playerHand = ownedCardsToDuelCards(playerAlbum).slice(0, 18);
    this.botAlbum = botAlbum;
  }

  joinTrainRoom(trainId: string, me: PublicRider): void {
    this.trainId = trainId;
    this.me = me;
    for (const cb of this.riderListeners) cb([me, this.bot]);
  }

  leaveTrainRoom(): void {
    this.trainId = null;
    if (this.botTimer) clearTimeout(this.botTimer);
  }

  onRidersChanged(cb: (riders: PublicRider[]) => void): () => void {
    this.riderListeners.add(cb);
    if (this.me && this.trainId) cb([this.me, this.bot]);
    return () => this.riderListeners.delete(cb);
  }

  sendInvite(): void {
    if (!this.me || !this.trainId) return;
    for (const cb of this.inviteListeners) cb(this.bot, this.duelId);
  }

  onInvite(cb: (from: PublicRider, duelId: string) => void): () => void {
    this.inviteListeners.add(cb);
    return () => this.inviteListeners.delete(cb);
  }

  acceptInvite(duelId: string): void {
    if (!this.me || duelId !== this.duelId) return;
    const playerCards = this.playerHand.length ? shuffled(this.playerHand).slice(0, 3) : makeBotAlbum(3);
    this.botHand = shuffled(this.botAlbum).slice(0, 3);
    this.playerHand = playerCards;
    this.playerPick = null;
    this.duel = {
      duelId,
      me: this.me,
      opponent: this.bot,
      round: 1,
      hand: playerCards,
      opponentHand: this.botHand,
      rounds: [],
      aWins: 0,
      bWins: 0,
      waitingForOpponent: false,
      status: 'playing',
      winner: null,
    };
    for (const cb of this.duelStartedListeners) cb({ ...this.duel, opponentHand: [] });
  }

  declineInvite(_duelId: string): void {}

  sendPick(duelId: string, round: number, card: DuelCard): void {
    if (!this.duel || duelId !== this.duel.duelId || round !== this.duel.round) return;
    this.playerPick = card;

    if (this.botTimer) clearTimeout(this.botTimer);
    if (!card.power || card.power <= 0) return;
    this.botTimer = setTimeout(() => {
      if (!this.duel) return;
      const random = (() => {
        this.botSeed = (this.botSeed * 48271) % 2147483647;
        return this.botSeed / 2147483647;
      })();
      const botPick = { ...randomItem(this.botHand), power: 40 + Math.floor(random * 46) };
      const result = resolvePowerRound(card, botPick, duelId, round);
      this.duel.rounds = [...this.duel.rounds, result];
      this.duel.aWins += result.winner === 'a' ? 1 : 0;
      this.duel.bWins += result.winner === 'b' ? 1 : 0;

      for (const cb of this.roundListeners) cb(result);

      const winner = matchWinner(this.duel.rounds);
      if (winner) {
        this.duel.status = 'finished';
        this.duel.winner = winner;
        this.duel.waitingForOpponent = false;
        for (const cb of this.duelStartedListeners) cb({ ...this.duel });
        return;
      }

      this.duel.round++;
      this.playerPick = null;
      this.playerHand = shuffled(this.playerHand).slice(0, 3);
      this.botHand = shuffled(this.botAlbum).slice(0, 3);
      this.duel.hand = this.playerHand;
      this.duel.opponentHand = this.botHand;
      for (const cb of this.duelStartedListeners) cb({ ...this.duel, opponentHand: [] });
    }, 1000 + Math.floor(Math.random() * 2000));
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
    if (this.duel) cb({ ...this.duel, opponentHand: [] });
    return () => this.duelStartedListeners.delete(cb);
  }

  startPractice(me: PublicRider, playerAlbum: OwnedCard[]): string {
    this.me = me;
    this.trainId = 'practice';
    this.duelId = 'practice-' + Date.now();
    this.playerHand = ownedCardsToDuelCards(playerAlbum).slice(0, 18);
    this.acceptInvite(this.duelId);
    return this.duelId;
  }

  notifyOpponentLeft(): void {
    for (const cb of this.opponentLeftListeners) cb();
  }
}
