// Duel invitation popup (bottom sheet over a dim screen).
//   mode="incoming": "<name> wants to duel!"  → Duel! / Not now   (20 s, then it expires)
//   mode="outgoing": "Waiting for <name>…"     → Cancel
// Painted VS header with both mascots. Sound + vibration on open; comfort mode = no slide.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { G, Path } from 'react-native-svg';

import { Mascot } from '@/components/Mascot';
import { Questie } from '@/components/Questie';
import { ellipsePts, wobblePath } from '@/lib/paint';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { PaintedButton, PaintedPanel, rngFor, starPts, wash } from './paintKit';
import { useDuelFx } from './sfx';
import { StampLabel, TimerRing } from './widgets';

type Props = {
  visible: boolean;
  mode: 'incoming' | 'outgoing';
  /** the other rider's generated nickname */
  name: string;
  /** the other rider's mascot (station id, e.g. 'KEN'); Questie stands in if unknown */
  theirStationId?: string;
  /** your own mascot; Questie stands in if unknown */
  myStationId?: string;
  /** e.g. "Red Line · same car" */
  where?: string;
  expiresInSec?: number;
  onAccept?: () => void;
  /** incoming: "Not now" · outgoing: "Cancel" */
  onDecline: () => void;
  /** called when the countdown runs out (defaults to onDecline) */
  onExpire?: () => void;
  /** optional text overrides (used by the auto-matchmaker) */
  eyebrow?: string;
  title?: string;
  acceptLabel?: string;
  declineLabel?: string;
};

export function DuelInvite({
  visible, mode, name, theirStationId, myStationId, where = 'Red Line · same train', expiresInSec = 20, onAccept, onDecline, onExpire,
  eyebrow, title, acceptLabel = 'Duel!', declineLabel,
}: Props) {
  const { c } = useAppTheme();
  const { play, haptic, comfort } = useDuelFx();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);
  const [left, setLeft] = useState(expiresInSec);
  const slide = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const closed = useRef(false);

  // open: slide up, sound, buzz, start the countdown
  useEffect(() => {
    if (!visible) { slide.setValue(0); return; }
    closed.current = false;
    setLeft(expiresInSec);
    if (comfort) slide.setValue(1);
    else Animated.timing(slide, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }).start();
    if (mode === 'incoming') { play('whoosh'); haptic('nextStop'); } else { play('select'); }

    const start = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, expiresInSec - (Date.now() - start) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        if (!closed.current) { closed.current = true; (onExpire ?? onDecline)(); }
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, expiresInSec]);

  useEffect(() => {
    if (!visible || comfort) { bob.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [visible, comfort, bob]);

  const act = (fn?: () => void, sfx: 'select' | 'hit' = 'select') => {
    if (closed.current) return;
    closed.current = true;
    play(sfx);
    haptic(sfx === 'select' ? 'success' : 'tap');
    fn?.();
  };

  const headerH = 170;
  const bg = useMemo(() => {
    const rng = rngFor('invite' + W);
    return (
      <G>
        {/* two spotlights */}
        {wash(ellipsePts(W * 0.24, headerH * 0.62, 70, 60, 18), rng, '#FFFFFF', 3, 0.18)}
        {wash(ellipsePts(W * 0.76, headerH * 0.62, 70, 60, 18), rng, '#FFFFFF', 3, 0.18)}
        {/* sparkles */}
        {[[0.08, 0.2], [0.42, 0.14], [0.58, 0.82], [0.93, 0.22], [0.5, 0.3]].map(([x, y], i) => (
          <Path key={i} d={wobblePath(starPts(W * x, headerH * y, i % 2 ? 6 : 8), 0.4, rng)} fill="#F6D36A" opacity={0.9} />
        ))}
        {/* floor */}
        {wash(ellipsePts(W * 0.24, headerH * 0.9, 50, 9, 14), rng, '#1E2A38', 1.5, 0.25)}
        {wash(ellipsePts(W * 0.76, headerH * 0.9, 50, 9, 14), rng, '#1E2A38', 1.5, 0.25)}
      </G>
    );
  }, [W]);

  const fighter = (stationId: string | undefined, flip: boolean) => (
    <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: flip ? [0, -6] : [-6, 0] }) }, { scaleX: flip ? -1 : 1 }] }}>
      {stationId ? <Mascot stationId={stationId} size={104} /> : <Questie size={96} />}
    </Animated.View>
  );

  const incoming = mode === 'incoming';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => act(onDecline, 'hit')} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim, opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={incoming ? undefined : () => act(onDecline, 'hit')} accessibilityLabel="Close" />
      </Animated.View>

      <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: W, backgroundColor: c.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 34, overflow: 'hidden',
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }],
          }}>
          <PaintedPanel width={W} height={headerH} radius={0} sky={incoming ? ['#3F65AE', '#7B6BB0'] : ['#5A6573', '#8A93A8']} background={bg}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: 6 }}>
              {fighter(theirStationId, false)}
              <View style={{ marginBottom: 46 }}><StampLabel text="VS" color="#E6B23A" ink="#1E2A38" size={30} tilt={-8} /></View>
              {fighter(myStationId, true)}
            </View>
          </PaintedPanel>

          <View style={{ paddingHorizontal: 22, paddingTop: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.black, fontSize: 13, letterSpacing: 2, color: c.redInk }}>{eyebrow ?? (incoming ? 'DUEL CHALLENGE' : 'INVITE SENT')}</Text>
                <Text numberOfLines={2} style={{ fontFamily: font.black, fontSize: 26, lineHeight: 30, color: c.text }}>
                  {title ?? (incoming ? `${name} wants to duel!` : `Waiting for ${name}…`)}
                </Text>
                <Text style={{ fontFamily: font.heavy, fontSize: 15, color: c.muted, marginTop: 2 }}>{where}</Text>
              </View>
              <TimerRing left={left} total={expiresInSec} size={58} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {['Best of 3', '6-second mini-games', 'Winner gets a Champion card'].map((t) => (
                <View key={t} style={{ backgroundColor: c.goldTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: font.heavy, fontSize: 13, color: c.goldInk }}>{t}</Text>
                </View>
              ))}
            </View>

            {incoming ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                <PaintedButton label={acceptLabel} width={W - 44} color="#C64B41" deep="#9C3830" ink="#FFFFFF" onPress={() => act(onAccept)} />
                <PaintedButton label={declineLabel ?? 'Not now'} width={W - 44} color={c.card} deep={c.line} ink={c.blueInk} onPress={() => act(onDecline, 'hit')} />
              </View>
            ) : (
              <PaintedButton label={declineLabel ?? 'Cancel invite'} width={W - 44} color={c.card} deep={c.line} ink={c.blueInk} onPress={() => act(onDecline, 'hit')} style={{ marginTop: 4 }} />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
