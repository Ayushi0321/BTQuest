import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { Tabs } from 'expo-router';

import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const LABELS: Record<string, string> = { index: 'Ride', rewards: 'Rewards', scan: 'Scan', board: 'Board', you: 'You' };

// Custom tab bar: 4 normal tabs + a big raised gold Scan button in the middle.
export function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 2, borderTopColor: c.line, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 8 }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const go = () => {
          const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigateToTab(route.key);
        };

        if (route.name === 'scan') {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan artwork"
                accessibilityState={{ selected: focused }}
                onPress={go}
                style={({ pressed }) => ({
                  marginTop: -30, width: 70, height: 70, borderRadius: 35, backgroundColor: c.gold,
                  borderWidth: 4, borderColor: c.card, alignItems: 'center', justifyContent: 'center',
                  transform: [{ translateY: pressed ? 3 : 0 }],
                  shadowColor: c.goldDeep, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: pressed ? 1 : 5 }, elevation: 4,
                })}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#1E2A38" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
                  <Rect x={8.5} y={8.5} width={7} height={7} rx={1.2} />
                </Svg>
                <Text style={{ fontFamily: font.black, fontSize: 10, color: '#1E2A38' }}>SCAN</Text>
              </Pressable>
            </View>
          );
        }

        const color = focused ? c.redInk : c.muted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            onPress={go}
            style={{
              flex: 1, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2,
              backgroundColor: focused ? c.redTint : 'transparent', borderWidth: 2, borderColor: focused ? c.red : 'transparent', marginHorizontal: 2,
            }}>
            <TabIcon name={route.name} color={color} />
            <Text style={{ fontFamily: font.black, fontSize: 12, color }}>{LABELS[route.name] ?? route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'index':
      return <Svg {...p}><Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><Path d="M9 4v14M15 6v14" /></Svg>;
    case 'rewards':
      return <Svg {...p}><Rect x={3.5} y={9} width={17} height={11} rx={2} /><Path d="M2.5 9h19M12 9v11M12 9c-2-4-6-5-6-2s6 2 6 2zM12 9c2-4 6-5 6-2s-6 2-6 2z" /></Svg>;
    case 'board':
      return <Svg {...p}><Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" /></Svg>;
    default:
      return <Svg {...p}><Circle cx={12} cy={8} r={4} /><Path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></Svg>;
  }
}
