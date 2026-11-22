// ⚡ Storm — "Connect the dots": 6 numbered dots make a lightning bolt.
// Drag (or tap) through them in order. Fast + no wrong dots = more power. Finishing early strikes the bolt.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { densify, ellipsePts, rrectPts, strokePath as strokeLine, wobblePath, type Pt } from '@/lib/paint';
import { font } from '@/theme/colors';

import { INK, PaintedPanel, cloud, rngFor, wash } from '../paintKit';
import { clamp, type GameProps } from './shared';

const LAYOUT: Pt[] = [[0.64, 0.11], [0.34, 0.36], [0.6, 0.41], [0.28, 0.66], [0.56, 0.63], [0.38, 0.9]];
const HIT = 36;
const DOT = 25;

export function StormGame({ width: w, height: h, seed, running, comfort, onPower, onFinish, play, haptic }: GameProps) {
  const dots = useMemo(() => LAYOUT.map(([fx, fy]) => [fx * w, fy * h] as Pt), [w, h]);
  const [count, setCount] = useState(0); // dots connected so far
  const [finger, setFinger] = useState<Pt | null>(null);
  const [wrongDot, setWrongDot] = useState<number | null>(null);
  const [struck, setStruck] = useState(false);
  const st = useRef({ count: 0, wrong: 0, lastWrong: -1, start: 0, done: false });
  const pulse = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (running && !st.current.start) st.current.start = Date.now();
  }, [running]);

  useEffect(() => {
    if (comfort) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [comfort, pulse]);

  const livePower = (connected: number, wrong: number) => clamp(Math.round((connected / 6) * 70 - wrong * 10), 0, 100);

  const touch = (x: number, y: number) => {
    const s = st.current;
    if (!running || s.done) return;
    setFinger([x, y]);
    const hit = dots.findIndex(([dx, dy]) => Math.hypot(dx - x, dy - y) < HIT);
    if (hit < 0) { s.lastWrong = -1; return; }
    if (hit === s.count) {
      s.count += 1;
      s.lastWrong = -1;
      setCount(s.count);
      play('select');
      haptic('tap');
      if (s.count === dots.length) {
        s.done = true;
        const secs = (Date.now() - s.start) / 1000;
        const power = clamp(Math.round(100 - s.wrong * 10 - Math.max(0, secs - 2.2) * 12), 20, 100);
        onPower(power);
        setFinger(null);
        setStruck(true);
        play('storm');
        haptic('success');
        if (!comfort) {
          Animated.sequence([
            Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(flash, { toValue: 0.2, duration: 90, useNativeDriver: true }),
            Animated.timing(flash, { toValue: 0.8, duration: 60, useNativeDriver: true }),
            Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start();
        }
        setTimeout(() => onFinish(power), 700);
      } else {
        onPower(livePower(s.count, s.wrong));
      }
    } else if (hit > s.count && hit !== s.lastWrong) {
      s.lastWrong = hit;
      s.wrong += 1;
      setWrongDot(hit);
      setTimeout(() => setWrongDot((d) => (d === hit ? null : d)), 350);
      play('hit');
      haptic('tap');
      onPower(livePower(s.count, s.wrong));
    }
  };

  const at = (e: GestureResponderEvent) => touch(e.nativeEvent.locationX, e.nativeEvent.locationY);
  const pan = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: at,
      onPanResponderMove: at,
      onPanResponderRelease: () => setFinger(null),
      onPanResponderTerminate: () => setFinger(null),
    }),
    // `touch` reads everything through refs/state setters; rebuild when the game starts or resizes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [running, dots],
  );

  const bg = useMemo(() => {
    const rng = rngFor('storm-bg' + seed + w);
    const rain = Array.from({ length: 26 }, (_, i) => {
      const x = rng() * w;
      const y = rng() * h;
      return <Path key={i} d={strokeLine(rng, x, y, x - 7, y + 18, 0.6)} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" fill="none" />;
    });
    const city: ReactNode[] = [];
    let x = -6;
    for (let i = 0; x < w + 6; i++) {
      const bw = 24 + rng() * 30;
      const bh = h * (0.08 + rng() * 0.12);
      city.push(wash(rrectPts(x, h - bh, bw, bh + 10, 3, 2), rng, '#22304A', 1, 0.75, `k${i}`));
      x += bw - 2;
    }
    return (
      <G>
        {cloud(rng, w * 0.2, 12, 46, '#5C6E8E', 0.75, 'a')}
        {cloud(rng, w * 0.72, 4, 58, '#56688A', 0.75, 'b')}
        {cloud(rng, w * 0.5, 30, 34, '#6E80A0', 0.5, 'c')}
        {rain}
        {city}
        <Path d={wobblePath(dots, 0.8, rng, false)} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={5} strokeDasharray="3 10" strokeLinecap="round" fill="none" />
      </G>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, seed]);

  const boltShape = useMemo(() => {
    // a fat bolt around the dot path, drawn when the player finishes
    const left = dots.map(([x, y]) => [x - 14, y] as Pt);
    const right = dots.map(([x, y]) => [x + 14, y] as Pt).reverse();
    return wobblePath(densify([...left, ...right], 18), 2, rngFor('bolt' + w));
  }, [dots, w]);

  const lineArt = useMemo(() => {
    const rng = rngFor('lines' + count);
    const segs = [];
    for (let i = 0; i < count - 1; i++) {
      const [x1, y1] = dots[i];
      const [x2, y2] = dots[i + 1];
      segs.push(
        <G key={i}>
          <Path d={strokeLine(rng, x1, y1, x2, y2, 1.2)} stroke="#F6D36A" strokeOpacity={0.3} strokeWidth={24} strokeLinecap="round" fill="none" />
          <Path d={strokeLine(rng, x1, y1, x2, y2, 1)} stroke="#F6D36A" strokeWidth={9} strokeLinecap="round" fill="none" />
          <Path d={strokeLine(rng, x1, y1, x2, y2, 0.6)} stroke="#FFF8D6" strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>,
      );
    }
    return segs;
  }, [count, dots]);

  const dotArt = useMemo(() => {
    const rng = rngFor('dots' + w);
    return dots.map(([x, y]) => ({
      fill: wobblePath(ellipsePts(x, y, DOT, DOT, 14), 1, rng),
      ring: wobblePath(ellipsePts(x, y, DOT, DOT, 14), 1.2, rng),
    }));
  }, [dots, w]);

  const last = count > 0 ? dots[count - 1] : null;
  const next = dots[count];

  return (
    <View {...pan.panHandlers} style={{ width: w, height: h }} accessibilityLabel="Connect the dots from 1 to 6">
      <PaintedPanel width={w} height={h} sky={['#24324D', '#3F65AE']} background={bg}>
        <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
          {struck && <Path d={boltShape} fill="#F6D36A" opacity={0.9} />}
          {lineArt}
          {last && finger && !struck && (
            <Path d={`M${last[0]} ${last[1]}L${finger[0]} ${finger[1]}`} stroke="#F6D36A" strokeWidth={6} strokeDasharray="4 9" strokeLinecap="round" />
          )}
          {dotArt.map((d, i) => {
            const isDone = i < count;
            const isWrong = wrongDot === i;
            return (
              <G key={i}>
                <Path d={d.fill} fill={isWrong ? '#F2A39A' : isDone ? '#F6D36A' : '#FFFDF9'} />
                <Path d={d.ring} fill="none" stroke={isWrong ? '#C64B41' : isDone ? '#C99A22' : '#B9C6DE'} strokeWidth={3} />
              </G>
            );
          })}
          {finger && !struck && <Path d={wobblePath(ellipsePts(finger[0], finger[1], 9, 9, 10), 0.5, rngFor('f'))} fill="#FFFFFF" opacity={0.9} />}
        </Svg>

        {dots.map(([x, y], i) => (
          <Text key={i} pointerEvents="none" style={[styles.num, { left: x - 20, top: y - 15 }]}>{i + 1}</Text>
        ))}

        {next && !struck && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute', left: next[0] - 38, top: next[1] - 38, width: 76, height: 76, borderRadius: 38,
              borderWidth: 3, borderColor: '#F6D36A',
              opacity: comfort ? 0.7 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] }),
              transform: [{ scale: comfort ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
            }}
          />
        )}

        <View pointerEvents="none" style={styles.chip}>
          <Text style={{ fontFamily: font.black, fontSize: 14, color: '#F6D36A' }}>{count} / {dots.length}</Text>
        </View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flash }]} />
      </PaintedPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  num: { position: 'absolute', width: 40, textAlign: 'center', fontFamily: font.black, fontSize: 21, color: INK },
  chip: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(30,42,56,0.75)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
