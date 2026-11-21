import { memo, useMemo, type ReactElement } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { stationById } from '@/data/stations';
import { ellipsePts, hillPts, rrectPts, strokePath, wobblePath, type Pt } from '@/lib/paint';
import { hashString, makeRng } from '@/lib/random';
import { font } from '@/theme/colors';

// ARTWORK STAMP — a painted postage stamp of the artwork itself (no mascot).
// One design per Arts on the T piece; add a painter below when you add an artwork to stations.ts.

type Props = { stationId: string; width?: number; locked?: boolean; holeColor?: string };

const GOLD = '#E6B23A';
const GOLD_DEEP = '#B68719';

export const ArtStamp = memo(function ArtStamp({ stationId, width = 220, locked = false, holeColor = '#F7F5F0' }: Props) {
  const s = stationById(stationId);
  const art = useMemo(() => (locked ? null : paintArt(stationId)), [stationId, locked]);
  if (!s?.art) return null;
  const h = Math.round(width * 1.32);
  const frame = locked ? '#D9D4C8' : GOLD;

  // perforated edge: little "holes" in the page color all around
  const holes: ReactElement[] = [];
  for (let x = 6; x <= 194; x += 11) { holes.push(<Circle key={'t' + x} cx={x} cy={0} r={4} fill={holeColor} />, <Circle key={'b' + x} cx={x} cy={264} r={4} fill={holeColor} />); }
  for (let y = 6; y <= 258; y += 11) { holes.push(<Circle key={'l' + y} cx={0} cy={y} r={4} fill={holeColor} />, <Circle key={'r' + y} cx={200} cy={y} r={4} fill={holeColor} />); }

  return (
    <View accessible accessibilityLabel={locked ? `Hidden artwork stamp at ${s.name}` : `${s.art.title} artwork stamp`} style={{ width, height: h }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 264" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={200} height={264} fill={frame} />
        <Rect x={10} y={10} width={180} height={244} rx={4} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeDasharray="4 4" />
        {holes}
      </Svg>
      <View style={{ position: 'absolute', left: '9%', right: '9%', top: '7%', height: '68%', borderRadius: 4, overflow: 'hidden', backgroundColor: locked ? '#EEEBE3' : '#F4EBDD', alignItems: 'center', justifyContent: 'center' }}>
        {art ? (
          <>
            <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">{art}</Svg>
            <Image source={require('@/assets/textures/paper.png')} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />
          </>
        ) : (
          <Svg width={width * 0.2} height={width * 0.2} viewBox="0 0 24 24" fill="none" stroke="#8A94A0" strokeWidth={2.2} strokeLinecap="round">
            <Rect x={5.5} y={11} width={13} height={9} rx={2.5} /><Path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
          </Svg>
        )}
      </View>
      <View style={{ position: 'absolute', left: '9%', right: '9%', bottom: '6%', alignItems: 'center' }}>
        <Text style={{ fontFamily: font.black, fontSize: Math.round(width * 0.04), letterSpacing: 1, color: locked ? '#5A6573' : '#5C4204' }}>ARTWORK STAMP</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.black, fontSize: Math.round(width * 0.085), color: '#1E2A38' }}>{locked ? 'Hidden artwork' : s.art.title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.heavy, fontSize: Math.round(width * 0.05), color: '#3C3427' }}>{locked ? `${s.name} · scan to reveal` : `${s.art.artist} · ${s.name}`}</Text>
      </View>
    </View>
  );
});

/* ------------------------------------------------------------ the paintings */

function paintArt(stationId: string): ReactElement {
  const rng = makeRng(hashString('art:' + stationId));
  let key = 0;
  const coat = (pts: Pt[], fill: string, op = 1, amp = 1.4, stroke?: string) => (
    <G key={key++}>
      <Path d={wobblePath(pts, amp * 1.7, rng)} fill={fill} opacity={op * 0.35} transform="translate(1.2 1)" />
      <Path d={wobblePath(pts, amp, rng)} fill={fill} opacity={op} stroke={stroke} strokeWidth={stroke ? 1.4 : 0} strokeOpacity={0.6} />
    </G>
  );
  const brush = (x1: number, y1: number, x2: number, y2: number, c: string, w: number, op = 1) => (
    <Path key={key++} d={strokePath(rng, x1, y1, x2, y2, 1.2)} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" opacity={op} />
  );
  const note = (x: number, y: number, c: string) => (
    <G key={key++}><Circle cx={x} cy={y} r={4} fill={c} /><Path d={`M${x + 3.6} ${y}V${y - 16}q6 2 8 7`} stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" /></G>
  );

  if (stationId === 'KEN') {
    // Kendall Band: musical sculptures above the tracks — hanging chimes, a big ring, a swinging pendulum.
    return (
      <>
        <Rect x={0} y={0} width={200} height={200} fill="#E8E1D3" />
        {Array.from({ length: 12 }, (_, i) => <Path key={'tile' + i} d={`M0 ${16 * i}H200`} stroke="#7D6A58" strokeWidth={0.6} opacity={0.18} />)}
        {coat(rrectPts(-4, 0, 208, 26, 2), '#2F4E89')}
        {brush(10, 42, 190, 42, '#2B3440', 5)}
        {[[22, 64], [32, 82], [42, 72], [52, 96], [62, 86]].map(([x, len]) => (
          <G key={'ch' + x}>
            <Path d={`M${x} 42V50`} stroke="#2B3440" strokeWidth={1.4} />
            {coat(rrectPts(x - 3.5, 50, 7, len - 10, 3.5, 2), '#A9B8C2', 1, 0.6, '#5A6573')}
            <Rect x={x - 1.5} y={54} width={2} height={len - 20} rx={1} fill="#fff" opacity={0.5} />
          </G>
        ))}
        <Path d="M100 42V58" stroke="#2B3440" strokeWidth={2} />
        <Path d={wobblePath(ellipsePts(100, 92, 30, 30, 20), 1.2, rng)} fill="none" stroke="#C99A4E" strokeWidth={9} />
        <Path d={wobblePath(ellipsePts(100, 92, 30, 30, 20), 1.8, rng)} fill="none" stroke="#F6D58A" strokeWidth={2} opacity={0.8} />
        {brush(146, 42, 166, 118, '#2B3440', 2)}
        {coat(ellipsePts(168, 124, 11, 11, 12), '#E26B60', 1, 0.8, '#9C3830')}
        <Path d="M150 112q8 10 0 20M186 110q-8 10 0 20" stroke="#5A6573" strokeWidth={1.6} fill="none" strokeDasharray="3 3" />
        {note(124, 70, '#5A80C6')}{note(72, 120, '#E26B60')}{note(186, 82, '#4FA874')}
        <Rect x={0} y={150} width={200} height={10} fill="#3A3440" />
        {coat(hillPts(rng, 162, 1.5, 210), '#BDB6AA')}
        <Path d="M-4 166H204" stroke="#F2CF6B" strokeWidth={3} strokeDasharray="10 6" />
        <Path d="M34 182V160" stroke="#2B3440" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={34} cy={158} r={5} fill="#E26B60" />
        <Path d="M170 182V160" stroke="#2B3440" strokeWidth={3} strokeLinecap="round" />
        <Circle cx={170} cy={158} r={5} fill="#E26B60" />
      </>
    );
  }

  if (stationId === 'POR') {
    // Glove Cycle: bronze gloves left along the long escalator, as if dropped by hurrying riders.
    const glove = (x: number, y: number, r: number, sc: number) => (
      <G key={key++} transform={`translate(${x} ${y}) rotate(${r}) scale(${sc})`}>
        <Rect x={0} y={5} width={12} height={11} rx={4} fill="#B8863B" />
        {[0, 3, 6, 9].map((f) => <Rect key={f} x={f} y={0} width={2.6} height={8} rx={1.3} fill="#B8863B" />)}
        <Rect x={-4} y={9} width={5} height={2.6} rx={1.3} fill="#B8863B" />
        <Rect x={2} y={7} width={7} height={2} rx={1} fill="#F6D58A" opacity={0.6} />
      </G>
    );
    return (
      <>
        <Rect x={0} y={0} width={200} height={200} fill="#D9D2C5" />
        <Rect x={0} y={0} width={200} height={30} fill="#5A6573" />
        {[30, 100, 170].map((x) => <Circle key={'l' + x} cx={x} cy={22} r={5} fill="#FFE7A8" />)}
        {coat([[0, 200], [0, 158], [200, 40], [200, 86]], '#9AA6B2', 1, 0.8, '#5A6573')}
        {Array.from({ length: 14 }, (_, i) => <Path key={'st' + i} d={`M${i * 15} ${178 - i * 15 * 0.6}l0 -30`} stroke="#5A6573" strokeWidth={0.8} opacity={0.5} />)}
        <Path d="M0 150L200 32" stroke="#2B3440" strokeWidth={5} strokeLinecap="round" />
        <Path d="M0 196L200 82" stroke="#2B3440" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        {glove(40, 150, -20, 1.4)}{glove(96, 112, 15, 1.2)}{glove(150, 80, -40, 1.1)}
        {glove(24, 176, 60, 1.6)}{glove(130, 160, -10, 1.8)}{glove(170, 120, 35, 1.3)}{glove(70, 182, 110, 1.5)}
      </>
    );
  }

  // Any other artwork: a simple framed placeholder until it gets its own painting.
  return (
    <>
      <Rect x={0} y={0} width={200} height={200} fill="#EADFCB" />
      {coat(rrectPts(40, 40, 120, 120, 8), '#9C5E95', 0.85)}
      {coat(ellipsePts(100, 100, 30, 30), '#E6B23A')}
    </>
  );
}
