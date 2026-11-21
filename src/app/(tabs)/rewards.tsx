import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { StampCard, type Rarity } from '@/components/StampCard';
import { Button, Card, Kicker, ProgressBar, Screen, T } from '@/components/ui';
import { STATIONS } from '@/data/stations';
import { sortBest, useGame } from '@/state/game';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// REWARDS tab — Stamps (painted card album), Artwork stamps, Gift card raffle.
type Tab = 'stamps' | 'art' | 'raffle';

export default function Rewards() {
  const { c } = useAppTheme();
  const [tab, setTab] = useState<Tab>('stamps');

  return (
    <Screen title="Rewards">
      <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: 16, padding: 4, gap: 4 }}>
        {(['stamps', 'art', 'raffle'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? c.card : 'transparent' }}>
            <Text style={{ fontFamily: font.black, fontSize: 15, color: tab === t ? c.text : c.muted }}>
              {t === 'stamps' ? 'Stamps' : t === 'art' ? 'Artwork' : 'Raffle'}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'stamps' && <Album />}
      {tab === 'art' && <Artwork />}
      {tab === 'raffle' && <Raffle />}
    </Screen>
  );
}

function Album() {
  const { c } = useAppTheme();
  const { cards } = useGame();
  const { width } = useWindowDimensions();
  const cardW = Math.floor((Math.min(width, 520) - 36 - 12) / 2);

  const counts: Record<Rarity, number> = { C: 0, R: 0, E: 0, L: 0 };
  cards.forEach((k) => counts[k.rarity]++);
  const met = new Set(cards.map((k) => k.stationId)).size;

  const stat = (r: Rarity, label: string, bg: string, fg: string) => (
    <View key={r} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: bg }}>
      <Text style={{ fontFamily: font.black, fontSize: 18, color: fg }}>{counts[r]}</Text>
      <Text style={{ fontFamily: font.black, fontSize: 10, letterSpacing: 0.6, color: fg }}>{label}</Text>
    </View>
  );

  return (
    <>
      <Card tint={c.orangeTint}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ transform: [{ rotate: '-6deg' }] }}><StampCard stationId="PRK" seed={41} rarity="R" width={78} compact /></View>
            <View style={{ marginLeft: -22, transform: [{ rotate: '5deg' }] }}><StampCard stationId="SST" seed={12} rarity="E" width={78} compact /></View>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Kicker color={c.orangeInk}>Harvest week banner</Kicker>
            <T size={17} weight="black">Autumn scenes are boosted all week</T>
            <T size={13} color={c.orangeInk}>Thanksgiving limited cards drop Thu Nov 26</T>
          </View>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T size={18} weight="black">{cards.length} cards collected</T>
          <T size={14} weight="black" color={c.muted}>{met} / {STATIONS.length} mascots</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stat('C', 'COMMON', c.card2, c.text)}
          {stat('R', 'RARE', c.blueTint, c.blueInk)}
          {stat('E', 'EPIC', c.purpleTint, c.purple)}
          {stat('L', 'LEGEND', c.goldTint, c.goldInk)}
        </View>
        <T size={12} color={c.muted} style={{ lineHeight: 17 }}>
          Pull rates: Common 70% · Rare 22% · Epic 7% · Legendary 1%. You pull one card each time you arrive at a station. No paid pulls, ever.
        </T>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 16 }}>
        {STATIONS.map((s) => {
          const mine = cards.filter((k) => k.stationId === s.id);
          const best = sortBest(mine)[0];
          const open = () => router.push({ pathname: '/station/[id]', params: { id: s.id } });
          if (!best) {
            return (
              <Pressable key={s.id} onPress={open} accessibilityLabel={`${s.name}, no cards yet`}
                style={{ width: cardW, height: Math.round(cardW * 1.4), borderRadius: 14, borderWidth: 3, borderStyle: 'dashed', borderColor: c.track, backgroundColor: c.card2, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}>
                <Mascot stationId={s.id} size={76} locked />
                <T size={14} weight="black">{s.name}</T>
                <T size={12} weight="heavy" color={c.muted}>Ride here to pull</T>
              </Pressable>
            );
          }
          return (
            <Pressable key={s.id} onPress={open} accessibilityLabel={`${s.mascot}, ${mine.length} cards`} style={{ width: cardW, alignItems: 'center', gap: 4 }}>
              <StampCard stationId={s.id} seed={best.seed} rarity={best.rarity} placeCode={best.placeCode} width={cardW} />
              <T size={12} weight="heavy" color={c.muted}>{s.mascot} · {s.name} · ×{mine.length}</T>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Artwork() {
  const { c } = useAppTheme();
  const { artFound } = useGame();
  return (
    <>
      <T size={15} color={c.muted} style={{ lineHeight: 21 }}>Scan the QR code on an Arts on the T piece to get a stamp designed from that artwork, plus its story.</T>
      {STATIONS.filter((s) => s.art).map((s) => (
        <Card key={s.id} tint={artFound[s.id] ? c.goldTint : undefined}>
          <Kicker color={c.goldInk}>{s.name}</Kicker>
          <T size={19} weight="black">{artFound[s.id] ? s.art!.title : 'Hidden artwork'}</T>
          <T size={14} color={c.muted}>{artFound[s.id] ? `by ${s.art!.artist} · found ★` : 'Hunt it to reveal · +50'}</T>
        </Card>
      ))}
      <Button label="Open the scanner" kind="gold" onPress={() => router.navigate('/scan')} />
    </>
  );
}

function Raffle() {
  const { c } = useAppTheme();
  const { points } = useGame();
  const monthPts = points - 640; // demo: points earned this month
  const tickets = Math.floor(monthPts / 100);
  const into = monthPts % 100;
  return (
    <Card tint={c.goldTint}>
      <View style={{ gap: 8 }}>
        <Kicker color={c.goldInk}>November gift card raffle</Kicker>
        <T size={22} weight="black">[Partner] gift cards</T>
        <T size={14} color={c.goldInk}>Every 100 points this month = 1 ticket · drawn Nov 30</T>
        <ProgressBar value={into / 100} color={c.gold} />
        <T size={15} weight="black">{tickets} tickets · {into} / 100 pts to the next</T>
      </View>
    </Card>
  );
}
