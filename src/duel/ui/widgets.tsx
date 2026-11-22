// Small duel widgets: timer ring, power bar, score pill, stamp labels.

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { rrectPts, wobblePath } from '@/lib/paint';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { INK, rngFor } from './paintKit';

/** Countdown ring. `left` and `total` in seconds. Turns red for the last 3 seconds. */
export const TimerRing = memo(function TimerRing({ left, total, size = 54 }: { left: number; total: number; size?: number }) {
  const { c } = useAppTheme();
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, left / total));
  const hot = left <= 3;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${Math.ceil(left)} seconds left`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={6} fill={c.card} />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={hot ? '#C64B41' : '#E6B23A'} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ * frac} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.black, fontSize: size * 0.36, color: hot ? '#C64B41' : c.text }}>{Math.ceil(left)}</Text>
      </View>
    </View>
  );
});

/** Painted power bar. `value` can go past `max` (bonuses) — the bar just fills up. */
export function PowerBar({
  value, max = 100, color = '#E6B23A', label = 'POWER', detail, height = 18, animate = true, duration = 260, style,
}: {
  value: number; max?: number; color?: string; label?: string; detail?: string; height?: number; animate?: boolean; duration?: number; style?: ViewStyle;
}) {
  const { c } = useAppTheme();
  const [w, setW] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(animate ? 0 : value);
  useEffect(() => {
    const target = Math.max(0, Math.min(1, value / max));
    if (!animate) { anim.setValue(target); setShown(value); return; }
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v * max)));
    Animated.timing(anim, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(value));
    return () => anim.removeListener(id);
  }, [value, max, animate, duration, anim]);
  const track = useMemo(() => (w ? wobblePath(rrectPts(1, 1, w - 2, height - 2, (height - 2) / 2, 3), 0.9, rngFor('track' + w)) : ''), [w, height]);
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
        <Text style={{ fontFamily: font.black, fontSize: 13, letterSpacing: 1.6, color: c.muted }}>{label}</Text>
        {detail ? <Text style={{ flex: 1, fontFamily: font.heavy, fontSize: 14, color: c.muted }}>{detail}</Text> : <View style={{ flex: 1 }} />}
        <Text style={{ fontFamily: font.black, fontSize: 22, color: c.text }}>{shown}</Text>
      </View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={height} style={{ position: 'absolute' }}>
            <Path d={track} fill={c.track} opacity={0.7} />
          </Svg>
        )}
        <Animated.View
          style={{
            position: 'absolute', left: 0, top: 2, bottom: 2, borderRadius: height, backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, w)] }),
            overflow: 'hidden',
          }}>
          <View style={{ position: 'absolute', left: 8, right: 8, top: 3, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        </Animated.View>
      </View>
    </View>
  );
}

/** "You 1 – 0 Swift Ken #46" */
export function ScorePill({ you, opp, oppName }: { you: number; opp: number; oppName: string }) {
  const { c } = useAppTheme();
  return (
    <View style={{ alignSelf: 'center', maxWidth: '100%', backgroundColor: c.card, borderRadius: 999, borderWidth: 2, borderColor: c.line, borderBottomWidth: 5, paddingHorizontal: 18, paddingVertical: 7 }}>
      <Text numberOfLines={1} style={{ fontFamily: font.black, fontSize: 16, color: c.text }}>
        You {you} – {opp} {oppName}
      </Text>
    </View>
  );
}

/** Tilted painted stamp label, e.g. "KO" or "POW". */
export const StampLabel = memo(function StampLabel({ text, color = '#C64B41', ink = '#FFFFFF', size = 28, tilt = -10 }: { text: string; color?: string; ink?: string; size?: number; tilt?: number }) {
  const w = size * (0.9 + text.length * 0.62);
  const h = size * 1.5;
  const d = useMemo(() => wobblePath(rrectPts(2, 2, w - 4, h - 4, h * 0.22, 3), 1.2, rngFor('stamp' + text)), [w, h, text]);
  return (
    <View style={{ width: w, height: h, transform: [{ rotate: `${tilt}deg` }] }}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Path d={d} fill={color} />
        <Path d={d} fill="none" stroke={ink} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 4" transform={`translate(${w * 0.06} ${h * 0.12}) scale(0.88 0.76)`} />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.black, fontSize: size, color: ink, letterSpacing: 1 }}>{text}</Text>
      </View>
    </View>
  );
});

export { INK };
