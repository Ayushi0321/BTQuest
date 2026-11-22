// Painted building blocks for the duel screens, in the same hand-painted style as the stamp cards:
// every shape is drawn twice with a little random wobble (watercolor edge) and the paper texture on top.

import { memo, useMemo, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { ellipsePts, rrectPts, wobblePath, densify, type Pt } from '@/lib/paint';
import { hashString, makeRng, type Rng } from '@/lib/random';
import { font } from '@/theme/colors';

import type { DuelElement } from './types';

export const INK = '#1E2A38';

export const ELEMENT: Record<DuelElement, { label: string; color: string; deep: string; tint: string; ink: string; game: string; hint: string }> = {
  sun: { label: 'Sun', color: '#E6B23A', deep: '#B68719', tint: '#FBF1D6', ink: INK, game: 'Stop at noon', hint: 'Tap when the sun is in the gold zone!' },
  storm: { label: 'Storm', color: '#3F65AE', deep: '#2F4E89', tint: '#E3EBF8', ink: '#FFFFFF', game: 'Connect the dots', hint: 'Trace 1 → 6 to strike!' },
  moon: { label: 'Moon', color: '#7B6BB0', deep: '#584A8A', tint: '#ECE8F7', ink: '#FFFFFF', game: 'Star catcher', hint: 'Drag the moon to catch stars. Dodge rain clouds!' },
};

export const rngFor = (key: string): Rng => makeRng(hashString(key));

/** Two wobbly copies of the same outline: a solid fill and a lighter, shifted wash on top. */
export function wash(pts: Pt[], rng: Rng, fill: string, amp = 2.2, opacity = 1, key?: string) {
  return (
    <G key={key}>
      <Path d={wobblePath(pts, amp, rng)} fill={fill} opacity={opacity} />
      <Path d={wobblePath(pts, amp * 1.4, rng)} fill={fill} opacity={opacity * 0.45} />
    </G>
  );
}

export function starPts(cx: number, cy: number, r: number, inner = 0.48, points = 5, rot = -90): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < points * 2; k++) {
    const a = ((rot + (k * 180) / points) * Math.PI) / 180;
    const rr = k % 2 === 0 ? r : r * inner;
    out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return densify(out, Math.max(4, r / 3));
}

/** Soft cloud made of overlapping painted ellipses. */
export function cloud(rng: Rng, cx: number, cy: number, s: number, fill: string, opacity = 0.9, key?: string) {
  const parts: [number, number, number, number][] = [
    [0, 0, 1, 0.55], [-0.62, 0.16, 0.6, 0.4], [0.62, 0.14, 0.66, 0.42], [-0.2, -0.3, 0.55, 0.45], [0.3, -0.26, 0.5, 0.4],
  ];
  return (
    <G key={key} opacity={opacity}>
      {parts.map(([dx, dy, rx, ry], i) => wash(ellipsePts(cx + dx * s, cy + dy * s, rx * s, ry * s, 14), rng, fill, s * 0.05, 1, `c${i}`))}
    </G>
  );
}

export function PaperOverlay({ opacity = 0.5, radius = 0 }: { opacity?: number; radius?: number }) {
  return (
    <Image
      pointerEvents="none"
      source={require('@/assets/textures/paper.png')}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { opacity, borderRadius: radius }]}
    />
  );
}

/** A rounded panel with a painted SVG background (in a 0..width × 0..height viewBox) and paper grain on top. */
export function PaintedPanel({
  width, height, radius = 28, sky, children, background, style,
}: {
  width: number; height: number; radius?: number; sky: [string, string]; children?: ReactNode; background?: ReactNode; style?: ViewStyle;
}) {
  const gid = useMemo(() => `sky${hashString(sky.join('') + width + height)}`, [sky, width, height]);
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: sky[1] }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="1" stopColor={sky[1]} />
          </LinearGradient>
        </Defs>
        <Path d={`M0 0H${width}V${height}H0Z`} fill={`url(#${gid})`} />
        {background}
      </Svg>
      {children}
      <PaperOverlay opacity={0.4} radius={radius} />
    </View>
  );
}

/** Chunky painted button (wobbly pill with a darker "lip" underneath, like the app's buttons). */
export function PaintedButton({
  label, onPress, color = '#E6B23A', deep = '#B68719', ink = INK, width = 240, height = 58, disabled, style,
}: {
  label: string; onPress?: () => void; color?: string; deep?: string; ink?: string; width?: number; height?: number; disabled?: boolean; style?: ViewStyle;
}) {
  const shapes = useMemo(() => {
    const rng = rngFor(label + width);
    const lip = rrectPts(2, 8, width - 4, height - 10, (height - 10) / 2, 4);
    const top = rrectPts(2, 2, width - 4, height - 10, (height - 10) / 2, 4);
    return { lip: wobblePath(lip, 1.4, rng), top: wobblePath(top, 1.4, rng), shine: wobblePath(densify([[height * 0.45, 12], [width * 0.55, 11]], 10, false), 0.8, rng, false) };
  }, [label, width, height]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[{ width, height, opacity: disabled ? 0.5 : 1 }, style]}>
      {({ pressed }) => (
        <View style={{ flex: 1, transform: [{ translateY: pressed ? 4 : 0 }] }}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {!pressed && <Path d={shapes.lip} fill={deep} />}
            <Path d={shapes.top} fill={color} />
            <Path d={shapes.shine} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" fill="none" />
          </Svg>
          <View style={{ height: height - 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.black, fontSize: Math.round(height * 0.36), color: ink, letterSpacing: 0.5 }}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Element glyph (sun / lightning bolt / crescent) on a painted coin. */
export const ElementBadge = memo(function ElementBadge({ element, size = 30 }: { element: DuelElement; size?: number }) {
  const e = ELEMENT[element];
  const art = useMemo(() => {
    const rng = rngFor('badge' + element);
    const s = 40;
    const coin = wash(ellipsePts(20, 20, 17, 17, 16), rng, e.color, 0.9);
    let glyph: ReactNode;
    if (element === 'sun') {
      glyph = (
        <G>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <Path key={i} d={`M${20 + 9 * Math.cos(a)} ${20 + 9 * Math.sin(a)}L${20 + 13 * Math.cos(a)} ${20 + 13 * Math.sin(a)}`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />;
          })}
          <Path d={wobblePath(ellipsePts(20, 20, 6, 6, 10), 0.5, rng)} fill="#FFF3C4" stroke={INK} strokeWidth={1.6} />
        </G>
      );
    } else if (element === 'storm') {
      glyph = <Path d={wobblePath(densify([[23, 8], [13, 22], [19, 22], [16, 32], [27, 17], [21, 17], [25, 8]], 4), 0.5, rng)} fill="#F6D36A" stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />;
    } else {
      glyph = <Path d="M24 9a11 11 0 1 0 6 20a9 9 0 1 1 -6 -20z" fill="#F3E6B8" />;
    }
    return { coin, glyph, s };
  }, [element, e.color]);
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel={`${e.label} card`}>
      <Circle cx={20} cy={20} r={19.5} fill="#FFFFFF" />
      {art.coin}
      {art.glyph}
    </Svg>
  );
});

/** Face-down card: navy with a painted gold token and a big "?". Same size ratio as a compact StampCard. */
export const CardBack = memo(function CardBack({ width = 90, label }: { width?: number; label?: string }) {
  const h = Math.round(width * 1.12);
  const art = useMemo(() => {
    const rng = rngFor('cardback');
    const stars = Array.from({ length: 9 }, (_, i) => {
      const x = 12 + ((i * 37) % 76);
      const y = 14 + ((i * 53) % 84);
      return wash(starPts(x, y, 3.5), rng, '#E6B23A', 0.3, 0.55, `s${i}`);
    });
    return (
      <>
        {wash(rrectPts(3, 3, 94, 106, 9), rng, '#2B3A55', 1.2)}
        {wash(rrectPts(9, 9, 82, 94, 6), rng, '#34466A', 1)}
        {stars}
        {wash(ellipsePts(50, 56, 24, 24, 18), rng, '#E6B23A', 1.2)}
        {wash(ellipsePts(50, 56, 18, 18, 16), rng, '#F6D58A', 0.8, 0.7)}
      </>
    );
  }, []);
  return (
    <View style={{ width, height: h, borderRadius: width * 0.08, overflow: 'hidden' }} accessibilityLabel={label ?? 'Face-down card'}>
      <Svg width={width} height={h} viewBox="0 0 100 112">{art}</Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: width * 0.02 }]}>
        <Text style={{ fontFamily: font.black, fontSize: width * 0.3, color: INK }}>?</Text>
      </View>
      <PaperOverlay opacity={0.45} />
    </View>
  );
});
