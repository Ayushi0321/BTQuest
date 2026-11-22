// End of match: painted celebration (or a gentle "good duel"), final score, the winning card,
// a line from Questie, and Rematch / Back. Grant the Champion card yourself with pull() + PullModal.

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { G, Path } from 'react-native-svg';

import { Questie } from '@/components/Questie';
import { StampCard } from '@/components/StampCard';
import { ellipsePts, rrectPts, wobblePath } from '@/lib/paint';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { ElementBadge, PaintedButton, PaintedPanel, rngFor, starPts } from './paintKit';
import { useDuelFx } from './sfx';
import type { DuelCardView } from './types';

type Props = {
  won: boolean;
  you: number;
  opp: number;
  oppName: string;
  /** the card that won the last round (yours if you won) */
  winningCard?: DuelCardView;
  width: number;
  onRematch?: () => void;
  rematchLabel?: string;
  onBack: () => void;
};

const WIN_LINES = ['What a duel! That card is going in the hall of fame.', 'Champion of the car! Ride on, legend.', 'You charged up like the Red Line at rush hour!'];
const LOSE_LINES = ['So close! Every duel makes your deck stronger.', 'Good duel! Shake hands — or wave across the car.', 'Next stop: rematch. You’ve got this!'];

export function DuelResult({ won, you, opp, oppName, winningCard, width: W, onRematch, rematchLabel = 'Rematch', onBack }: Props) {
  const { c } = useAppTheme();
  const { play, haptic, comfort } = useDuelFx();
  const enter = useRef(new Animated.Value(comfort ? 1 : 0)).current;
  const line = useMemo(() => (won ? WIN_LINES : LOSE_LINES)[(you * 7 + opp * 3) % 3], [won, you, opp]);
  const H = Math.round(W * 1.02);
  const cardW = Math.min(170, Math.round(W * 0.44));

  useEffect(() => {
    if (won) { play('matchWin'); haptic('legendary'); } else { play('roundLose'); haptic('tap'); }
    if (!comfort) Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }).start();
  }, [won, comfort, enter, haptic, play]);

  const bg = useMemo(() => {
    const rng = rngFor('result' + won + W);
    const cols = ['#E26B60', '#E6B23A', '#5A80C6', '#4FA874', '#9C5E95', '#EE9A45'];
    const bits = Array.from({ length: won ? 34 : 18 }, (_, i) => {
      const x = rng() * W;
      let y = rng() * H * 0.9;
      if (y < 100 && x > W * 0.18 && x < W * 0.82) y += 100; // keep the title clear
      if (won) {
        return i % 3 === 0
          ? <Path key={i} d={wobblePath(starPts(x, y, 6 + rng() * 5), 0.4, rng)} fill={cols[i % cols.length]} opacity={0.85} />
          : <Path key={i} d={wobblePath(rrectPts(x, y, 6 + rng() * 6, 10 + rng() * 6, 2, 1), 0.6, rng)} fill={cols[i % cols.length]} opacity={0.8} transform={`rotate(${rng() * 90 - 45} ${x} ${y})`} />;
      }
      return <Path key={i} d={wobblePath(ellipsePts(x, y, 2, 5, 8), 0.4, rng)} fill="#9CC8EC" opacity={0.5} />;
    });
    return <G>{bits}</G>;
  }, [won, W, H]);

  return (
    <View style={{ width: W, gap: 14 }}>
      <PaintedPanel width={W} height={H} sky={won ? ['#FBF1D6', '#F6DFA6'] : ['#E3EBF8', '#F7F5F0']} background={bg}>
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 22, gap: 6 }}>
          <Text style={{ fontFamily: font.black, fontSize: 34, color: c.text }}>{won ? 'You win!' : 'Good duel!'}</Text>
          <Text style={{ fontFamily: font.heavy, fontSize: 17, color: c.muted }}>You {you} – {opp} {oppName}</Text>
          {winningCard ? (
            <Animated.View style={{ marginTop: 10, alignItems: 'center', transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: won ? '-3deg' : '2deg' }], opacity: enter }}>
              <View>
                <StampCard stationId={winningCard.stationId} seed={winningCard.seed} rarity={winningCard.rarity} placeCode={winningCard.placeCode} width={cardW} compact />
                <View style={{ position: 'absolute', right: -10, top: -10 }}><ElementBadge element={winningCard.element} size={36} /></View>
              </View>
              <Text style={{ marginTop: 8, fontFamily: font.black, fontSize: 13, letterSpacing: 1.5, color: c.muted }}>{won ? 'YOUR WINNING CARD' : `${oppName.toUpperCase()}’S WINNING CARD`}</Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          <Questie size={62} talking />
          <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, borderWidth: 2, borderColor: c.line }}>
            <Text style={{ fontFamily: font.heavy, fontSize: 15, color: c.text }}>{line}</Text>
          </View>
        </View>
      </PaintedPanel>
      {onRematch ? <PaintedButton label={rematchLabel} width={W} onPress={onRematch} /> : null}
      <PaintedButton label="Back" width={W} color={c.card} deep={c.line} ink={c.blueInk} onPress={onBack} />
    </View>
  );
}

