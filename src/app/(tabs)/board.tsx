import { View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Card, Kicker, ProgressBar, Screen, T } from '@/components/ui';
import { useAppTheme } from '@/theme/ThemeContext';

// BOARD tab — weekly challenges + leaderboard. TODO: load from the backend.
const LEADERS = [
  { name: 'MetroMaya', pts: 420, fav: 'CEN' },
  { name: 'ParkStPat', pts: 385, fav: 'PRK' },
  { name: 'You', pts: 310, fav: 'KEN', me: true },
  { name: 'QuincyQ', pts: 290, fav: 'QCY' },
  { name: 'AlewifeAl', pts: 240, fav: 'ALE' },
];

export default function Board() {
  const { c } = useAppTheme();
  return (
    <Screen title="Board">
      <Card>
        <Kicker color={c.purple}>Weekly challenge</Kicker>
        <T size={18} weight="black" style={{ marginVertical: 8 }}>Art hunter: scan 3 artwork stamps</T>
        <ProgressBar value={1 / 3} color={c.purple} />
      </Card>
      <View style={{ gap: 8 }}>
        {LEADERS.map((p, i) => (
          <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: p.me ? c.red : c.line, backgroundColor: p.me ? c.redTint : c.card }}>
            <T size={16} weight="black" color={i < 3 ? c.goldInk : c.muted} style={{ width: 24, textAlign: 'center' }}>{i + 1}</T>
            <Mascot stationId={p.fav} size={44} />
            <T size={16} weight="heavy" style={{ flex: 1 }}>{p.name}</T>
            <T size={15} weight="black" color={c.muted}>{p.pts} pts</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
