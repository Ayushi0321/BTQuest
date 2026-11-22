import type { DuelCard, DuelState, PublicRider, RoundResult } from './types';

export interface DuelTransport {
  joinTrainRoom(trainId: string, me: PublicRider): void;
  leaveTrainRoom(): void;
  onRidersChanged(cb: (riders: PublicRider[]) => void): () => void;
  sendInvite(): void;
  onInvite(cb: (from: PublicRider, duelId: string) => void): () => void;
  acceptInvite(duelId: string): void;
  declineInvite(duelId: string): void;
  sendPick(duelId: string, round: number, card: DuelCard): void;
  onRoundResolved(cb: (r: RoundResult) => void): () => void;
  onOpponentLeft(cb: () => void): () => void;
  onDuelStarted(cb: (state: DuelState) => void): () => void;
  sendInviteTo?(riderId: string): void;
}
