// Clash: both cards flip up, power bars fill, the cards charge and bump twice (POW!),
// the winner's element strikes, then it's a tug-of-war — the bigger the power gap, the further
// the loser gets pushed. A gap over KO_GAP knocks them right out of the arena.
// Tap anywhere to skip to the result. Comfort mode: no charging or shaking, just the result.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { StampCard } from '@/components/StampCard';
import { densify, ellipsePts, rrectPts, strokePath, wobblePath } from '@/lib/paint';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { ELEMENT, ElementBadge, INK, PaintedPanel, cloud, rngFor, starPts, wash } from './paintKit';
import { KO_GAP, breakdown, clashResult } from './power';
import { useDuelFx } from './sfx';
import type { ClashResult, Fighter } from './types';
import { PowerBar, StampLabel } from './widgets';

type Props = {
  you: Fighter;
  opp: Fighter;
  width: number;
  /** arena height (the bars and banner go underneath) */
  arenaHeight?: number;
  onDone: (result: ClashResult) => void;
};

export function ClashArena({ you, opp, width: W, arenaHeight, onDone }: Props) {
  const { c } = useAppTheme();
  const { play, haptic, comfort } = useDuelFx();
  const result = clashResult(you, opp);
  const winner = result === 'you' ? you : result === 'opp' ? opp : null;
  const gap = Math.abs(you.total - opp.total);
  const isKO = result !== 'tie' && gap > KO_GAP;

  const cardW = Math.min(128, Math.round(W * 0.33));
  const cardH = Math.round(cardW * 1.12);
  const cardTop = 54;
  const A = arenaHeight ?? cardTop + cardH + 104;
  const ropeY = cardTop + cardH + 46;
  const youLeft = Math.round(W * 0.05);
  const oppLeft = Math.round(W - W * 0.05 - cardW);
  const dxYou = W / 2 - cardW + 6 - youLeft; // contact positions
  const dxOpp = W / 2 - 6 - oppLeft;
  const push = Math.min(1, gap / KO_GAP) * W * 0.16;
  const dir = result === 'you' ? 1 : -1;

  const v = useRef({
    youX: new Animated.Value(0), oppX: new Animated.Value(0),
    youRot: new Animated.Value(-4), oppRot: new Animated.Value(4),
    youFlip: new Animated.Value(0), oppFlip: new Animated.Value(0),
    flash: new Animated.Value(0), pow: new Animated.Value(0), shake: new Animated.Value(0),
    effect: new Animated.Value(0), ko: new Animated.Value(0), grey: new Animated.Value(0),
    knot: new Animated.Value(0), banner: new Animated.Value(0), lift: new Animated.Value(0),
  }).current;
  const [bars, setBars] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ended = useRef(false);

  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const tween = (val: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) =>
    Animated.timing(val, { toValue, duration, easing, useNativeDriver: true });

  const endState = () => {
    // jump everything to the final picture
    v.youFlip.setValue(1); v.oppFlip.setValue(1); v.pow.setValue(0); v.flash.setValue(0); v.shake.setValue(0); v.effect.setValue(0);
    if (result === 'tie') {
      v.youX.setValue(0); v.oppX.setValue(0);
    } else {
      const fly = isKO ? W * 0.55 : 0;
      v.youX.setValue(dxYou + dir * push + (result === 'opp' ? -fly : 0) - (comfort ? dxYou * 0.4 : 0));
      v.oppX.setValue(dxOpp + dir * push + (result === 'you' ? fly : 0) - (comfort ? dxOpp * 0.4 : 0));
      if (isKO) { v.youRot.setValue(result === 'opp' ? -24 : -4); v.oppRot.setValue(result === 'you' ? 24 : 4); }
      v.grey.setValue(1); v.ko.setValue(1); v.lift.setValue(1);
      v.knot.setValue(dir * Math.min(1, gap / KO_GAP));
    }
    setBars(true);
    setShowBanner(true);
    v.banner.setValue(1);
  };

  const finish = (delay: number) => {
    if (ended.current) return;
    ended.current = true;
    at(delay, () => onDone(result));
  };

  const skip = () => {
    if (ended.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    Object.values(v).forEach((a) => a.stopAnimation());
    endState();
    finish(700);
  };

  useEffect(() => {
    ended.current = false;
    const T = timers.current;
    const bannerIn = () => {
      setShowBanner(true);
      tween(v.banner, 1, 260, Easing.out(Easing.back(2))).start();
      if (result === 'tie') { play('whoosh'); haptic('tap'); }
      else if (result === 'you') { play('roundWin'); haptic('success'); }
      else { play('roundLose'); haptic('error'); }
    };

    if (comfort) {
      v.youFlip.setValue(1); v.oppFlip.setValue(1);
      v.youX.setValue(dxYou * 0.6); v.oppX.setValue(dxOpp * 0.6);
      at(100, () => setBars(true));
      at(900, () => {
        if (result !== 'tie') { v.grey.setValue(1); v.ko.setValue(1); v.lift.setValue(1); v.knot.setValue(dir * Math.min(1, gap / KO_GAP)); play('hit'); }
      });
      at(1300, bannerIn);
      finish(2800);
      return () => T.forEach(clearTimeout);
    }

    // 1 · flip up
    play('flip');
    tween(v.youFlip, 1, 260, Easing.out(Easing.back(1.6))).start();
    at(140, () => { play('flip'); tween(v.oppFlip, 1, 260, Easing.out(Easing.back(1.6))).start(); });
    // 2 · bars fill
    at(380, () => setBars(true));
    // 3 · pull back, charge, contact
    at(1050, () => {
      play('whoosh');
      Animated.parallel([
        Animated.sequence([tween(v.youX, -16, 150), tween(v.youX, dxYou, 230, Easing.in(Easing.quad))]),
        Animated.sequence([tween(v.oppX, 16, 150), tween(v.oppX, dxOpp, 230, Easing.in(Easing.quad))]),
      ]).start();
    });
    const contact = () => {
      play('hit');
      haptic('tap');
      v.flash.setValue(0.9);
      tween(v.flash, 0, 220).start();
      v.pow.setValue(0);
      Animated.sequence([tween(v.pow, 1.15, 160, Easing.out(Easing.back(3))), tween(v.pow, 1, 90)]).start();
      Animated.sequence([
        tween(v.shake, 1, 40, Easing.linear), tween(v.shake, -1, 60, Easing.linear),
        tween(v.shake, 0.6, 50, Easing.linear), tween(v.shake, 0, 50, Easing.linear),
      ]).start();
    };
    at(1430, contact);
    // 4 · second bump
    at(1500, () => {
      Animated.parallel([
        Animated.sequence([tween(v.youX, dxYou - 26, 130), tween(v.youX, dxYou, 120, Easing.in(Easing.quad))]),
        Animated.sequence([tween(v.oppX, dxOpp + 26, 130), tween(v.oppX, dxOpp, 120, Easing.in(Easing.quad))]),
      ]).start();
    });
    at(1750, contact);

    if (result === 'tie') {
      at(1950, () => {
        tween(v.pow, 0, 200).start();
        Animated.parallel([tween(v.youX, 0, 420, Easing.out(Easing.back(1.4))), tween(v.oppX, 0, 420, Easing.out(Easing.back(1.4)))]).start();
      });
      at(2350, bannerIn);
      finish(3600);
      return () => T.forEach(clearTimeout);
    }

    // 5 · element strike from the winner
    at(1950, () => {
      play(winner!.card.element);
      tween(v.pow, 0, 200).start();
      v.effect.setValue(0);
      tween(v.effect, 1, 620, Easing.out(Easing.quad)).start();
    });
    // 6 · the push
    at(2450, () => {
      const loserX = result === 'you' ? v.oppX : v.youX;
      const winnerX = result === 'you' ? v.youX : v.oppX;
      const loserBase = result === 'you' ? dxOpp : dxYou;
      const winnerBase = result === 'you' ? dxYou : dxOpp;
      const loserRot = result === 'you' ? v.oppRot : v.youRot;
      Animated.parallel([
        tween(winnerX, winnerBase + dir * push, 420, Easing.out(Easing.cubic)),
        tween(loserX, loserBase + dir * push + (isKO ? dir * W * 0.55 : 0), isKO ? 520 : 420, isKO ? Easing.in(Easing.quad) : Easing.out(Easing.cubic)),
        tween(loserRot, isKO ? dir * 24 : dir * 10, 420),
        tween(v.knot, dir * Math.min(1, gap / KO_GAP), 420),
        tween(v.grey, 1, 300),
        tween(v.lift, 1, 300, Easing.out(Easing.back(2))),
      ]).start();
      haptic(isKO ? 'rare' : 'tap');
    });
    at(2700, () => {
      play(isKO ? 'ko' : 'hit');
      tween(v.ko, 1, 240, Easing.out(Easing.back(3))).start();
    });
    at(3250, bannerIn);
    finish(4500);
    return () => T.forEach(clearTimeout);
    // run once per clash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- painted art ----------
  const bg = useMemo(() => {
    const rng = rngFor('arena' + W);
    const crowd = Array.from({ length: 7 }, (_, i) => {
      const x = (i + 0.5) * (W / 7) + (rng() - 0.5) * 12;
      const col = ['#E26B60', '#5A80C6', '#4FA874', '#EE9A45', '#9C5E95', '#E6B23A', '#5A80C6'][i];
      return (
        <G key={i} opacity={0.35}>
          {wash(ellipsePts(x, A * 0.12, 13, 11, 12), rng, col, 1)}
          {wash(rrectPts(x - 14, A * 0.12 + 8, 28, 30, 10, 2), rng, col, 1)}
        </G>
      );
    });
    return (
      <G>
        {crowd}
        {cloud(rng, W * 0.12, A * 0.62, 22, '#FFFFFF', 0.55, 'd1')}
        {cloud(rng, W * 0.9, A * 0.58, 18, '#FFFFFF', 0.5, 'd2')}
        {wash(densify([[-10, ropeY - 20], [W + 10, ropeY - 26], [W + 10, A + 10], [-10, A + 10]], 20), rng, '#EBD7A6', 2.5)}
        <Path d={strokePath(rng, W * 0.06, ropeY, W * 0.94, ropeY, 1.4)} stroke="#B8945A" strokeWidth={8} strokeLinecap="round" fill="none" />
        <Path d={strokePath(rng, W * 0.06, ropeY - 2, W * 0.94, ropeY - 2, 1.2)} stroke="#D8BB84" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d={strokePath(rng, W / 2, ropeY - 18, W / 2, ropeY + 18, 0.6)} stroke="#8A6A33" strokeWidth={4} strokeLinecap="round" fill="none" />
      </G>
    );
  }, [W, A, ropeY]);

  const powArt = useMemo(() => {
    const rng = rngFor('pow');
    const burst = starPts(60, 60, 58, 0.55, 12, -90);
    return (
      <Svg width={120} height={120} viewBox="0 0 120 120">
        {wash(burst, rng, '#E6B23A', 2)}
        {wash(starPts(60, 60, 40, 0.6, 12, -75), rng, '#F6D36A', 1.4, 0.9)}
      </Svg>
    );
  }, []);

  const effectArt = useMemo(() => {
    if (!winner) return null;
    const rng = rngFor('fx' + winner.card.element);
    if (winner.card.element === 'sun') {
      return (
        <Svg width={220} height={220} viewBox="0 0 220 220">
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return <Path key={i} d={strokePath(rng, 110 + 40 * Math.cos(a), 110 + 40 * Math.sin(a), 110 + 104 * Math.cos(a), 110 + 104 * Math.sin(a), 1.5)} stroke={i % 2 ? '#F6D36A' : '#E6B23A'} strokeWidth={i % 2 ? 7 : 11} strokeLinecap="round" fill="none" />;
          })}
          {wash(ellipsePts(110, 110, 34, 34, 16), rng, '#FFE59A', 2, 0.8)}
        </Svg>
      );
    }
    if (winner.card.element === 'storm') {
      const bolt = densify([[70, 0], [40, 70], [64, 72], [30, 160], [96, 58], [70, 56], [92, 0]], 10);
      return (
        <Svg width={120} height={170} viewBox="0 0 120 170">
          {wash(bolt, rng, '#F6D36A', 2)}
          <Path d={wobblePath(bolt, 1, rng)} fill="none" stroke="#FFFFFF" strokeWidth={3} />
        </Svg>
      );
    }
    return (
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Path d="M150 30a80 80 0 1 0 0 140a64 64 0 1 1 0 -140z" fill="#E9DDF6" opacity={0.9} />
        <Path d="M150 30a80 80 0 1 0 0 140a64 64 0 1 1 0 -140z" fill="none" stroke="#7B6BB0" strokeWidth={4} />
        {[[40, 40], [170, 110], [60, 170]].map(([x, y], i) => <G key={i}>{wash(starPts(x, y, 10), rng, '#F6D36A', 0.6)}</G>)}
      </Svg>
    );
  }, [winner]);

  const loserCenterX = result === 'you' ? W / 2 - 6 + cardW / 2 : W / 2 + 6 - cardW / 2;

  const fighter = (f: Fighter, side: 'you' | 'opp') => {
    const x = side === 'you' ? v.youX : v.oppX;
    const rot = side === 'you' ? v.youRot : v.oppRot;
    const flip = side === 'you' ? v.youFlip : v.oppFlip;
    const left = side === 'you' ? youLeft : oppLeft;
    const isLoser = (result === 'you' && side === 'opp') || (result === 'opp' && side === 'you');
    const isWinner = result === side;
    return (
      <Animated.View
        key={side}
        style={{
          position: 'absolute', left, top: cardTop, width: cardW, alignItems: 'center', zIndex: isWinner ? 3 : 2,
          transform: [
            { translateX: x },
            { translateY: isWinner ? v.lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) : 0 },
            { rotate: rot.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
            { scaleX: flip },
            { scale: isWinner ? v.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) : 1 },
          ],
        }}>
        <View>
          <StampCard stationId={f.card.stationId} seed={f.card.seed} rarity={f.card.rarity} placeCode={f.card.placeCode} width={cardW} compact />
          {isLoser && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: cardW * 0.075, backgroundColor: 'rgba(110,110,120,0.5)', opacity: v.grey }} />
          )}
          <View style={{ position: 'absolute', right: -8, top: -8 }}><ElementBadge element={f.card.element} size={30} /></View>
          {isLoser && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: side === 'opp' ? cardW * 0.4 : cardW * 0.04, bottom: cardH * 0.1, opacity: v.ko, transform: [{ scale: v.ko.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) }] }}>
              <StampLabel text={isKO ? 'KO' : 'OUCH'} size={isKO ? 24 : 18} tilt={-14} />
            </Animated.View>
          )}
          {isWinner && (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -14, right: -14, top: -14, bottom: -14, opacity: v.lift }}>
              <Svg width={cardW + 28} height={cardH + 28}>
                {[[8, 20], [cardW + 16, 34], [cardW + 6, cardH + 10], [14, cardH - 4]].map(([x, y], i) => (
                  <Path key={i} d={wobblePath(starPts(x, y, i % 2 ? 7 : 9), 0.4, rngFor('sp' + i))} fill="#F6D36A" stroke="#C99A22" strokeWidth={1.5} />
                ))}
              </Svg>
            </Animated.View>
          )}
        </View>
        <Text numberOfLines={1} style={{ marginTop: 8, maxWidth: cardW + 30, fontFamily: font.black, fontSize: 15, color: INK }}>{f.name}</Text>
      </Animated.View>
    );
  };

  const bannerText = result === 'tie' ? 'Tie! Sudden death' : result === 'you' ? (isKO ? 'Knockout! Round to you!' : 'Round to you!') : `Round to ${opp.name}`;
  const bannerTint = result === 'opp' ? c.redTint : c.goldTint;

  return (
    <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Tap to skip" accessibilityHint={bannerText} style={{ width: W, gap: 14 }}>
      <Animated.View style={{ transform: [{ translateX: v.shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }) }] }}>
        <PaintedPanel width={W} height={A} sky={['#FBF1D6', '#F4E3B8']} background={bg}>
          {/* rope knot */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute', left: W / 2 - 12, top: ropeY - 12, width: 24, height: 24, borderRadius: 12,
              backgroundColor: '#C64B41', borderWidth: 4, borderColor: '#FFFFFF',
              transform: [{ translateX: v.knot.interpolate({ inputRange: [-1, 1], outputRange: [-W * 0.36, W * 0.36] }) }],
            }}
          />
          {fighter(you, 'you')}
          {fighter(opp, 'opp')}

          {/* POW */}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: W / 2 - 60, top: cardTop + cardH * 0.12, zIndex: 5, opacity: v.pow.interpolate({ inputRange: [0, 0.3, 1.2], outputRange: [0, 1, 1] }), transform: [{ scale: v.pow }] }}>
            {powArt}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontFamily: font.black, fontSize: 26, color: '#A23E35', transform: [{ rotate: '-8deg' }] }}>POW</Text>
            </View>
          </Animated.View>

          {/* element strike */}
          {effectArt && winner && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute', zIndex: 6,
                left: loserCenterX - (winner.card.element === 'storm' ? 60 : winner.card.element === 'sun' ? 110 : 100),
                top: winner.card.element === 'storm' ? cardTop - 40 : cardTop + cardH / 2 - (winner.card.element === 'sun' ? 110 : 100),
                opacity: v.effect.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform:
                  winner.card.element === 'sun'
                    ? [{ scale: v.effect.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) }, { rotate: v.effect.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) }]
                    : winner.card.element === 'storm'
                      ? [{ translateY: v.effect.interpolate({ inputRange: [0, 0.2, 1], outputRange: [-60, 0, 0] }) }]
                      : [{ translateX: v.effect.interpolate({ inputRange: [0, 1], outputRange: [-90 * dir, 90 * dir] }) }, { rotate: v.effect.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '30deg'] }) }],
              }}>
              {effectArt}
            </Animated.View>
          )}

          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: v.flash, zIndex: 8 }]} />
        </PaintedPanel>
      </Animated.View>

      {/* power bars */}
      <View style={{ gap: 12, paddingHorizontal: 4 }}>
        <PowerBar label={you.name.toUpperCase()} detail={breakdown(you)} value={bars ? you.total : 0} max={Math.max(you.total, opp.total, 100)} color={ELEMENT[you.card.element].color} duration={600} />
        <PowerBar label={opp.name.toUpperCase()} detail={breakdown(opp)} value={bars ? opp.total : 0} max={Math.max(you.total, opp.total, 100)} color={ELEMENT[opp.card.element].color} duration={600} />
      </View>

      {/* result banner — always below the arena */}
      <View style={{ minHeight: 74, justifyContent: 'center' }}>
        {showBanner ? (
          <Animated.View style={{ opacity: v.banner, transform: [{ scale: v.banner.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], backgroundColor: bannerTint, borderRadius: 22, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: font.black, fontSize: 24, color: c.text }}>{bannerText}</Text>
            <Text style={{ fontFamily: font.heavy, fontSize: 15, color: c.muted }}>{you.total} vs {opp.total}</Text>
          </Animated.View>
        ) : (
          <Text style={{ textAlign: 'center', fontFamily: font.bold, fontSize: 13, color: c.muted }}>Tap to skip</Text>
        )}
      </View>
    </Pressable>
  );
}
