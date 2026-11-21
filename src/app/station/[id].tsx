import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cardStory } from '@/api/questie';
import { ArtStamp } from '@/components/ArtStamp';
import { Mascot } from '@/components/Mascot';
import { QuestieBubble } from '@/components/QuestieBubble';
import { StampCard } from '@/components/StampCard';
import { Button, Card, Kicker, Pill, Screen, T } from '@/components/ui';
import { stationById } from '@/data/stations';
import { stopQuestie } from '@/lib/questieVoice';
import { useFeedback } from '@/state/feedback';
import { sortBest, useGame, type OwnedCard } from '@/state/game';
import { useAppTheme } from '@/theme/ThemeContext';

// Station page: the big card on top (tap it → Questie tells its one-line story),
// every card you've pulled here, and the station's artwork stamp.
export default function StationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const { cards, artFound } = useGame();
  const { announce } = useFeedback();
  const s = stationById(id ?? '');
  const mine = cards.filter((k) => k.stationId === id).reverse();
  const [selected, setSelected] = useState<string | null>(null);
  const [story, setStory] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const asking = useRef<string | null>(null);

  useEffect(() => () => stopQuestie(), []);
  if (!s) return null;
  const shown = mine.find((k) => k.uid === selected) ?? sortBest(mine)[0];

  function tell(card: OwnedCard) {
    asking.current = card.uid;
    setStory(undefined);
    setThinking(true);
    cardStory(card)
      .then((t) => {
        if (asking.current !== card.uid) return;
        setStory(t);
        announce({ kind: 'reward', banner: false, text: t });
      })
      .catch(() => setStory('I lost my train of thought — tap the card again!'))
      .finally(() => { if (asking.current === card.uid) setThinking(false); });
  }

  const back = (
    <Pressable accessibilityLabel="Back" onPress={() => router.back()}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
    </Pressable>
  );

  return (
    <Screen title={s.name} right={back}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {shown ? (
          <Pressable onPress={() => tell(shown)} accessibilityRole="button" accessibilityHint="Questie tells this card's story">
            <StampCard stationId={s.id} seed={shown.seed} rarity={shown.rarity} placeCode={shown.placeCode} width={250} />
          </Pressable>
        ) : (
          <Mascot stationId={s.id} size={150} locked frame />
        )}
        {shown && !story && !thinking ? <T size={13} weight="heavy" color={c.muted}>Tap the card to hear its story</T> : null}
        <QuestieBubble text={story} loading={thinking} />
        <T size={28} weight="black">{shown ? s.mascot : 'Not met yet'}</T>
        <Pill label={mine.length ? `${mine.length} ${mine.length === 1 ? 'CARD' : 'CARDS'}` : 'NO CARDS YET'} bg={mine.length ? c.redTint : c.card2} fg={mine.length ? c.redInk : c.muted} style={{ alignSelf: 'center' }} />
      </View>

      {mine.length > 0 && (
        <Card>
          <Kicker>Your cards here</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {mine.map((k) => (
              <Pressable key={k.uid} onPress={() => { setSelected(k.uid); tell(k); }} accessibilityLabel="Show this card and hear its story"
                style={{ borderRadius: 12, borderWidth: 3, borderColor: shown?.uid === k.uid ? c.red : 'transparent' }}>
                <StampCard stationId={s.id} seed={k.seed} rarity={k.rarity} placeCode={k.placeCode} width={96} compact />
              </Pressable>
            ))}
          </View>
          <T size={13} color={c.muted} style={{ marginTop: 10, lineHeight: 18 }}>Every arrival paints a new pose, scene, time of day and weather. {s.mascot} has dozens of looks to find.</T>
        </Card>
      )}

      {s.art && (
        <Card tint={artFound[s.id] ? c.goldTint : undefined} style={{ alignItems: 'center', gap: 12 }}>
          <Kicker color={c.goldInk}>{artFound[s.id] ? 'Artwork stamp' : 'Hidden here'}</Kicker>
          <Pressable onPress={() => artFound[s.id] && router.push({ pathname: '/art/[id]', params: { id: s.id } })} disabled={!artFound[s.id]}>
            <ArtStamp stationId={s.id} width={200} locked={!artFound[s.id]} holeColor={artFound[s.id] ? c.goldTint : c.card} />
          </Pressable>
          {artFound[s.id] ? (
            <Button label="Hear its story" kind="gold" style={{ alignSelf: 'stretch' }} onPress={() => router.push({ pathname: '/art/[id]', params: { id: s.id } })} />
          ) : (
            <Button label="Open the scanner" kind="gold" style={{ alignSelf: 'stretch' }} onPress={() => router.navigate('/scan')} />
          )}
        </Card>
      )}
    </Screen>
  );
}
