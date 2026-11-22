// Charge step: "3 · 2 · 1 · GO!", then the mini-game for your card's element runs for 6 seconds
// (or until it finishes early). Calls onDone(power 0–100) once.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { RARITY, StampCard } from '@/components/StampCard';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { MoonGame } from './games/MoonGame';
import { StormGame } from './games/StormGame';
import { SunGame } from './games/SunGame';
import type { GameProps } from './games/shared';
import { ELEMENT, ElementBadge } from './paintKit';
import { RARITY_BONUS, clampPower } from './power';
import { useDuelFx } from './sfx';
import type { DuelCardView } from './types';
import { PowerBar, StampLabel, TimerRing } from './widgets';

const GAMES = { sun: SunGame, storm: StormGame, moon: MoonGame } as const;

type Props = {
  card: DuelCardView;
  opponentName: string;
  /** true once the opponent finished their mini-game */
  opponentDone?: boolean;
  width: number;
  /** height available for this whole step (the game panel takes what's left) */
  height: number;
  durationSec?: number;
  onDone: (power: number) => void;
};

type Phase = 'intro' | 'play' | 'done';

export function ChargePhase({ card, opponentName, opponentDone, width, height, durationSec = 6, onDone }: Props) {
  const { c } = useAppTheme();
  const { play, haptic, comfort } = useDuelFx();
  const e = ELEMENT[card.element];
  const Game = GAMES[card.element];

  const [phase, setPhase] = useState<Phase>('intro');
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(durationSec);
  const [power, setPower] = useState(0);
  const powerRef = useRef(0);
  const finished = useRef(false);
  const pop = useRef(new Animated.Value(0)).current;
  const doneAnim = useRef(new Animated.Value(0)).current;

  const panelH = Math.max(300, Math.min(460, height - 250));

  // 3 · 2 · 1 · GO
  useEffect(() => {
    let n = 3;
    const step = () => {
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: comfort ? 0 : 420, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }).start();
      play(n > 0 ? 'tick' : 'whoosh');
      haptic('tap');
    };
    step();
    const id = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n < 0) {
        clearInterval(id);
        setPhase('play');
        return;
      }
      step();
    }, 550);
    return () => clearInterval(id);
  }, [comfort, haptic, play, pop]);

  const finish = useCallback((p: number) => {
    if (finished.current) return;
    finished.current = true;
    const final = clampPower(p);
    powerRef.current = final;
    setPower(final);
    setPhase('done');
    haptic('success');
    Animated.timing(doneAnim, { toValue: 1, duration: comfort ? 0 : 380, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
    setTimeout(() => onDone(final), 1100);
  }, [comfort, doneAnim, haptic, onDone]);

  // game clock
  useEffect(() => {
    if (phase !== 'play') return;
    const start = Date.now();
    let lastTick = Math.ceil(durationSec);
    const id = setInterval(() => {
      const l = Math.max(0, durationSec - (Date.now() - start) / 1000);
      setLeft(l);
      const whole = Math.ceil(l);
      if (whole < lastTick && whole <= 3 && whole > 0) play('tick');
      lastTick = whole;
      if (l <= 0) {
        clearInterval(id);
        finish(powerRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, durationSec, finish, play]);

  const onPower = useCallback((p: number) => {
    powerRef.current = clampPower(p);
    setPower(powerRef.current);
  }, []);

  const bonus = RARITY_BONUS[card.rarity];
  const gameProps: GameProps = {
    width, height: panelH, seed: card.uid, running: phase === 'play', comfort,
    onPower, onFinish: finish, play, haptic,
  };

  return (
    <View style={{ width, gap: 12 }}>
      {/* your card + timer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View>
          <StampCard stationId={card.stationId} seed={card.seed} rarity={card.rarity} placeCode={card.placeCode} width={58} compact />
          <View style={{ position: 'absolute', right: -8, top: -8 }}><ElementBadge element={card.element} size={26} /></View>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.black, fontSize: 17, color: c.text }}>
            {e.label} card · {RARITY[card.rarity].label.toLowerCase()}{bonus ? ` +${bonus}` : ''}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.heavy, fontSize: 14, color: c.muted }}>Mini-game: {e.game}</Text>
        </View>
        <TimerRing left={phase === 'intro' ? durationSec : left} total={durationSec} />
      </View>

      {/* the game */}
      <View style={{ width, height: panelH }}>
        <Game {...gameProps} />

        {phase === 'intro' && (
          <View style={[StyleSheet.absoluteFill, styles.scrim]}>
            <Animated.Text style={[styles.count, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }], opacity: pop }]}>
              {count > 0 ? count : 'GO!'}
            </Animated.Text>
            <Text style={styles.hint}>{e.hint}</Text>
          </View>
        )}

        {phase === 'done' && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: 'rgba(30,42,56,0.35)' }]}>
            <Animated.View style={{ transform: [{ scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], opacity: doneAnim }}>
              <StampLabel text={`POWER ${power}`} color={e.color} ink={e.ink} size={30} tilt={-6} />
            </Animated.View>
          </View>
        )}
      </View>

      <Text style={{ textAlign: 'center', fontFamily: font.heavy, fontSize: 16, color: c.text }}>{e.hint}</Text>

      <PowerBar value={power} color={e.color} />

      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
        <Text style={{ fontFamily: font.heavy, fontSize: 14, color: opponentDone ? '#2F8556' : c.muted }}>
          {opponentDone ? `${opponentName} is ready ✓` : `${opponentName} is charging…`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(30,42,56,0.45)', borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  count: { fontFamily: font.black, fontSize: 92, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 8 },
  hint: { fontFamily: font.black, fontSize: 18, color: '#FFFFFF', textAlign: 'center' },
});
