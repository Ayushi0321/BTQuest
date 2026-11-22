// ☾ Moon — "Star catcher": stars and rain clouds fall from the night sky.
// Drag the sleepy crescent moon left/right to catch stars (+12) and dodge clouds (−15).

import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { densify, ellipsePts, strokePath, wobblePath, type Pt } from '@/lib/paint';
import { makeRng, hashString } from '@/lib/random';
import { font } from '@/theme/colors';

import { INK, PaintedPanel, cloud, rngFor, starPts, wash } from '../paintKit';
import { clamp, useFrame, type GameProps } from './shared';

type Item = { id: number; kind: 'star' | 'cloud'; x: number; y: number; spin: number };

const STAR_PTS = 12;
const CLOUD_PTS = 15;
const MOON_W = 104;
const CATCH = 52;

export function MoonGame({ width: w, height: h, seed, running, comfort, onPower, play, haptic }: GameProps) {
  const moonY = h - 92;
  const fallSpeed = h / (comfort ? 3.4 : 2.3); // px per second
  const spawnEvery = comfort ? 650 : 430;

  const [, setTick] = useState(0);
  const g = useRef({
    moonX: w / 2, targetX: w / 2, items: [] as Item[], nextSpawn: 0, nextId: 1,
    stars: 0, clouds: 0, rng: makeRng(hashString('moon' + seed)), hurtUntil: 0, elapsed: 0,
  }).current;
  const [pops, setPops] = useState<{ id: number; x: number; text: string; good: boolean }[]>([]);
  const popAnims = useRef(new Map<number, Animated.Value>()).current;

  const power = () => clamp(g.stars * STAR_PTS - g.clouds * CLOUD_PTS, 0, 100);

  const addPop = (x: number, text: string, good: boolean) => {
    const id = Date.now() + Math.random();
    const v = new Animated.Value(0);
    popAnims.set(id, v);
    setPops((p) => [...p.slice(-3), { id, x, text, good }]);
    Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }).start(() => {
      popAnims.delete(id);
      setPops((p) => p.filter((q) => q.id !== id));
    });
  };

  useFrame((dt, elapsed) => {
    g.elapsed = elapsed;
    // moon eases toward the finger
    g.moonX += (g.targetX - g.moonX) * Math.min(1, dt / 60);
    // spawn
    if (elapsed >= g.nextSpawn) {
      g.nextSpawn = elapsed + spawnEvery * (0.75 + g.rng() * 0.5);
      g.items.push({ id: g.nextId++, kind: g.rng() < 0.74 ? 'star' : 'cloud', x: 30 + g.rng() * (w - 60), y: -30, spin: g.rng() * 360 });
    }
    // fall + catch
    const keep: Item[] = [];
    for (const it of g.items) {
      const prevY = it.y;
      it.y += (fallSpeed * dt) / 1000 * (it.kind === 'cloud' ? 0.85 : 1);
      it.spin += dt * 0.08;
      const crossed = prevY < moonY && it.y >= moonY;
      if (crossed && Math.abs(it.x - g.moonX) < CATCH) {
        if (it.kind === 'star') {
          g.stars += 1;
          play('select');
          haptic('tap');
          addPop(it.x, `+${STAR_PTS}`, true);
        } else {
          g.clouds += 1;
          g.hurtUntil = elapsed + 400;
          play('hit');
          haptic('tap');
          addPop(it.x, `−${CLOUD_PTS}`, false);
        }
        onPower(power());
        continue;
      }
      if (it.y < h + 40) keep.push(it);
    }
    g.items = keep;
    setTick((t) => t + 1);
  }, running);

  const move = (e: GestureResponderEvent) => {
    g.targetX = clamp(e.nativeEvent.locationX, MOON_W / 2, w - MOON_W / 2);
  };
  const pan = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: move,
      onPanResponderMove: move,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w],
  );

  const bg = useMemo(() => {
    const rng = rngFor('moon-bg' + seed + w);
    const twinkles = Array.from({ length: 30 }, (_, i) => {
      const x = rng() * w;
      const y = rng() * h * 0.7;
      const r = 0.8 + rng() * 1.6;
      return <Path key={i} d={wobblePath(ellipsePts(x, y, r, r, 6), 0.2, rng)} fill="#FFFFFF" opacity={0.35 + rng() * 0.4} />;
    });
    const hills = (base: number, col: string, op: number, key: string) => {
      const pts: Pt[] = [];
      for (let x = -10; x <= w + 10; x += 22) pts.push([x, h * base + Math.sin(x / 45 + rng() * 0.6) * 12]);
      pts.push([w + 10, h + 10], [-10, h + 10]);
      return wash(pts, rng, col, 2.5, op, key);
    };
    return (
      <G>
        {twinkles}
        {cloud(rng, w * 0.15, h * 0.2, 26, '#5B5390', 0.6, 'n1')}
        {cloud(rng, w * 0.65, h * 0.3, 20, '#5B5390', 0.45, 'n2')}
        {hills(0.84, '#3A3266', 0.9, 'h1')}
        {hills(0.9, '#2C2650', 1, 'h2')}
        <Path d={strokePath(rng, 18, h - 30, w - 18, h - 30, 1)} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={10} strokeLinecap="round" fill="none" />
      </G>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, seed]);

  const art = useMemo(() => {
    const rng = rngFor('moon-sprites');
    const star = (
      <Svg width={44} height={44} viewBox="0 0 44 44">
        {wash(starPts(22, 23, 20, 0.5), rng, '#F6D36A', 1)}
        <Path d={wobblePath(starPts(22, 23, 20, 0.5), 0.8, rng)} fill="none" stroke="#C99A22" strokeWidth={2} />
        <Path d="M18 22a1.8 2.2 0 1 0 0.1 0zM26 22a1.8 2.2 0 1 0 0.1 0z" fill={INK} />
        <Path d="M19.5 27q2.5 2 5 0" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </Svg>
    );
    const rainCloud = (
      <Svg width={58} height={52} viewBox="0 0 58 52">
        {cloud(rng, 29, 20, 20, '#8A93A8', 1, 'rc')}
        {[17, 29, 41].map((x, i) => <Path key={i} d={strokePath(rng, x, 34, x - 4, 46, 0.4)} stroke="#9CC8EC" strokeWidth={3} strokeLinecap="round" fill="none" />)}
        <Path d="M22 19q2 -2 4 0M32 19q2 -2 4 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M26 25q3 -2 6 0" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </Svg>
    );
    // crescent lying on its back like a cradle, with a sleepy smile
    const outer: Pt[] = [];
    const inner: Pt[] = [];
    for (let a = 0; a <= 180; a += 10) {
      const r = (a * Math.PI) / 180;
      outer.push([52 + 48 * Math.cos(r), 14 + 44 * Math.sin(r)]);
    }
    for (let a = 180; a >= 0; a -= 10) {
      const r = (a * Math.PI) / 180;
      inner.push([52 + 44 * Math.cos(r), 12 + 26 * Math.sin(r)]);
    }
    const shape = densify([...outer, ...inner], 8);
    const moon = (
      <Svg width={MOON_W} height={64} viewBox="0 0 104 64">
        {wash(shape, rng, '#F3E6B8', 1.2)}
        <Path d={wobblePath(shape, 0.8, rng)} fill="none" stroke="#D4BE7C" strokeWidth={2} />
        <Path d="M38 47q4 3 8 0M58 47q4 3 8 0" stroke={INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d="M32 52a3.5 2.5 0 1 0 0.1 0zM72 52a3.5 2.5 0 1 0 0.1 0z" fill="#F4A79F" />
        <Path d="M48 53q4 3 8 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d={wobblePath(densify([[14, 30], [24, 42]], 4, false), 0.5, rng, false)} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" fill="none" />
      </Svg>
    );
    return { star, rainCloud, moon };
  }, []);

  const hurt = g.elapsed < g.hurtUntil;

  return (
    <View {...pan.panHandlers} style={{ width: w, height: h }} accessibilityLabel="Drag the moon to catch falling stars">
      <PaintedPanel width={w} height={h} sky={['#1F2445', '#4B3F7A']} background={bg}>
        {g.items.map((it) => (
          <View key={it.id} pointerEvents="none" style={{ position: 'absolute', left: it.x - (it.kind === 'star' ? 22 : 29), top: it.y - 22, transform: it.kind === 'star' && !comfort ? [{ rotate: `${Math.sin(it.spin / 30) * 14}deg` }] : [] }}>
            {it.kind === 'star' ? art.star : art.rainCloud}
          </View>
        ))}

        <View pointerEvents="none" style={{ position: 'absolute', left: g.moonX - MOON_W / 2, top: moonY - 8, opacity: hurt ? 0.55 : 1 }}>
          {art.moon}
        </View>

        {pops.map((p) => {
          const v = popAnims.get(p.id);
          return (
            <Animated.Text
              key={p.id}
              pointerEvents="none"
              style={[styles.pop, {
                left: clamp(p.x - 40, 4, w - 84), top: moonY - 46, color: p.good ? '#F6D36A' : '#F2A39A',
                opacity: v ? v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }) : 0,
                transform: [{ translateY: v ? v.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) : 0 }],
              }]}>
              {p.text}
            </Animated.Text>
          );
        })}

        <View pointerEvents="none" style={styles.chip}>
          <Text style={{ fontFamily: font.black, fontSize: 14, color: '#F6D36A' }}>★ {g.stars}</Text>
          <Text style={{ fontFamily: font.black, fontSize: 14, color: '#C9D2DC' }}>☁ {g.clouds}</Text>
        </View>
      </PaintedPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  pop: { position: 'absolute', width: 80, textAlign: 'center', fontFamily: font.black, fontSize: 22 },
  chip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
