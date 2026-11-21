import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { askGemini } from '@/api/gemini';
import { QUESTIE_PERSONA } from '@/api/questie';
import { nearbyLine } from '@/data/offline';
import { Mascot } from '@/components/Mascot';
import { PullModal } from '@/components/PullModal';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button, Card, Kicker, Pill, ProgressBar, Screen, T } from '@/components/ui';
import { STATIONS, stationById } from '@/data/stations';
import { useFeedback } from '@/state/feedback';
import { useGame, type OwnedCard } from '@/state/game';
import { useAppTheme } from '@/theme/ThemeContext';

// RIDE tab — demo trip for now.
// TODO (data dev): replace TRIP / `at` with useTrip(from, to) and call `arriveAt(stationId)` from trip.onArrive.
// TODO (UI dev): replace the stop list with the map + bottom sheet from the design.
const TRIP = ['DAV', 'POR', 'HAR', 'CEN', 'KEN', 'CHA', 'PRK', 'DTX', 'SST'];

export default function Ride() {
  const { c, toggle, isDark } = useAppTheme();
  const { settings, announce } = useFeedback();
  const { pull, artFound } = useGame();
  const [at, setAt] = useState(4); // index of the next stop
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulled, setPulled] = useState<{ card: OwnedCard; isNew: boolean } | null>(null);

  const done = at >= TRIP.length;
  const nextId = TRIP[Math.min(at, TRIP.length - 1)];
  const next = stationById(nextId)!;
  const dest = stationById(TRIP[TRIP.length - 1])!;
  const isYourStopNext = at === TRIP.length - 1;

  /** Tell the rider what's coming next, on every channel they switched on. */
  function announceNext(index: number) {
    if (index >= TRIP.length) return;
    const s = stationById(TRIP[index])!;
    if (index === TRIP.length - 1) {
      announce({ kind: 'yourStop', text: `${s.name} — get ready`, speak: `Your stop, ${s.name}, is next. Get ready to get off.`, buzz: 'yourStop' });
    } else {
      announce({ kind: 'next', text: s.name, speak: `Next stop: ${s.name}.`, buzz: 'nextStop' });
    }
  }

  /** Arriving at a station: announce it, then open the stamp pack. */
  function arriveAt(index: number) {
    const s = stationById(TRIP[index])!;
    const isDest = index === TRIP.length - 1;
    announce({
      kind: 'arrive',
      text: isDest ? `${s.name} — this is your stop` : s.name,
      speak: isDest ? `Now arriving at ${s.name}. This is your stop.` : `Now arriving at ${s.name}.`,
      buzz: 'arrived',
    });
    setPulled(pull(s.id));
    setAt(index + 1);
    setGreeting('');
  }

  async function askMascot() {
    setLoading(true);
    try {
      const line = await askGemini(
        `The rider's train is heading into ${next.name} station on the Red Line. In 2 short spoken sentences, tell them one fun thing to see or do near ${next.name}, and remind them ${next.mascot}'s stamp is waiting there.`,
        { system: QUESTIE_PERSONA, search: true, timeoutMs: 15000 }
      );
      setGreeting(line);
      announce({ kind: 'info', banner: false, text: line });
    } catch (e) {
      // Gemini unavailable → hand-written facts about the station
      const line = nearbyLine(next.id);
      setGreeting(line);
      announce({ kind: 'info', banner: false, text: line });
    }
    setLoading(false);
  }

  const themeButton = (
    <Pressable accessibilityLabel="Switch light or dark mode" onPress={toggle}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2.4} strokeLinecap="round">
        {isDark ? <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></> : <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
      </Svg>
    </Pressable>
  );

  const channelPill = (label: string, on: boolean) => (
    <Pill key={label} label={(on ? '✓ ' : '✕ ') + label} bg={on ? c.card : 'transparent'} fg={on ? c.blueInk : c.muted} />
  );

  const arriveButton = done ? (
    <Button label="Ride again" kind="plain" onPress={() => { setAt(0); setGreeting(''); announceNext(0); }} />
  ) : (
    <Button label={`Demo: arrive at ${next.name}`} onPress={() => arriveAt(at)} />
  );

  const modal = (
    <PullModal
      card={pulled?.card ?? null}
      isNew={pulled?.isNew ?? false}
      canHunt={!!pulled && !!stationById(pulled.card.stationId)?.art && !artFound[pulled.card.stationId]}
      onHunt={() => { setPulled(null); router.navigate('/scan'); }}
      onClose={() => { setPulled(null); announceNext(at); }}
    />
  );

  // MOTION COMFORT: one calm, glanceable card. Voice and vibration carry the ride.
  if (settings.comfort) {
    return (
      <Screen title="Ride" right={themeButton}>
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
          <Kicker color={isYourStopNext ? c.redInk : c.muted}>{done ? 'You’ve arrived' : isYourStopNext ? 'Your stop is next' : 'Next stop'}</Kicker>
          <T size={40} weight="black" style={{ textAlign: 'center', lineHeight: 46 }}>{done ? dest.name : next.name}</T>
          <T size={22} weight="heavy" color={c.redInk}>{done ? 'You’re here' : '2 min'}</T>
          <T size={15} color={c.muted} style={{ textAlign: 'center', marginTop: 12, lineHeight: 21, maxWidth: 280 }}>
            Motion comfort is on. Eyes up — we’ll talk and buzz you through the ride.
          </T>
          {!done && <Button label="Hear it again" kind="blue" style={{ marginTop: 14, alignSelf: 'stretch' }} onPress={() => announceNext(at)} />}
        </Card>
        {arriveButton}
        {modal}
      </Screen>
    );
  }

  return (
    <Screen title="Ride" right={themeButton}>
      <Card>
        <View style={{ gap: 10 }}>
          <Pill label="RED LINE · LIVE" bg={c.redTint} fg={c.redInk} />
          <T size={22} weight="black">Davis → {dest.name}</T>
          <ProgressBar value={at / TRIP.length} />
          <T size={14} color={c.muted}>{done ? 'Arrived' : `${TRIP.length - at} stops left`}</T>
        </View>
      </Card>

      {/* the announcement card — what the voice and buzz just told you, plus replay */}
      {!done && (
        <Card tint={isYourStopNext ? c.redTint : c.blueTint}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Kicker color={isYourStopNext ? c.redInk : c.blueInk}>{isYourStopNext ? 'Your stop is next' : 'Next stop'}</Kicker>
              <T size={24} weight="black">{next.name}</T>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {channelPill('Text', settings.text)}
                {channelPill('Voice', settings.voice)}
                {channelPill('Buzz', settings.vibration)}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Replay announcement"
              onPress={() => announceNext(at)}
              style={({ pressed }) => ({
                width: 56, height: 56, borderRadius: 16, backgroundColor: c.blueBtn, alignItems: 'center', justifyContent: 'center',
                borderBottomWidth: pressed ? 1 : 5, borderBottomColor: c.blueDeep, marginTop: pressed ? 4 : 0,
              })}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 9h4l5-4v14l-5-4H4z" /><Path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
              </Svg>
            </Pressable>
          </View>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot stationId={nextId} size={64} />
          <View style={{ flex: 1 }}>
            <T size={17} weight="black">{next.mascot} is waiting · +10</T>
            <T size={13} color={c.muted}>Arrive to open a stamp pack</T>
          </View>
        </View>
        {greeting || loading ? <View style={{ marginTop: 12 }}><QuestieBubble text={greeting} loading={loading} /></View> : null}
        <Button label={loading ? 'Asking Questie…' : `Questie: what’s near ${next.name}?`} kind="plain" onPress={askMascot} disabled={loading} style={{ marginTop: 12 }} />
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
              {i === TRIP.length - 1 ? <Pill label="YOUR STOP" bg={c.redTint} fg={c.redInk} /> : s.art && !passed ? <Pill label="ART HUNT" bg={c.goldTint} fg={c.goldInk} /> : null}
            </View>
          );
        })}
      </View>

      {arriveButton}
      {modal}
    </Screen>
  );
}
