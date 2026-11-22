// Pick step: your 3-card hand as real painted StampCards in a fan.
// Tap a card → it lifts with a gold glow and shows big in the middle; "Play this card" confirms.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

import { RARITY, StampCard, describeCard } from '@/components/StampCard';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { CardBack, ELEMENT, ElementBadge, PaintedButton } from './paintKit';
import { RARITY_BONUS } from './power';
import { useDuelFx } from './sfx';
import type { DuelCardView } from './types';

type Props = {
  hand: DuelCardView[];
  opponentName: string;
  /** true once the opponent has locked in their card */
  opponentReady: boolean;
  onPlay: (card: DuelCardView) => void;
  /** available width (screen width minus padding) */
  width: number;
  /** pass a smaller height on short phones; the big preview shrinks */
  height?: number;
};

export function HandPicker({ hand, opponentName, opponentReady, onPlay, width, height = 640 }: Props) {
  const { c } = useAppTheme();
  const { play, haptic, comfort } = useDuelFx();
  const [sel, setSel] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  const lifts = useRef(hand.map(() => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const cardW = Math.min(112, Math.floor((width - 28) / 3.1));
  const previewW = Math.min(196, Math.floor(width * 0.52), Math.floor((height - 330) / 1.4));
  const selected = hand.find((h) => h.uid === sel) ?? null;

  useEffect(() => {
    hand.forEach((h, i) =>
      Animated.timing(lifts[i], { toValue: h.uid === sel ? 1 : 0, duration: comfort ? 0 : 180, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start(),
    );
  }, [sel, hand, lifts, comfort]);

  useEffect(() => {
    if (opponentReady || comfort) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opponentReady, comfort, pulse]);

  const info = useMemo(() => {
    if (!selected) return null;
    const d = describeCard(selected.stationId, selected.seed, selected.rarity, selected.placeCode);
    const e = ELEMENT[selected.element];
    const bonus = RARITY_BONUS[selected.rarity];
    return { title: d.title, line: `${e.label} · ${RARITY[selected.rarity].label.toLowerCase()}${bonus ? ` +${bonus}` : ''} · ${e.game}` };
  }, [selected]);

  const choose = (card: DuelCardView) => {
    if (played) return;
    setSel(card.uid);
    play('select');
    haptic('tap');
  };

  const confirm = () => {
    if (!selected || played) return;
    setPlayed(true);
    play('flip');
    haptic('success');
    onPlay(selected);
  };

  return (
    <View style={{ width, alignItems: 'center', gap: 14 }}>
      {/* opponent */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', backgroundColor: c.card, borderRadius: 20, padding: 10, borderWidth: 2, borderColor: c.line }}>
        <CardBack width={46} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.black, fontSize: 16, color: c.text }}>{opponentName}</Text>
          <Animated.Text style={{ opacity: pulse, fontFamily: font.heavy, fontSize: 14, color: opponentReady ? '#2F8556' : c.muted }}>
            {opponentReady ? 'Card locked in ✓' : 'Choosing a card…'}
          </Animated.Text>
        </View>
      </View>

      {/* big preview of the selected card */}
      <View style={{ height: previewW * 1.4 + 50, alignItems: 'center', justifyContent: 'center' }}>
        {selected && info ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View>
              <StampCard stationId={selected.stationId} seed={selected.seed} rarity={selected.rarity} placeCode={selected.placeCode} width={previewW} />
              <View style={{ position: 'absolute', right: -10, top: -10 }}><ElementBadge element={selected.element} size={40} /></View>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: font.heavy, fontSize: 14, color: c.muted }}>{info.line}</Text>
          </View>
        ) : (
          <View style={{ width: previewW, height: previewW * 1.4, borderRadius: previewW * 0.075, borderWidth: 3, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Text style={{ fontFamily: font.black, fontSize: 18, color: c.muted, textAlign: 'center' }}>Pick a card{'\n'}from your hand</Text>
            <View style={{ marginTop: 12, gap: 6, alignItems: 'center' }}>
              {(['sun', 'storm', 'moon'] as const).map((el, i) => (
                <View key={el} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ElementBadge element={el} size={20} />
                  <Text style={{ fontFamily: font.heavy, fontSize: 12, color: c.muted }}>beats</Text>
                  <ElementBadge element={(['storm', 'moon', 'sun'] as const)[i]} size={20} />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* the fan */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: cardW * 1.12 + 34 }}>
        {hand.map((card, i) => {
          const mid = (hand.length - 1) / 2;
          const rot = (i - mid) * 6;
          const drop = Math.abs(i - mid) * 10;
          const isSel = card.uid === sel;
          const lift = lifts[i];
          return (
            <Pressable
              key={card.uid}
              onPress={() => choose(card)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${ELEMENT[card.element].label} card, ${RARITY[card.rarity].label}`}
              style={{ marginHorizontal: -3, zIndex: isSel ? 2 : 1 }}>
              <Animated.View
                style={{
                  transform: [
                    { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [drop, drop - 26] }) },
                    { rotate: `${isSel ? rot / 2 : rot}deg` },
                    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
                  ],
                }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: cardW * 0.12,
                    backgroundColor: '#F6D36A', opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                  }}
                />
                <StampCard stationId={card.stationId} seed={card.seed} rarity={card.rarity} placeCode={card.placeCode} width={cardW} compact />
                <View style={{ position: 'absolute', right: -8, top: -8 }}><ElementBadge element={card.element} size={30} /></View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      <PaintedButton label={played ? 'Card played!' : 'Play this card'} width={Math.min(280, width)} disabled={!selected || played} onPress={confirm} />
    </View>
  );
}
