import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Mascot } from '@/components/Mascot';
import { StampCard } from '@/components/StampCard';
import { Button, Card, Kicker, Pill, Screen, T } from '@/components/ui';
import { stationById } from '@/data/stations';
import { sortBest, useGame } from '@/state/game';
import { useAppTheme } from '@/theme/ThemeContext';

// Station page: the big card on top, every card you've pulled here below.
export default function StationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const { cards, artFound } = useGame();
  const s = stationById(id ?? '');
  const mine = cards.filter((k) => k.stationId === id).reverse();
  const [selected, setSelected] = useState<string | null>(null);
  if (!s) return null;
  const shown = mine.find((k) => k.uid === selected) ?? sortBest(mine)[0];

  const back = (
    <Pressable accessibilityLabel="Back" onPress={() => router.back()}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
    </Pressable>
  );

  return (
    <Screen title={s.name} right={back}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {shown ? <StampCard stationId={s.id} seed={shown.seed} rarity={shown.rarity} width={250} /> : <Mascot stationId={s.id} size={150} locked frame />}
        <T size={28} weight="black">{shown ? s.mascot : 'Not met yet'}</T>
        <Pill label={mine.length ? `${mine.length} ${mine.length === 1 ? 'CARD' : 'CARDS'}` : 'NO CARDS YET'} bg={mine.length ? c.redTint : c.card2} fg={mine.length ? c.redInk : c.muted} style={{ alignSelf: 'center' }} />
      </View>

      {mine.length > 0 && (
        <Card>
          <Kicker>Your cards here</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {mine.map((k) => (
              <Pressable key={k.uid} onPress={() => setSelected(k.uid)} accessibilityLabel="Show this card"
                style={{ borderRadius: 12, borderWidth: 3, borderColor: shown?.uid === k.uid ? c.red : 'transparent' }}>
                <StampCard stationId={s.id} seed={k.seed} rarity={k.rarity} width={96} compact />
              </Pressable>
            ))}
          </View>
          <T size={13} color={c.muted} style={{ marginTop: 10, lineHeight: 18 }}>Every arrival paints a new pose, scene, time of day and weather. {s.mascot} has dozens of looks to find.</T>
        </Card>
      )}

      {s.art && (
        <Card tint={artFound[s.id] ? c.goldTint : undefined}>
          <Kicker color={c.goldInk}>{artFound[s.id] ? 'Artwork stamp · station story' : 'Hidden here'}</Kicker>
          <T size={19} weight="black">{artFound[s.id] ? s.art.title : 'An Arts on the T piece'}</T>
          {artFound[s.id] ? (
            <>
              <T size={14} color={c.muted}>by {s.art.artist}</T>
              <T size={16} style={{ marginTop: 6, lineHeight: 23 }}>{s.art.story}</T>
            </>
          ) : (
            <>
              <T size={14} color={c.muted}>Find it and scan its QR code for an artwork stamp · +50</T>
              <Button label="Open the scanner" kind="gold" style={{ marginTop: 12 }} onPress={() => router.navigate('/scan')} />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
