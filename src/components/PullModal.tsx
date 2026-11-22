import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cardStory, stampLine } from '@/api/questie';
import { Mascot } from '@/components/Mascot';
import { QuestieBubble } from '@/components/QuestieBubble';
import { RARITY, StampCard } from '@/components/StampCard';
import { Button } from '@/components/ui';
import { stationById } from '@/data/stations';
import { useFeedback } from '@/state/feedback';
import type { OwnedCard } from '@/state/game';
import { font } from '@/theme/colors';

// Gacha reveal: a sealed pack shakes → tap → the card flips in over spinning rays in its rarity color.

const HEADLINE = { C: 'COMMON', R: 'RARE PULL!', E: 'EPIC PULL!', L: 'LEGENDARY!!' } as const;
const RAY = { C: 'rgba(255,246,236,0.45)', R: 'rgba(169,193,238,0.7)', E: 'rgba(211,184,228,0.8)', L: 'rgba(242,207,107,0.9)' } as const;

type Props = {
  card: OwnedCard | null;
  isNew: boolean;
  repeat?: boolean; // same station / QR code already pulled in the last 24 h: album only, no points
  canHunt: boolean;
  extra?: string; // e.g. "Artwork stamp unlocked · +50"
  onHunt: () => void;
  onClose: () => void;
};

export function PullModal({ card, isNew, repeat, canHunt, extra, onHunt, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [reduceSystem, setReduce] = useState(false);
  const { settings, announce } = useFeedback();
  const reduce = reduceSystem || settings.comfort;
  const [line, setLine] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const current = useRef<string | undefined>(undefined);
  const shake = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  // reset whenever a new card arrives
  useEffect(() => {
    setOpen(false);
    setLine(undefined);
    setThinking(false);
    current.current = card?.uid;
    flip.setValue(0);
  }, [card?.uid, flip]);

  useEffect(() => {
    if (!card || open || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [card, open, reduce, shake]);

  useEffect(() => {
    if (!open || reduce) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [open, reduce, spin]);

  if (!card) return null;
  const s = stationById(card.stationId)!;

  const reveal = () => {
    setOpen(true);
    const word = { C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary' }[card.rarity];
    // instant: the rarity buzz (and screen readers get the result right away)
    announce({ kind: 'reward', banner: false, voice: false, text: `${word} card: ${s.mascot}`, buzz: card.rarity === 'L' ? 'legendary' : card.rarity === 'C' ? 'reward' : 'rare' });
    // then Questie celebrates with a Gemini-written line, in its own voice
    setThinking(true);
    const uid = card.uid;
    stampLine(card).then((l) => {
      if (current.current !== uid) return;
      setThinking(false);
      setLine(l);
      announce({ kind: 'reward', banner: false, text: l });
    });
    if (reduce) flip.setValue(1);
    else Animated.spring(flip, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
  };

  // tap the card → Questie tells its one-line story
  const tellStory = () => {
    const uid = card.uid;
    setThinking(true);
    cardStory(card)
      .then((story) => {
        if (current.current !== uid) return;
        setLine(story);
        announce({ kind: 'reward', banner: false, text: story });
      })
      .catch(() => setLine('I lost my train of thought — tap the card again!'))
      .finally(() => setThinking(false));
  };

  const R = RARITY[card.rarity];
  const rays = Array.from({ length: 15 }, (_, i) => {
    const a0 = (i * 24 * Math.PI) / 180, a1 = ((i * 24 + 10) * Math.PI) / 180;
    return `M200 200L${200 + 400 * Math.cos(a0)} ${200 + 400 * Math.sin(a0)}L${200 + 400 * Math.cos(a1)} ${200 + 400 * Math.sin(a1)}Z`;
  }).join('');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,24,34,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, overflow: 'hidden' }}>
        {!open ? (
          <>
            <Text style={{ fontFamily: font.black, fontSize: 13, letterSpacing: 1.4, color: '#FFF6EC' }}>STAMP PULL · {(card.place ?? s.name).toUpperCase()}</Text>
            <Animated.View style={{ transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) }] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open your stamp pack"
                onPress={reveal}
                style={{ width: 230, height: 310, borderRadius: 26, padding: 12, backgroundColor: '#E26B60', borderBottomWidth: 8, borderBottomColor: '#9C3830' }}>
                <View style={{ flex: 1, borderRadius: 18, borderWidth: 3, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Mascot stationId={card.stationId} size={120} locked />
                  <Text style={{ fontFamily: font.black, fontSize: 22, color: '#fff' }}>Who’s inside?</Text>
                  <Text style={{ fontFamily: font.heavy, fontSize: 13, color: '#fff', opacity: 0.9 }}>Harvest Week pack</Text>
                </View>
              </Pressable>
            </Animated.View>
            <Text style={{ fontFamily: font.black, fontSize: 18, color: '#fff' }}>Tap the pack to open</Text>
          </>
        ) : (
          <>
            <Animated.View
              pointerEvents="none"
              style={{ position: 'absolute', width: 400, height: 400, opacity: 0.6, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: 2 }] }}>
              <Svg width={400} height={400}>
                <Path d={rays} fill={RAY[card.rarity]} />
              </Svg>
            </Animated.View>
            <View style={{ backgroundColor: R.frame, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontFamily: font.black, fontSize: 15, letterSpacing: 1.4, color: R.ink }}>{HEADLINE[card.rarity]}</Text>
            </View>
            <Animated.View
              style={{
                opacity: flip,
                transform: [
                  { perspective: 800 },
                  { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                  { scale: flip.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              }}>
              <Pressable onPress={tellStory} accessibilityRole="button" accessibilityHint="Questie tells this card's story">
                <StampCard stationId={card.stationId} seed={card.seed} rarity={card.rarity} placeCode={card.placeCode} width={230} />
              </Pressable>
            </Animated.View>
            <QuestieBubble text={line} loading={thinking} dark />
            <Text style={{ fontFamily: font.black, fontSize: 16, color: '#fff', textAlign: 'center' }}>
              {repeat ? `Already collected ${card.place ?? s.mascot} today` : `${isNew ? `You met ${s.mascot}! ` : `A new look for ${s.mascot}! `}+10 points`}
            </Text>
            {repeat ? <Text style={{ fontFamily: font.heavy, fontSize: 14, color: '#FFF6EC', textAlign: 'center' }}>No points this time, but it still goes in your album. Come back tomorrow for points.</Text> : null}
            {extra ? <Text style={{ fontFamily: font.black, fontSize: 15, color: '#F2CF6B', textAlign: 'center' }}>{extra}</Text> : null}
            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              {canHunt && <Button label="Hunt the artwork · +50" kind="gold" onPress={onHunt} />}
              <Button label="Add to my album" kind="green" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
