import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { PullModal } from '@/components/PullModal';
import { Button, Card, Kicker, Pill, Screen, T } from '@/components/ui';
import { stationById } from '@/data/stations';
import { parseQr, QR_TARGETS, type QrTarget } from '@/data/places';
import { buzz } from '@/lib/haptics';
import { distanceMeters } from '@/lib/linePlan';
import { useFeedback } from '@/state/feedback';
import { useGame, type OwnedCard } from '@/state/game';
import { useAppTheme } from '@/theme/ThemeContext';

// SCAN tab — point the camera at a printed TQuest QR code → open a pack for that place.
// Live mode checks GPS: the scan only counts near the place, so a photo of the code doesn't work from home.
// Demo mode skips the GPS check and shows a "simulate a scan" button for presenting without printed codes.

const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
// Extra slack for GPS drift; a fix worse than this counts as this.
const MAX_ACCURACY_SLACK = 100;

type Near = { ok: true } | { ok: false; reason: string };

/** Is the rider at the place? Uses a recent fix if there is one, else asks for a fresh one. */
async function checkNear(target: QrTarget): Promise<Near> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: `Turn on location so TQuest can check you’re at ${target.name}.` };
    // A fresh fix can stall indoors (seen on Android), so give up after 10 s instead of spinning forever.
    const fresh = () =>
      Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, fail) => setTimeout(() => fail(new Error('location timeout')), 10_000)),
      ]);
    const pos = (await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 150 })) ?? (await fresh());
    const d = distanceMeters(pos.coords.latitude, pos.coords.longitude, target.lat, target.lng);
    const slack = Math.min(pos.coords.accuracy ?? MAX_ACCURACY_SLACK, MAX_ACCURACY_SLACK);
    if (d <= target.radius + slack) return { ok: true };
    const away = d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
    return { ok: false, reason: `You’re ${away} from ${target.name}. Scan it there to collect it.` };
  } catch {
    return { ok: false, reason: 'Couldn’t find your location. Try again in a moment.' };
  }
}

export default function Scan() {
  const { c } = useAppTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { cards, artFound, pull, findArt } = useGame();
  const { settings, announce } = useFeedback();
  const [result, setResult] = useState<{ card: OwnedCard; isNew: boolean; repeat: boolean; extra?: string } | null>(null);
  const [notice, setNotice] = useState('');
  const busy = useRef(false); // the camera fires many times per second; handle one code at a time

  function award(target: QrTarget) {
    let extra: string | undefined;
    if (target.kind === 'art') {
      if (!artFound[target.stationId]) {
        findArt(target.stationId);
        extra = `Artwork stamp unlocked: ${target.name} · +50`;
      } else {
        extra = `${target.name} already in your artwork stamps`;
      }
    }
    if (settings.vibration) buzz('success');
    const { card, isNew, repeat } = pull(target.stationId, { name: target.name, code: target.code });
    setResult({ card, isNew, repeat, extra });
  }

  function reject(text: string, speak = text) {
    setNotice(text);
    announce({ kind: 'error', text, speak, buzz: 'error', banner: false });
    setTimeout(() => { busy.current = false; setNotice(''); }, 2500);
  }

  async function onScanned({ data }: BarcodeScanningResult) {
    if (busy.current || result) return;
    busy.current = true;
    const target = parseQr(data);
    if (!target) {
      reject('That’s not a TQuest code', 'That’s not a TQuest code. Look for a TQuest sign.');
      return;
    }
    if (!DEMO_MODE) {
      setNotice(`Checking you’re at ${target.name}…`);
      const near = await checkNear(target);
      if (!near.ok) {
        reject(near.reason);
        return;
      }
      setNotice('');
    }
    award(target);
  }

  function close() {
    setResult(null);
    setTimeout(() => { busy.current = false; }, 800); // small pause so the same code isn't read again instantly
  }

  const collected = (t: QrTarget) => cards.some((k) => k.place === t.name);
  const found = QR_TARGETS.filter(collected).length;

  return (
    <Screen title="Scan">
      <View style={{ height: 330, borderRadius: 26, overflow: 'hidden', backgroundColor: '#0E1218', alignItems: 'center', justifyContent: 'center' }}>
        {permission?.granted && focused ? (
          <CameraView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={result ? undefined : onScanned} />
        ) : null}
        {permission && !permission.granted ? (
          <View style={{ padding: 24, gap: 12, alignItems: 'center' }}>
            <T size={17} weight="black" color="#E7ECF2" style={{ textAlign: 'center' }}>TQuest needs your camera to scan QR codes</T>
            <Button label="Allow camera" kind="gold" onPress={requestPermission} />
          </View>
        ) : null}
        {/* gold scan frame */}
        <View pointerEvents="none" style={{ width: 190, height: 190, borderRadius: 22, borderWidth: 5, borderColor: '#E6B23A', opacity: permission?.granted ? 0.9 : 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, backgroundColor: 'rgba(14,18,24,0.7)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 }}>
          <T size={14} weight="heavy" color="#E7ECF2">{notice || 'Point at a TQuest QR code'}</T>
        </View>
      </View>

      <Card tint={c.goldTint}>
        <Kicker color={c.goldInk}>How it works</Kicker>
        <T size={15} style={{ marginTop: 4, lineHeight: 21 }}>Find a TQuest sign at a Boston landmark, scan it, and open a pack with that place’s mascot card. Every scan paints a new card.</T>
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Kicker>Spots to find</Kicker>
        <T size={14} weight="black" color={c.muted}>{found} / {QR_TARGETS.length}</T>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {QR_TARGETS.map((t, i) => {
          const got = collected(t);
          return (
            <View key={t.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === QR_TARGETS.length - 1 ? 0 : 2, borderBottomColor: c.line }}>
              <View style={{ flex: 1 }}>
                <T size={15} weight="black">{t.name}</T>
                <T size={13} color={c.muted}>{t.kind === 'art' ? 'Artwork' : 'Landmark'} · near {stationById(t.stationId)?.name}</T>
              </View>
              <Pill label={got ? 'FOUND ★' : t.kind === 'art' ? '+50' : '+10'} bg={got ? c.goldTint : c.card2} fg={got ? c.goldInk : c.muted} />
            </View>
          );
        })}
      </Card>

      {/* Demo mode only: for presenting without printed codes (or on the web, where there may be no camera). */}
      {DEMO_MODE ? (
        <Button
          label={Platform.OS === 'web' ? 'Demo: simulate a scan' : 'No code nearby? Simulate a scan'}
          kind="plain"
          onPress={() => award(QR_TARGETS[Math.floor(Math.random() * QR_TARGETS.length)])}
        />
      ) : null}

      <PullModal
        card={result?.card ?? null}
        isNew={result?.isNew ?? false}
        repeat={result?.repeat}
        canHunt={false}
        extra={result?.extra}
        onHunt={close}
        onClose={close}
      />
    </Screen>
  );
}
