import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';

import { PullModal } from '@/components/PullModal';
import { Button, Screen } from '@/components/ui';
import { ChargePhase, ClashArena, DuelResult, HandPicker, makeFighter, type ClashResult, type DuelCardView } from '@/duel/ui';
import { BotTransport, ownedCardsToDuelCards } from '@/features/duel/botTransport';
import { getElement, matchWinner } from '@/features/duel/rules';
import { getActiveDuelTransport, setActiveDuelTransport } from '@/features/duel/transportRegistry';
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
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { profile } = useAuth();
  const { cards, pull } = useGame();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const width = Math.max(320, screenWidth - 24);

  const transport = useMemo(() => {
    const active = getActiveDuelTransport();
    if (active) return active;
    const bot = new BotTransport(cards);
    const me = { riderId: 'practice-me', nickname: profile?.username ?? 'Rider', mascotStationId: profile?.fav_station ?? 'KEN' };
    bot.startPractice(me, cards);
    setActiveDuelTransport(bot);
    return bot;
  }, [cards, profile?.fav_station, profile?.username]);

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
  const [oppName, setOppName] = useState('Rider');
  const [reward, setReward] = useState<OwnedCard | null>(null);
  const sentPick = useRef(false);
  const sentCharge = useRef(false);

  useEffect(() => {
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
    transport.sendPick(matchId, round, { ...card, uid: cardView.uid, power: 0 });
    setOpponentReady(matchId.startsWith('practice-'));
    setPhase('charge');
  };

  const onChargeDone = (power: number) => {
    if (!myCard || sentCharge.current) return;
    sentCharge.current = true;
    setMyPower(power);
    transport.sendPick(matchId, round, { ...myCard, uid: myCard.uid ?? `${myCard.stationId}-${myCard.seed}`, power });
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
      if (winnerMatch === 'a') {
        const champion = pull('KEN', { name: 'Red Line Champion', code: 'RED-CHAMPION' }, 'L');
        setReward(champion.card);
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

  const rematch = () => {
    const isBot = matchId.startsWith('practice-');
    if (isBot) {
      const bot = new BotTransport(cards);
      const me = { riderId: 'local', nickname: profile?.username ?? 'Rider', mascotStationId: profile?.fav_station ?? 'KEN' };
      setActiveDuelTransport(bot);
      const nextId = bot.startPractice(me, cards);
      router.replace(`/duel/${nextId}` as never);
    } else {
      router.back();
    }
  };

  const isBot = matchId.startsWith('practice-');
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
            onRematch={rematch}
            rematchLabel={isBot ? 'Rematch vs bot' : 'Rematch'}
            onBack={() => router.back()}
          />
        </View>
        {won && reward ? (
          <PullModal
            card={reward}
            isNew
            canHunt={false}
            extra="Champion Legendary · Red Line"
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
