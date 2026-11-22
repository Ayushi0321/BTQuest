// ☀ Sun — "Stop at noon": the sun swings across the sky over the city.
// Tap when it's in the gold NOON zone. 3 tries; power = average accuracy.

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { densify, ellipsePts, rrectPts, wobblePath, type Pt } from '@/lib/paint';
import { font } from '@/theme/colors';

import { INK, PaintedButton, PaintedPanel, cloud, rngFor, wash } from '../paintKit';
import { clamp, useFrame, type GameProps } from './shared';

const TRIES = 3;
const ZONE = 10; // ± degrees around noon that count as the gold zone

function scoreFor(angle: number) {
  const off = Math.abs(angle - 90);
  return Math.round(100 * Math.pow(clamp(1 - off / 55, 0, 1), 1.25));
}
const verdict = (s: number) => (s >= 90 ? 'PERFECT!' : s >= 70 ? 'Great!' : s >= 40 ? 'Good' : 'Miss');

export function SunGame({ width: w, height: h, seed, running, comfort, onPower, onFinish, play, haptic }: GameProps) {
  const cx = w / 2;
  const cy = h * 0.64;
  const R = Math.min(w * 0.4, h * 0.46);
  const period = comfort ? 2600 : 1600; // ms for one sweep across

  const [angle, setAngle] = useState(180);
  const angleRef = useRef(180);
  const [tries, setTries] = useState<number[]>([]);
  const [pop, setPop] = useState<{ text: string; x: number; y: number; key: number } | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useFrame((_dt, t) => {
    const u = (t % (period * 2)) / period; // 0..2
    const tri = u <= 1 ? u : 2 - u; // 0→1→0
    const eased = 0.5 - 0.5 * Math.cos(tri * Math.PI); // slow at the horizon, fast at noon
    const a = 180 - eased * 180;
    angleRef.current = a;
    setAngle(a);
  }, running && !done.current);

  const pos = (a: number): Pt => [cx + R * Math.cos((a * Math.PI) / 180), cy - R * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = pos(angle);

  const tap = () => {
    if (!running || done.current || tries.length >= TRIES) return;
    const s = scoreFor(angleRef.current);
    const next = [...tries, s];
    setTries(next);
    const total = Math.round(next.reduce((a, b) => a + b, 0) / TRIES);
    onPower(total);
    play(s >= 70 ? 'select' : 'hit');
    haptic(s >= 90 ? 'success' : 'tap');
    setPop({ text: `${verdict(s)} ${s}`, x: sx, y: sy, key: Date.now() });
    popAnim.setValue(0);
    Animated.timing(popAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    if (next.length >= TRIES) {
      done.current = true;
      setTimeout(() => onFinish(total), 600);
    }
  };

  const bg = useMemo(() => {
    const rng = rngFor('sun-bg' + seed + w);
    const arcPts: Pt[] = [];
    for (let a = 180; a >= 0; a -= 6) arcPts.push(pos(a));
    const zone: Pt[] = [];
    for (let a = 90 + ZONE; a >= 90 - ZONE; a -= 2) zone.push(pos(a));
    // skyline
    const buildings: ReactNode[] = [];
    let x = -6;
    let i = 0;
    while (x < w + 6) {
      const bw = 26 + rng() * 34;
      const bh = h * (0.12 + rng() * 0.2);
      const top = h * 0.86 - bh;
      const tone = ['#D9CFBE', '#CFC3AE', '#E3D9C6', '#C9BCA5'][i % 4];
      buildings.push(wash(rrectPts(x, top, bw, bh + h * 0.2, 3, 2), rng, tone, 1.2, 1, `b${i}`));
      for (let wy = top + 8; wy < h * 0.84; wy += 13) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 10) {
          if (rng() < 0.55) buildings.push(<Path key={`w${i}-${wx}-${wy}`} d={wobblePath(rrectPts(wx, wy, 5, 6, 1, 1), 0.4, rng)} fill="#F6E7B8" opacity={0.75} />);
        }
      }
      x += bw - 2;
      i++;
    }
    return (
      <G>
        {cloud(rng, w * 0.22, h * 0.16, 30, '#FFFFFF', 0.8, 'c1')}
        {cloud(rng, w * 0.8, h * 0.1, 24, '#FFFFFF', 0.7, 'c2')}
        {wash(densify([[-10, h * 0.78], [w * 0.3, h * 0.72], [w * 0.7, h * 0.76], [w + 10, h * 0.7], [w + 10, h + 10], [-10, h + 10]], 18), rng, '#BFD8C8', 3, 0.8)}
        {buildings}
        {wash(densify([[-10, h * 0.86], [w + 10, h * 0.85], [w + 10, h + 10], [-10, h + 10]], 18), rng, '#D8CDB6', 2)}
        <Path d={wobblePath(arcPts, 1.2, rng, false)} stroke="#FFFFFF" strokeWidth={4} strokeDasharray="2 11" strokeLinecap="round" fill="none" opacity={0.95} />
        <Path d={wobblePath(zone, 1, rng, false)} stroke="#E6B23A" strokeWidth={26} strokeLinecap="round" fill="none" opacity={0.3} />
        <Path d={wobblePath(zone, 0.8, rng, false)} stroke="#E6B23A" strokeWidth={7} strokeLinecap="round" fill="none" />
      </G>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, seed]);

  const sunArt = useMemo(() => {
    const rng = rngFor('sun-face');
    return (
      <Svg width={92} height={92} viewBox="0 0 92 92">
        {wash(ellipsePts(46, 46, 40, 40, 18), rng, '#FFE59A', 2, 0.45)}
        {Array.from({ length: 10 }, (_, k) => {
          const a = (k * Math.PI) / 5;
          return <Path key={k} d={wobblePath(densify([[46 + 31 * Math.cos(a), 46 + 31 * Math.sin(a)], [46 + 41 * Math.cos(a), 46 + 41 * Math.sin(a)]], 4, false), 0.7, rng, false)} stroke="#E6A92A" strokeWidth={5} strokeLinecap="round" fill="none" />;
        })}
        {wash(ellipsePts(46, 46, 25, 25, 16), rng, '#F5C443', 1.2)}
        <Path d={wobblePath(ellipsePts(46, 46, 25, 25, 16), 1, rng)} stroke="#D89A1E" strokeWidth={2.5} fill="none" />
        <Path d={wobblePath(ellipsePts(38, 38, 7, 4, 8), 0.5, rng)} fill="#FFFFFF" opacity={0.5} />
        <Path d="M37 46a3 3.4 0 1 0 0.1 0z" fill={INK} />
        <Path d="M55 46a3 3.4 0 1 0 0.1 0z" fill={INK} />
        <Path d="M33 53a4 3 0 1 0 0.1 0z" fill="#F4A79F" />
        <Path d="M59 53a4 3 0 1 0 0.1 0z" fill="#F4A79F" />
        <Path d="M40 55q6 6 12 0" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      </Svg>
    );
  }, []);

  const inZone = Math.abs(angle - 90) <= ZONE;
  const tapRef = useRef(tap);
  tapRef.current = tap;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => tapRef.current(),
  }), []);

  return (
    <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Tap when the sun is at noon" onAccessibilityTap={() => tapRef.current()} style={{ width: w, height: h }}>
      <PaintedPanel width={w} height={h} sky={['#97C4EA', '#F3E9D2']} background={bg}>
        <Text pointerEvents="none" style={[styles.noon, { left: cx - 40, top: cy - R - 34, color: inZone ? '#9A7418' : '#B89A55' }]}>NOON</Text>
        <View pointerEvents="none" style={{ position: 'absolute', left: sx - 46, top: sy - 46, transform: [{ scale: inZone ? 1.08 : 1 }] }}>{sunArt}</View>

        {pop && (
          <Animated.Text
            key={pop.key}
            pointerEvents="none"
            style={[styles.pop, {
              left: clamp(pop.x - 70, 4, w - 144), top: pop.y - 70,
              opacity: popAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [{ translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
            }]}>
            {pop.text}
          </Animated.Text>
        )}

        <View pointerEvents="none" style={styles.tries}>
          {Array.from({ length: TRIES }, (_, k) => {
            const s = tries[k];
            const now = k === tries.length;
            return (
              <View key={k} style={[styles.pip, s !== undefined ? { backgroundColor: '#E6B23A' } : now ? { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#E6B23A' } : null]}>
                <Text style={{ fontFamily: font.black, fontSize: 13, color: s !== undefined ? INK : '#7D8590' }}>{s ?? k + 1}</Text>
              </View>
            );
          })}
        </View>

        <View pointerEvents="none" style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' }}>
          <PaintedButton label="TAP!" width={Math.min(220, w * 0.6)} height={56} />
        </View>
      </PaintedPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  noon: { position: 'absolute', width: 80, textAlign: 'center', fontFamily: font.black, fontSize: 13, letterSpacing: 2 },
  pop: { position: 'absolute', width: 140, textAlign: 'center', fontFamily: font.black, fontSize: 22, color: '#1E2A38', textShadowColor: '#FFFFFF', textShadowRadius: 6 },
  tries: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  pip: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
});
