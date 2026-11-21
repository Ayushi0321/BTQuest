import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// Shared building blocks in the chunky, Duolingo-like style of the design.

export function Screen({ title, right, children, scroll = true }: { title?: string; right?: ReactNode; children: ReactNode; scroll?: boolean }) {
  const { c } = useAppTheme();
  const body = <View style={{ padding: 18, gap: 14, paddingBottom: 40 }}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 }}>
          <Text style={{ fontFamily: font.black, fontSize: 28, color: c.text }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {scroll ? <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Card({ children, style, tint }: { children: ReactNode; style?: ViewStyle; tint?: string }) {
  const { c } = useAppTheme();
  return (
    <View
      style={[
        tint
          ? { backgroundColor: tint, borderRadius: 22, padding: 16 }
          : { backgroundColor: c.card, borderRadius: 22, padding: 16, borderWidth: 2, borderColor: c.line, borderBottomWidth: 5, borderBottomColor: c.cardShadow },
        style,
      ]}>
      {children}
    </View>
  );
}

type BtnKind = 'red' | 'green' | 'blue' | 'gold' | 'plain';

// 3D "press-down" button: a darker bottom edge that disappears while pressed.
export function Button({ label, onPress, kind = 'red', disabled, style }: { label: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; style?: ViewStyle }) {
  const { c } = useAppTheme();
  const [down, setDown] = useState(false);
  const map: Record<BtnKind, [string, string, string]> = {
    red: [c.redBtn, c.redDeep, '#fff'],
    green: [c.greenBtn, c.greenDeep, '#fff'],
    blue: [c.blueBtn, c.blueDeep, '#fff'],
    gold: [c.gold, c.goldDeep, '#1E2A38'],
    plain: [c.card, c.line, c.blueInk],
  };
  const [bg, edge, fg] = map[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[
        {
          backgroundColor: bg, borderRadius: 16, minHeight: 54, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
          borderBottomWidth: down ? 1 : 5, borderBottomColor: edge, marginTop: down ? 4 : 0,
          borderWidth: kind === 'plain' ? 2 : 0, borderColor: c.line, opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}>
      <Text style={{ fontFamily: font.black, fontSize: 16, letterSpacing: 0.4, color: fg }}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

export function Pill({ label, bg, fg, style }: { label: string; bg: string; fg: string; style?: ViewStyle }) {
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }, style]}>
      <Text style={{ fontFamily: font.black, fontSize: 12, letterSpacing: 0.8, color: fg }}>{label}</Text>
    </View>
  );
}

export function Kicker({ children, color }: { children: string; color?: string }) {
  const { c } = useAppTheme();
  return <Text style={{ fontFamily: font.black, fontSize: 12, letterSpacing: 1, color: color ?? c.muted }}>{children.toUpperCase()}</Text>;
}

export function T({ children, size = 16, weight = 'bold', color, style }: { children: ReactNode; size?: number; weight?: 'bold' | 'heavy' | 'black'; color?: string; style?: TextStyle }) {
  const { c } = useAppTheme();
  return <Text style={[{ fontFamily: font[weight], fontSize: size, color: color ?? c.text }, style]}>{children}</Text>;
}

export function ProgressBar({ value, color, height = 14 }: { value: number; color?: string; height?: number }) {
  const { c } = useAppTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: c.card2, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: color ?? c.red }} />
    </View>
  );
}
