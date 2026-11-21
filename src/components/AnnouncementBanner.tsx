import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { useFeedback, type AnnouncementKind } from '@/state/feedback';
import { font, type Palette } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// The on-screen channel: a big, glanceable banner at the top of every screen. Tap to dismiss.

const LABEL: Record<AnnouncementKind, string> = {
  next: 'NEXT STOP', yourStop: 'YOUR STOP IS NEXT', arrive: 'NOW ARRIVING', reward: 'NEW CARD', info: 'TQUEST', error: 'HEADS UP',
};

function colors(kind: AnnouncementKind, c: Palette): [string, string, string] {
  switch (kind) {
    case 'next': return [c.blueTint, c.blueInk, c.blue];
    case 'yourStop': return [c.redTint, c.redInk, c.red];
    case 'arrive': return [c.greenTint, c.greenInk, c.green];
    case 'reward': return [c.goldTint, c.goldInk, c.gold];
    case 'error': return [c.orangeTint, c.orangeInk, c.orange];
    default: return [c.card, c.text, c.line];
  }
}

export function AnnouncementBanner() {
  const { banner, dismissBanner, settings } = useFeedback();
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!banner) return;
    if (settings.comfort) { slide.setValue(1); return; } // motion comfort: just appear
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [banner, settings.comfort, slide]);

  if (!banner) return null;
  const [bg, ink, edge] = colors(banner.kind, c);
  const channels = [settings.voice && 'VOICE', settings.vibration && 'BUZZ'].filter(Boolean).join(' · ');

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 12, right: 12, top: insets.top + 8, zIndex: 100,
        opacity: slide,
        transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
      }}>
      <Pressable
        onPress={dismissBanner}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${LABEL[banner.kind]}. ${banner.text}. Tap to dismiss.`}
        style={{ backgroundColor: bg, borderRadius: 20, borderWidth: 2, borderColor: edge, borderBottomWidth: 5, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: edge, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            {banner.kind === 'reward' ? (
              <><Rect x={4} y={9} width={16} height={11} rx={2} /><Path d="M3 9h18M12 9v11" /></>
            ) : banner.kind === 'error' ? (
              <Path d="M12 3l9.5 17h-19zM12 10v4M12 17.2v.1" />
            ) : (
              <><Rect x={5} y={3} width={14} height={13} rx={3} /><Path d="M5 10h14M8 20l2-4M16 20l-2-4" /></>
            )}
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.black, fontSize: 12, letterSpacing: 1, color: ink }}>{LABEL[banner.kind]}</Text>
          <Text style={{ fontFamily: font.black, fontSize: 20, lineHeight: 25, color: c.text }}>{banner.text}</Text>
          {channels ? <Text style={{ fontFamily: font.heavy, fontSize: 12, color: ink, marginTop: 2 }}>also by {channels.toLowerCase()}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
