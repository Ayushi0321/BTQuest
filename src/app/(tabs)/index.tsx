import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { askGemini } from '@/api/gemini';
import { Mascot } from '@/components/Mascot';
import { PullModal } from '@/components/PullModal';
import { Button, Card, Kicker, Pill, ProgressBar, Screen, T } from '@/components/ui';
import { STATIONS, stationById } from '@/data/stations';
import { useGame, type OwnedCard } from '@/state/game';
import { useAppTheme } from '@/theme/ThemeContext';

// RIDE tab — placeholder data for now.
// TODO (data dev): replace the demo trip with live MBTA vehicle + prediction data.
// TODO (UI dev): replace the stop list with the map + bottom sheet from the design.
const TRIP = ['DAV', 'POR', 'HAR', 'CEN', 'KEN', 'CHA', 'PRK', 'DTX', 'SST'];

export default function Ride() {
  const { c, toggle, isDark } = useAppTheme();
  const [at, setAt] = useState(4); // index of the next stop
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);
  const { pull, artFound } = useGame();
  const [pulled, setPulled] = useState<{ card: OwnedCard; isNew: boolean } | null>(null);

  const nextId = TRIP[Math.min(at, TRIP.length - 1)];
  const next = stationById(nextId)!;
  const done = at >= TRIP.length;

  async function askMascot() {
    setLoading(true);
    try {
      setGreeting(await askGemini(
        `You are ${next.mascot}, the cheerful mascot of ${next.name} station on the Boston Red Line. ` +
        'A rider is arriving. Greet them in 2 short, friendly sentences and mention one thing about the area.'
      ));
    } catch (e) {
      setGreeting('Error: ' + String(e));
    }
    setLoading(false);
  }

  return (
    <Screen
      title="Ride"
      right={
        <Pressable accessibilityLabel="Switch light or dark mode" onPress={toggle}
          style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2.4} strokeLinecap="round">
            {isDark ? <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></> : <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
          </Svg>
        </Pressable>
      }>
      <Card>
        <View style={{ gap: 10 }}>
          <Pill label="RED LINE · LIVE" bg={c.redTint} fg={c.redInk} />
          <T size={22} weight="black">Davis → South Station</T>
          <ProgressBar value={at / TRIP.length} />
          <T size={14} color={c.muted}>{done ? 'Arrived' : `${TRIP.length - at} stops left`}</T>
        </View>
      </Card>

      <Card tint={c.blueTint}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot stationId={nextId} size={72} />
          <View style={{ flex: 1, gap: 2 }}>
            <Kicker color={c.blueInk}>{done ? 'You’ve arrived' : 'Next stop'}</Kicker>
            <T size={22} weight="black">{done ? 'South Station' : next.name}</T>
            <T size={14} color={c.muted}>{next.mascot} is waiting · +10</T>
          </View>
        </View>
        {greeting ? <T size={16} style={{ marginTop: 12, lineHeight: 23 }}>{greeting}</T> : null}
        <Button label={loading ? `Asking ${next.mascot}…` : `Ask ${next.mascot}`} kind="blue" onPress={askMascot} disabled={loading} style={{ marginTop: 12 }} />
      </Card>

      <View>
        {TRIP.map((id, i) => {
          const s = STATIONS.find((x) => x.id === id)!;
          const isNext = i === at;
          const passed = i < at;
          return (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <View style={{ width: isNext ? 22 : 16, height: isNext ? 22 : 16, borderRadius: 11, borderWidth: 4, borderColor: c.red, backgroundColor: passed ? c.red : c.card }} />
              <T size={isNext ? 18 : 16} weight={isNext ? 'black' : 'heavy'} color={passed ? c.muted : c.text} style={{ flex: 1 }}>{s.name}</T>
              {s.art && !passed ? <Pill label="ART HUNT" bg={c.goldTint} fg={c.goldInk} /> : null}
            </View>
          );
        })}
      </View>

      {done ? (
        <Button label="Ride again" kind="plain" onPress={() => { setAt(0); setGreeting(''); }} />
      ) : (
        <Button label={`Demo: arrive at ${next.name}`} onPress={() => { setPulled(pull(next.id)); setAt(at + 1); setGreeting(''); }} />
      )}

      <PullModal
        card={pulled?.card ?? null}
        isNew={pulled?.isNew ?? false}
        canHunt={!!pulled && !!stationById(pulled.card.stationId)?.art && !artFound[pulled.card.stationId]}
        onHunt={() => { setPulled(null); router.navigate('/scan'); }}
        onClose={() => setPulled(null)}
      />
    </Screen>
  );
}
