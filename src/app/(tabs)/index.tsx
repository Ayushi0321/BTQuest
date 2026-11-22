import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { askGemini } from '@/api/gemini';
import { QUESTIE_PERSONA } from '@/api/questie';
import { BottomSheet } from '@/components/BottomSheet';
import { PullModal } from '@/components/PullModal';
import { QuestieBubble } from '@/components/QuestieBubble';
import { RecenterButton, RideMap } from '@/components/RideMap';
import { TripPicker } from '@/components/TripPicker';
import { AskQuestieButton, Button, Card, Kicker, Screen, T } from '@/components/ui';
import { lineById, type LineId } from '@/data/lines';
import { nearbyLine } from '@/data/offline';
import { stationById } from '@/data/stations';
import { useRideDetector } from '@/hooks/useRideDetector';
import { DEMO_MODE, useTrip } from '@/hooks/useTrip';
import { planTrip } from '@/lib/linePlan';
import { clearRideProgress } from '@/lib/rideProgress';
import { useFeedback } from '@/state/feedback';
import { useGame, type OwnedCard } from '@/state/game';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// RIDE tab: full-screen live map + draggable trip sheet.
//   Map:   your trip on the real track, your train, other live trains, mascot bubble.
//   Sheet: line + direction, minutes to next stop, next-stop card with the
//          Text / Voice / Buzz channels, and the stop timeline.
// Announcements go through useFeedback().announce, so they follow the settings on
// the You tab. Arriving at a station opens a stamp pack. EXPO_PUBLIC_DEMO_MODE=1
// drives the same screen with a pretend train.
// A ride starts with a check-in and ends when the train reaches your stop. Check in again to keep collecting.

type Pulled = { card: OwnedCard; isNew: boolean };
type Checkin = { line: LineId; from: string; to: string; at: number };

const CHECKIN_KEY = 'tquest.checkin.v1';
const CHECKIN_TTL_MS = 3 * 60 * 60 * 1000;

const commas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const clock = (d?: Date) => (d ? `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}` : '');


export default function Ride() {
  const [loaded, setLoaded] = useState(false);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [finished, setFinished] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picker, setPicker] = useState<{ key: number; initial?: { line: LineId; from?: string } }>({ key: 0 });
  const { announce } = useFeedback();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { guess, dismiss } = useRideDetector(loaded && (!checkin || finished));

  const openPicker = (initial?: { line: LineId; from?: string }) => {
    setPicker((p) => ({ key: p.key + 1, initial }));
    setPicking(true);
  };

  useEffect(() => {
    if (!guess) return;
    announce({ kind: 'info', text: `Riding the ${lineById(guess.line).name}? Check in to collect.`, speak: `Looks like you're riding the ${lineById(guess.line).name}. Check in to collect cards.`, buzz: 'tap' });
  }, [guess, announce]);

  useEffect(() => {
    AsyncStorage.getItem(CHECKIN_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Checkin) : null;
        const fresh = !!saved && Date.now() - saved.at < CHECKIN_TTL_MS && !('error' in planTrip(saved.line, saved.from, saved.to));
        if (fresh) setCheckin(saved);
        else if (saved) AsyncStorage.removeItem(CHECKIN_KEY).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const checkIn = (line: LineId, from: string, to: string) => {
    const next = { line, from, to, at: Date.now() };
    setCheckin(next);
    setFinished(false);
    setPicking(false);
    clearRideProgress();
    AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(next)).catch(() => {});
  };
  const endRide = useCallback(() => {
    setCheckin(null);
    setFinished(false);
    clearRideProgress();
    AsyncStorage.removeItem(CHECKIN_KEY).catch(() => {});
  }, []);
  const onFinished = useCallback(() => {
    setFinished(true);
    clearRideProgress();
    AsyncStorage.removeItem(CHECKIN_KEY).catch(() => {});
  }, []);

  if (!loaded) return null;
  return (
    <>
      {checkin ? (
        <ActiveRide
          key={`${checkin.line}:${checkin.from}>${checkin.to}:${checkin.at}`}
          checkin={checkin}
          finished={finished}
          onCheckIn={() => openPicker()}
          onEnd={endRide}
          onFinished={onFinished}
        />
      ) : (
        <CheckInPrompt onCheckIn={() => openPicker()} />
      )}
      {guess ? (
        <View style={{ position: 'absolute', top: insets.top + 64, left: 14, right: 14 }}>
          <Card style={{ gap: 10 }}>
            <T size={17} weight="black">Riding the {lineById(guess.line).name}?</T>
            <T size={14} color={c.muted}>Looks like you’re on a train toward {guess.train.headsign ?? lineById(guess.line).toward(guess.train.direction, guess.stationId)}. Check in to collect a card at every stop.</T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Not now" kind="plain" style={{ flex: 1 }} onPress={dismiss} />
              <Button label="Check in" kind="green" style={{ flex: 1 }} onPress={() => { dismiss(); openPicker({ line: guess.line, from: guess.stationId }); }} />
            </View>
          </Card>
        </View>
      ) : null}
      <TripPicker key={picker.key} initial={picker.initial} visible={picking} onClose={() => setPicking(false)} onPick={checkIn} />
    </>
  );
}

function CheckInPrompt({ onCheckIn }: { onCheckIn: () => void }) {
  const { c } = useAppTheme();
  return (
    <Screen title="Ride">
      <View style={{ alignItems: 'center', gap: 16, paddingTop: 40 }}>
        <QuestieBubble text="Where are we riding? Check in at your station and I’ll follow your train. Every stop drops a card." />
        <Button label="Check in" kind="green" style={{ alignSelf: 'stretch' }} onPress={onCheckIn} />
        <T size={14} color={c.muted} style={{ textAlign: 'center' }}>Red Line and Green Line B</T>
      </View>
    </Screen>
  );
}

type ActiveProps = { checkin: Checkin; finished: boolean; onCheckIn: () => void; onEnd: () => void; onFinished: () => void };

function ActiveRide({ checkin, finished, onCheckIn, onEnd, onFinished }: ActiveProps) {
  const { c, toggle, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { settings, setSetting, announce } = useFeedback();
  const [[from, to], setTrip] = useState<[string, string]>(['DAV', 'SST']);
  const tripKey = `${from}>${to}`;
  const [picking, setPicking] = useState(false);
  const trip = useTrip(from, to);
  const { trains } = useRedLineTrains();
  const { alerts } = useRedLineAlerts();
  const { pull, artFound, cards, points } = useGame();

  useEffect(() => {
    if (trip.arrived && !finished) onFinished();
  }, [trip.arrived, finished, onFinished]);

  const [areaH, setAreaH] = useState(0);
  const peek = Math.round(areaH * 0.5);
  const [fitSignal, setFitSignal] = useState(0);

  const nextId = trip.arrived ? undefined : trip.nextStopId;
  const next = nextId ? stationById(nextId) : undefined;
  const isYourStopNext = !!nextId && nextId === to;

  /** Tell the rider what's coming next, on every channel they switched on. */
  const announceNext = useCallback(
    (id: string) => {
      const s = stationById(id);
      if (!s) return;
      if (id === to) {
        announce({ kind: 'yourStop', text: `${s.name}: get ready`, speak: `Your stop, ${s.name}, is next. Get ready to get off.`, buzz: 'yourStop' });
      } else {
        announce({ kind: 'next', text: s.name, speak: `Next stop: ${s.name}.`, buzz: 'nextStop' });
      }
    },
    [announce, to],
  );

  // Announce the first next stop of each trip once.
  const announcedFor = useRef('');
  useEffect(() => {
    if (nextId && announcedFor.current !== tripKey) {
      announcedFor.current = tripKey;
      announceNext(nextId);
    }
  }, [nextId, tripKey, announceNext]);

  // Arrivals: announce, then open a stamp pack. Several can arrive at once
  // (e.g. the app was in the background), so packs queue up one at a time.
  const [queue, setQueue] = useState<Pulled[]>([]);
  const { onArrive } = trip;
  useEffect(
    () =>
      onArrive((stationId) => {
        const s = stationById(stationId);
        if (!s) return;
        const isDest = stationId === to;
        announce({
          kind: 'arrive',
          text: isDest ? `${s.name}: this is your stop` : s.name,
          speak: isDest ? `Now arriving at ${s.name}. This is your stop.` : `Now arriving at ${s.name}.`,
          buzz: 'arrived',
        });
        const result = pull(stationId);
        setQueue((q) => [...q, result]);
      }),
    [onArrive, pull, announce, to],
  );
  const pulled = queue[0] ?? null;

  // Questie: tap the bubble on the map, or the link in the sheet.
  const mascotId = trip.arrived ? to : nextId ?? from;
  const mascot = stationById(mascotId)!;
  const [greeting, setGreeting] = useState<{ id: string; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  async function askMascot() {
    if (asking) return;
    setAsking(true);
    const id = mascotId;
    const st = stationById(id)!;
    let reply: string;
    try {
      reply = await askGemini(
        `The rider's train is heading into ${st.name} station on the ${line.name}. In 2 short spoken sentences, tell them one fun thing to see or do near ${st.name}, and remind them ${st.mascot}'s stamp is waiting there.`,
        { system: QUESTIE_PERSONA, search: true, timeoutMs: 15000 },
      );
    } catch {
      reply = nearbyLine(id);
    }
    setGreeting({ id, text: reply });
    announce({ kind: 'info', banner: false, text: reply });
    setAsking(false);
  }

  const last = trip.stops.length - 1;
  const reachedIdx = last - trip.stopsLeft;
  const minsToNext = trip.secondsToNextStop != null ? Math.max(0, Math.round(trip.secondsToNextStop / 60)) : undefined;
  const bigAlert = alerts.find((a) => a.severity >= 5);

  const overlays = (
    <>
      <PullModal
        card={pulled?.card ?? null}
        isNew={pulled?.isNew ?? false}
        canHunt={!!pulled && !!stationById(pulled.card.stationId)?.art && !artFound[pulled.card.stationId]}
        onHunt={() => { setQueue([]); router.navigate('/scan'); }}
        onClose={() => {
          const rest = queue.slice(1);
          setQueue(rest);
          if (rest.length === 0 && nextId) announceNext(nextId);
        }}
      />
    </>
  );

  const themeIcon = (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2.4} strokeLinecap="round">
      {isDark ? <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
    </Svg>
  );

  // Motion comfort: one calm, glanceable card. Voice and vibration carry the ride.
  if (settings.comfort) {
    return (
      <Screen
        title="Ride"
        right={
          <Pressable accessibilityLabel="Switch light or dark mode" onPress={toggle}
            style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            {themeIcon}
          </Pressable>
        }>
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
          <Kicker color={isYourStopNext ? c.redInk : c.muted}>{trip.arrived ? 'You’ve arrived' : isYourStopNext ? 'Your stop is next' : 'Next stop'}</Kicker>
          <T size={40} weight="black" style={{ textAlign: 'center', lineHeight: 46 }}>{trip.arrived ? stationById(to)?.name : next?.name ?? '-'}</T>
          <T size={22} weight="heavy" color={c.redInk}>{trip.arrived ? 'You’re here' : minsToNext == null ? '' : `${minsToNext} min`}</T>
          <T size={15} color={c.muted} style={{ textAlign: 'center', marginTop: 12, lineHeight: 21, maxWidth: 280 }}>
            Motion comfort is on. Eyes up, we’ll talk and buzz you through the ride.
          </T>
          {nextId ? <Button label="Hear it again" kind="blue" style={{ marginTop: 14, alignSelf: 'stretch' }} onPress={() => announceNext(nextId)} /> : null}
          <Button label={`${stationById(from)?.name} → ${stationById(to)?.name}: change trip`} kind="plain" style={{ marginTop: 8, alignSelf: 'stretch' }} onPress={() => setPicking(true)} />
        </Card>
        {overlays}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
      <RideMap
        line={line}
        stops={trip.stops}
        reachedIdx={reachedIdx}
        nextStopId={nextId}
        riderTrain={trip.train}
        trains={DEMO_MODE ? [] : trains}
        callout={
          trip.arrived
            ? { stationId: to, title: `${mascot.mascot} says hi!`, subtitle: 'You made it · +10', onPress: askMascot }
            : next
              ? { stationId: next.id, title: `${next.mascot} is waiting`, subtitle: `+10 · ${minsToNext != null ? `${minsToNext} min` : 'soon'}`, onPress: askMascot }
              : undefined
        }
        topInset={insets.top}
        bottomInset={peek}
        fitSignal={fitSignal}
        showUserLocation={!DEMO_MODE}
      />

      <View style={{ position: 'absolute', top: insets.top + 8, left: 14, right: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check in for a different trip"
            onPress={onCheckIn}
            style={[pillStyle(c), { flex: 1, gap: 8 }]}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: lc.main }} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.black, fontSize: 16, color: c.text }}>
              {stationById(from)?.name} → {stationById(to)?.name}
            </Text>
          </Pressable>
          <View accessibilityLabel={`${points} points`} style={[pillStyle(c), { gap: 6 }]}>
            <Text style={{ fontSize: 15, color: c.gold }}>★</Text>
            <Text style={{ fontFamily: font.black, fontSize: 16, color: c.goldInk }}>{commas(points)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Switch light or dark mode" onPress={toggle} style={[pillStyle(c), { width: 48, paddingHorizontal: 0, justifyContent: 'center' }]}>
            {themeIcon}
          </Pressable>
        </View>
        {DEMO_MODE ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: c.goldTint, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: font.black, fontSize: 11, letterSpacing: 1, color: c.goldInk }}>DEMO RIDE</Text>
          </View>
        ) : null}
      </View>

      {areaH > 0 ? (
        <>
          <View style={{ position: 'absolute', left: 14, bottom: peek + 14 }}>
            <AskQuestieButton />
          </View>
          <RecenterButton onPress={() => setFitSignal((n) => n + 1)} style={{ position: 'absolute', right: 14, bottom: peek + 14 }} />
          <BottomSheet
            key={areaH}
            peekHeight={peek}
            maxHeight={Math.round(areaH * 0.88)}
            header={
              <View style={{ paddingHorizontal: 18, paddingBottom: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: lc.main, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: font.black, fontSize: 17, color: '#fff' }}>{line.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T size={22} weight="black">{line.name}</T>
                    <T size={14} color={c.muted}>
                      {trip.arrived ? 'You’ve arrived' : `toward ${line.toward(trip.direction, to)} · ${trip.stopsLeft} stops left`}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: font.black, fontSize: 40, lineHeight: 44, color: lc.main }}>
                      {trip.arrived ? '✓' : minsToNext == null ? '-' : minsToNext === 0 ? 'Now' : minsToNext}
                    </Text>
                    <T size={12} color={c.muted}>{trip.arrived ? 'arrived' : minsToNext === 0 ? 'arriving' : 'min to next'}</T>
                  </View>
                </View>
                {trip.error ? <T size={13} color={c.redInk}>{trip.error}</T> : null}
                {trip.notice && !trip.arrived ? <T size={13} color={c.muted}>{trip.notice}</T> : null}
                {trip.arrived ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <T size={14} color={c.muted}>Ride complete. Check in again to keep collecting.</T>
                    <Button label="Check in again" kind="green" onPress={onCheckIn} />
                  </View>
                ) : (
                  <Pressable accessibilityRole="button" onPress={onEnd} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                    <Text style={{ fontFamily: font.black, fontSize: 14, color: c.blueInk }}>End ride</Text>
                  </Pressable>
                )}
              </View>
            }>
            <View style={{ backgroundColor: isYourStopNext ? c.redTint : c.blueTint, borderRadius: 22, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Kicker color={isYourStopNext ? c.redInk : c.blueInk}>{trip.arrived ? 'You’ve arrived' : isYourStopNext ? 'Your stop is next' : 'Next stop'}</Kicker>
                  <T size={26} weight="black">{trip.arrived ? stationById(to)?.name : next?.name ?? '-'}</T>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Replay announcement"
                  onPress={() => nextId && announceNext(nextId)}
                  style={({ pressed }) => ({
                    width: 60, height: 60, borderRadius: 18, backgroundColor: c.blueBtn, alignItems: 'center', justifyContent: 'center',
                    borderBottomWidth: pressed ? 2 : 5, borderBottomColor: c.blueDeep,
                  })}>
                  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M4 9v6h4l5 4V5L8 9H4z" />
                    <Path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
                  </Svg>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['text', 'Text', settings.text], ['voice', 'Voice', settings.voice], ['vibration', 'Buzz', settings.vibration]] as const).map(([key, label, on]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on }}
                    onPress={() => setSetting(key, !on)}
                    style={{ backgroundColor: on ? c.card : 'transparent', borderWidth: 2, borderColor: on ? c.card : c.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ fontFamily: font.black, fontSize: 13, color: on ? c.blueInk : c.muted }}>{(on ? '✓ ' : '✕ ') + label}</Text>
                  </Pressable>
                ))}
              </View>
              {asking || greeting?.id === mascotId ? <QuestieBubble text={greeting?.id === mascotId ? greeting.text : ''} loading={asking} /> : null}
              <Pressable accessibilityRole="button" onPress={askMascot} disabled={asking}>
                <Text style={{ fontFamily: font.black, fontSize: 14, color: c.blueInk }}>
                  {asking ? 'Asking Questie…' : `Questie: what’s near ${mascot.name}? →`}
                </Text>
              </Pressable>
            </View>

            {trainRoom.riders.length > 0 ? (
              <Card style={{ paddingVertical: 8 }}>
                <Kicker>Riders on your train</Kicker>
                {trainRoom.riders.map((rider) => (
                  <View key={rider.riderId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                    <T size={15} weight="black" style={{ flex: 1 }}>{rider.nickname}</T>
                    <Button label="Invite" kind="gold" style={{ minHeight: 44, paddingHorizontal: 14 }} onPress={() => trainRoom.transport.sendInviteTo?.(rider.riderId)} />
                  </View>
                ))}
              </Card>
            ) : null}

            {bigAlert ? (
              <View style={{ backgroundColor: c.goldTint, borderRadius: 18, padding: 14, gap: 4 }}>
                <Kicker color={c.goldInk}>Service alert</Kicker>
                <T size={14}>{bigAlert.header}</T>
              </View>
            ) : null}

            <View>
              {trip.stops.map((id, i) => {
                const s = stationById(id)!;
                const passed = i <= reachedIdx;
                const isNext = id === nextId;
                const stamped = passed && cards.some((card) => card.stationId === id);
                const artToFind = !!s.art && !artFound[id];
                return (
                  <View key={id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
                    <View style={{ width: 28, alignSelf: 'stretch', alignItems: 'center' }}>
                      <View style={{ position: 'absolute', top: i === 0 ? 26 : 0, bottom: i === last ? 26 : 0, width: 5, backgroundColor: passed ? lc.main : lc.main + '66' }} />
                      <View style={{ marginTop: isNext ? 15 : 18, width: isNext ? 22 : 16, height: isNext ? 22 : 16, borderRadius: 11, borderWidth: isNext ? 5 : 4, borderColor: lc.main, backgroundColor: passed ? lc.main : c.card }} />
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, alignSelf: 'stretch', borderBottomWidth: i === last ? 0 : 1, borderBottomColor: c.line }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.black, fontSize: isNext ? 18 : 16, color: passed ? c.muted : c.text }}>{s.name}</Text>
                      {i === last ? <Tag label="Your stop" bg={lc.tint} fg={lc.ink} /> : null}
                      {stamped ? <Tag label="Stamped" bg={lc.tint} fg={lc.ink} /> : null}
                      {artToFind ? <Tag label="Art ★" bg={c.goldTint} fg={c.goldInk} /> : null}
                      <Text style={{ width: 44, textAlign: 'right', fontFamily: font.heavy, fontSize: 14, color: c.muted }}>{clock(trip.stopTimes[id])}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </BottomSheet>
        </>
      ) : null}

      {overlays}
    </View>
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontFamily: font.black, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}

function pillStyle(c: { card: string; line: string }) {
  return {
    flexDirection: 'row' as const, alignItems: 'center' as const, height: 48, paddingHorizontal: 14,
    borderRadius: 16, backgroundColor: c.card, borderWidth: 2, borderColor: c.line, borderBottomWidth: 4,
  };
}
