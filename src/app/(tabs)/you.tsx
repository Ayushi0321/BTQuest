import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Card, Kicker, Screen, T } from '@/components/ui';
import { font } from '@/theme/colors';
import { useAppTheme, type ThemeMode } from '@/theme/ThemeContext';

// YOU tab — announcement channels, comfort and theme.
// TODO: save these settings (AsyncStorage or backend) and use them in the Ride announcements.
export default function You() {
  const { c, mode, setMode } = useAppTheme();
  const [text, setText] = useState(true);
  const [voice, setVoice] = useState(true);
  const [buzz, setBuzz] = useState(true);
  const [calm, setCalm] = useState(false);

  const row = (label: string, sub: string, value: boolean, set: (v: boolean) => void, last = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 2, borderBottomColor: c.line }}>
      <View style={{ flex: 1 }}>
        <T size={16} weight="black">{label}</T>
        <T size={13} color={c.muted}>{sub}</T>
      </View>
      <Switch value={value} onValueChange={set} trackColor={{ true: c.greenBtn, false: c.track }} thumbColor="#fff" accessibilityLabel={label} />
    </View>
  );

  return (
    <Screen title="You">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mascot stationId="KEN" size={72} frame />
        <View>
          <T size={24} weight="black">Hi, rider</T>
          <T size={15} color={c.muted}>Favorite mascot: Ken · 12-day streak</T>
        </View>
      </View>

      <Kicker>Hear it your way</Kicker>
      <Card style={{ paddingVertical: 4 }}>
        {row('On-screen text', 'Big, glanceable stop names', text, setText)}
        {row('Voice', 'Clear spoken announcements', voice, setVoice)}
        {row('Vibration', 'A distinct buzz when your stop is next', buzz, setBuzz, true)}
      </Card>

      <Kicker>Comfort</Kicker>
      <Card style={{ paddingVertical: 4 }}>
        {row('Motion comfort mode', 'Calm screen while moving. Voice and buzz lead.', calm, setCalm, true)}
      </Card>

      <Kicker>Appearance</Kicker>
      <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: 16, padding: 4, gap: 4 }}>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="button" accessibilityState={{ selected: mode === m }}
            style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? c.card : 'transparent' }}>
            <Text style={{ fontFamily: font.black, fontSize: 15, color: mode === m ? c.text : c.muted }}>{m[0].toUpperCase() + m.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
