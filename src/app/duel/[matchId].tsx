import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';

import { PullModal } from '@/components/PullModal';
import { Screen } from '@/components/ui';
import { LINES } from '@/data/lines';
import { finishCurrentMatch } from '@/duel/match';
import { SupabaseDuelTransport } from '@/duel/supabaseTransport';
import { ChargePhase, ClashArena, DuelResult, HandPicker, makeFighter, type ClashResult, type DuelCardView } from '@/duel/ui';
import { BotTransport, ownedCardsToDuelCards } from '@/features/duel/botTransport';
import { getElement, matchWinner } from '@/features/duel/rules';
import type { DuelCard, RoundResult } from '@/features/duel/types';
import { useAuth } from '@/state/auth';
import { useGame, type OwnedCard } from '@/state/game';

const FALLBACK_CARDS: OwnedCard[] = [
  { uid: 'duel-demo-1', stationId: 'KEN', seed: 131, rarity: 'C' },
  { uid: 'duel-demo-2', stationId: 'SST', seed: 224, rarity: 'R' },
  { uid: 'duel-demo-3', stationId: 'PRK', seed: 377, rarity: 'E' },
];

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dealHand(cards: DuelCard[]): DuelCard[] {
  const source = cards.length >= 3 ? cards : ownedCardsToDuelCards([...cards, ...FALLBACK_CARDS].map((card) => ({
    uid: card.uid ?? `${card.stationId}-${card.seed}`,
    stationId: card.stationId,
    seed: card.seed,
    rarity: card.rarity,
  })));
  const shuffled = shuffle(source);
  const byElement = new Map<DuelCard['element'], DuelCard>();
  for (const card of shuffled) {
    const element = getElement(card);
    if (!byElement.has(element)) byElement.set(element, card);
  }
  if (byElement.size >= 3) return [...byElement.values()].slice(0, 3);
  const result = [...byElement.values()];
  for (const card of shuffled) {
    if (result.length >= 3) break;
    if (!result.includes(card)) result.push(card);
  }
  if (result.length < 3) {
    for (const card of shuffled) if (!result.includes(card)) result.push(card);
  }
  if (new Set(result.slice(0, 3).map(getElement)).size < 2) {
    const first = result[0];
    const different = shuffled.find((card) => getElement(card) !== getElement(first));
    if (different) result[2] = different;
  }
  return result.slice(0, 3);
}

function toCardView(card: DuelCard): DuelCardView {
  return {
    uid: card.uid ?? `${card.stationId}-${card.seed}`,
    stationId: card.stationId,
    seed: card.seed,
    rarity: card.rarity,
    placeCode: card.placeCode,
    element: getElement(card),
  };
}

export default function DuelMatch() {
  // Opened only by matchmaking on the Ride tab. bot: '1' = bot rider (no free rider on the line), '0' = real rider.
  // line is the route id the match was made on ('Red', 'Green-B').
  const params = useLocalSearchParams<{ matchId: string; bot?: string; opponent?: string; mascot?: string; line?: string }>();
  const { matchId } = params;
  // Winning earns that line's Champion card.
  const champion = LINES.find((l) => l.id === params.line)?.champion;
  const { profile } = useAuth();
  const { cards, pull } = useGame();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const width = Math.max(320, screenWidth - 24);

  // Picked once per screen. duelId is what the transport knows the duel by (the bot makes its own id).
  const [{ transport, duelId }] = useState(() => {
    if (params.bot === '0') {
      return { transport: new SupabaseDuelTransport(`rider-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`), duelId: matchId };
    }
    const me = { riderId: 'me', nickname: profile?.username ?? 'Rider', mascotStationId: profile?.fav_station ?? 'KEN' };
    const opponent = { riderId: 'bot-rider', nickname: params.opponent ?? 'Rider', mascotStationId: params.mascot ?? 'KEN' };
    const bot = new BotTransport(cards);
    return { transport: bot, duelId: bot.startPractice(me, cards, opponent) };
  });
  const isBot = transport instanceof BotTransport;

  // Real match: join the duel channel the server's matchId points both phones to.
  useEffect(() => {
    if (!(transport instanceof SupabaseDuelTransport)) return;
    transport.joinMatch(matchId, { riderId: 'me', nickname: profile?.username ?? 'Rider', mascotStationId: profile?.fav_station ?? 'KEN' });
    return () => transport.leaveTrainRoom();
    // Join once per screen; profile changes don't matter mid-duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, matchId]);

  const [round, setRound] = useState(1);
  const [hand, setHand] = useState<DuelCard[]>([]);
  const [myCard, setMyCard] = useState<DuelCard | null>(null);
  const [oppCard, setOppCard] = useState<DuelCard | null>(null);
  const [myPower, setMyPower] = useState(0);
  const [oppPower, setOppPower] = useState(0);
  const [opponentReady, setOpponentReady] = useState(false);
  const [phase, setPhase] = useState<'pick' | 'charge' | 'clash' | 'end'>('pick');
  const [pending, setPending] = useState<RoundResult | null>(null);
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [oppName, setOppName] = useState(params.opponent ?? 'Rider');
  const [reward, setReward] = useState<{ card: OwnedCard; repeat: boolean } | null>(null);
  const sentPick = useRef(false);
  const sentCharge = useRef(false);

  // Tell the matchmaker the duel is over (win, lose, opponent left, or closed early). Once.
  const finished = useRef(false);
  const finishMatch = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    void finishCurrentMatch();
  }, []);
  useEffect(() => {
    if (phase === 'end') finishMatch();
  }, [phase, finishMatch]);
  useEffect(() => finishMatch, [finishMatch]);

  // Deal once per round. `cards` gets a new identity on every sync or background pull,
  // which used to reshuffle the hand while the rider was picking.
  const dealtRound = useRef(0);
  useEffect(() => {
    if (dealtRound.current === round) return;
    dealtRound.current = round;
    const source = cards.length >= 3 ? cards : [...cards, ...FALLBACK_CARDS];
    setHand(dealHand(ownedCardsToDuelCards(source)));
  }, [cards, round]);

  useEffect(() => {
    const started = transport.onDuelStarted((state) => setOppName(state.opponent.nickname));
    const resolved = transport.onRoundResolved((result) => {
      setPending(result);
      setOppPower(result.b.power ?? result.a.power ?? 0);
      setPhase('clash');
    });
    const left = transport.onOpponentLeft(() => setPhase('end'));
    return () => { started(); resolved(); left(); };
  }, [transport]);

  const onPlay = (cardView: DuelCardView) => {
    if (sentPick.current) return;
    sentPick.current = true;
    const card = hand.find((item) => (item.uid ?? `${item.stationId}-${item.seed}`) === cardView.uid) ?? {
      uid: cardView.uid,
      stationId: cardView.stationId,
      seed: cardView.seed,
      rarity: cardView.rarity,
      placeCode: cardView.placeCode,
      element: cardView.element,
    };
    setMyCard(card);
    transport.sendPick(duelId, round, { ...card, uid: cardView.uid, power: 0 });
    setOpponentReady(isBot);
    setPhase('charge');
  };

  const onChargeDone = (power: number) => {
    if (!myCard || sentCharge.current) return;
    sentCharge.current = true;
    setMyPower(power);
    transport.sendPick(duelId, round, { ...myCard, uid: myCard.uid ?? `${myCard.stationId}-${myCard.seed}`, power });
  };

  useEffect(() => {
    if (phase !== 'clash' || !pending || !myCard) return;
    const resultCardA = pending.a;
    const resultCardB = pending.b;
    const iAmA = (myCard.uid ?? `${myCard.stationId}-${myCard.seed}`) === (resultCardA.uid ?? `${resultCardA.stationId}-${resultCardA.seed}`);
    const resolvedOppCard = iAmA ? resultCardB : resultCardA;
    setOppCard(resolvedOppCard);
    setOppPower(iAmA ? (pending.bPower ?? resultCardB.power ?? 0) : (pending.aPower ?? resultCardA.power ?? 0));
  }, [phase, pending, myCard]);

  const onClashDone = (result: ClashResult) => {
    if (!pending) return;
    const winner = result === 'tie' ? 'draw' : result === 'you' ? 'a' : 'b';
    const completed: RoundResult = {
      ...pending,
      winner,
      round,
    };
    const nextRounds = [...rounds, completed];
    setRounds(nextRounds);

    const winnerMatch = matchWinner(nextRounds);
    if (winnerMatch) {
      if (winnerMatch === 'a' && champion) {
        const won = pull(champion.stationId, { name: champion.name, code: champion.code }, 'L');
        setReward(won);
      }
      setPhase('end');
      return;
    }

    setRound((value) => value + 1);
    setPending(null);
    setMyCard(null);
    setOppCard(null);
    setMyPower(0);
    setOppPower(0);
    setOpponentReady(false);
    sentPick.current = false;
    sentCharge.current = false;
    setPhase('pick');
  };

  const aWins = rounds.filter((item) => item.winner === 'a').length;
  const bWins = rounds.filter((item) => item.winner === 'b').length;
  const finalWinner = matchWinner(rounds);
  const cardViewHand = hand.map(toCardView);

  if (phase === 'end') {
    const won = finalWinner === 'a';
    const winningCard = won
      ? (myCard ? toCardView(myCard) : undefined)
      : (oppCard ? toCardView(oppCard) : undefined);
    return (
      <Screen title="Duel complete" scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <DuelResult
            won={won}
            you={aWins}
            opp={bWins}
            oppName={oppName}
            winningCard={winningCard}
            width={width}
            onBack={() => router.back()}
          />
        </View>
        {won && reward && champion ? (
          <PullModal
            card={reward.card}
            isNew
            repeat={reward.repeat}
            canHunt={false}
            extra={`Champion Legendary · ${champion.name.replace(' Champion', '')}`}
            onHunt={() => setReward(null)}
            onClose={() => setReward(null)}
          />
        ) : null}
      </Screen>
    );
  }

  if (phase === 'pick') {
    if (hand.length !== 3) {
      return (
        <Screen title={`Round ${round}`} scroll={false}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
        </Screen>
      );
    }
    const handKey = `round-${round}-${hand.map((card) => card.uid ?? `${card.stationId}-${card.seed}`).join('-')}`;
    return (
      <Screen title={`Round ${round}`} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <HandPicker
            key={handKey}
            hand={cardViewHand}
            opponentName={oppName}
            opponentReady={opponentReady}
            width={width}
            height={screenHeight - 120}
            onPlay={onPlay}
          />
        </View>
      </Screen>
    );
  }

  if (phase === 'charge' && myCard) {
    return (
      <Screen title={`Round ${round}`} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ChargePhase
            card={toCardView(myCard)}
            opponentName={oppName}
            opponentDone={opponentReady}
            width={width}
            height={screenHeight - 120}
            durationSec={6}
            onDone={onChargeDone}
          />
        </View>
      </Screen>
    );
  }

  if (phase === 'clash' && pending && myCard) {
    const resultCardA = pending.a;
    const resultCardB = pending.b;
    const iAmA = (myCard.uid ?? `${myCard.stationId}-${myCard.seed}`) === (resultCardA.uid ?? `${resultCardA.stationId}-${resultCardA.seed}`);
    const myResolvedCard = iAmA ? resultCardA : resultCardB;
    const oppResolvedCard = iAmA ? resultCardB : resultCardA;
    const myResolvedPower = iAmA ? (pending.aPower ?? resultCardA.power ?? myPower) : (pending.bPower ?? resultCardB.power ?? myPower);
    const oppResolvedPower = iAmA ? (pending.bPower ?? resultCardB.power ?? oppPower) : (pending.aPower ?? resultCardA.power ?? oppPower);
    return (
      <Screen title={`Round ${round}`} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ClashArena
            you={makeFighter('You', toCardView(myResolvedCard), myResolvedPower, toCardView(oppResolvedCard))}
            opp={makeFighter(oppName, toCardView(oppResolvedCard), oppResolvedPower, toCardView(myResolvedCard))}
            width={width}
            arenaHeight={Math.round(screenHeight * 0.62)}
            onDone={onClashDone}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={`Round ${round}`} scroll={false}>
      <View style={{ flex: 1 }} />
    </Screen>
  );
}
