import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Button, Card, Kicker, ProgressBar, Screen, T } from '@/components/ui';
import { STATIONS } from '@/data/stations';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// REWARDS tab — Stamps (mascot cards), Artwork stamps, Gift card raffle.
// TODO: load the rider's real collection from the backend; replace painted cards with the StampCard component.
const DEMO_MET = ['ALE', 'DAV', 'POR', 'HAR', 'CEN', 'PRK', 'DTX', 'SST'];
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

      {tab === 'stamps' && (
        <>
          <View style={{ gap: 8 }}>
            <T size={18} weight="black">{DEMO_MET.length} / {STATIONS.length} mascots met</T>
            <ProgressBar value={DEMO_MET.length / STATIONS.length} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {STATIONS.map((s) => {
              const met = DEMO_MET.includes(s.id);
              return (
                <View key={s.id} style={{ width: '31%', alignItems: 'center', gap: 4, backgroundColor: c.card, borderRadius: 18, borderWidth: 2, borderColor: c.line, paddingVertical: 10 }}>
                  <Mascot stationId={s.id} size={72} frame locked={!met} />
                  <T size={14} weight="black">{met ? s.mascot : '???'}</T>
                  <T size={11} color={c.muted} style={{ textAlign: 'center' }}>{s.name}</T>
                </View>
              );
            })}
          </View>
        </>
      )}

      {tab === 'art' && (
        <>
          <T size={15} color={c.muted}>Scan the QR code on an Arts on the T piece to get a stamp designed from that artwork.</T>
          {STATIONS.filter((s) => s.art).map((s) => (
            <Card key={s.id}>
              <Kicker color={c.goldInk}>{s.name}</Kicker>
              <T size={19} weight="black">{s.art!.title}</T>
              <T size={14} color={c.muted}>by {s.art!.artist}</T>
            </Card>
          ))}
        </>
      )}

      {tab === 'raffle' && (
        <Card tint={c.goldTint}>
          <View style={{ gap: 8 }}>
            <Kicker color={c.goldInk}>November gift card raffle</Kicker>
            <T size={22} weight="black">[Partner] gift cards</T>
            <T size={14} color={c.goldInk}>Every 100 points this month = 1 ticket</T>
            <ProgressBar value={0.6} color={c.gold} />
            <T size={15} weight="black">6 tickets · 60 / 100 pts to the next</T>
          </View>
          <Button label="How tickets work" kind="plain" style={{ marginTop: 12 }} />
        </Card>
      )}
    </Screen>
  );
}
