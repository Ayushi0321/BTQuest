import { memo, useMemo, type ReactElement } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AccessoryShape } from '@/components/Mascot';
import { QR_TARGETS } from '@/data/places';
import { stationById, type Scene } from '@/data/stations';
import { ellipsePts, hillPts, rrectPts, strokePath, wobblePath, type Pt } from '@/lib/paint';
import { between, hashString, makeRng, pick, type Rng } from '@/lib/random';
import { font } from '@/theme/colors';

// A painted gacha stamp card. Everything (pose, scene, time of day, weather, title, number)
// comes from (stationId, seed), so the same card always paints the same way.

export type Rarity = 'C' | 'R' | 'E' | 'L';

export const RARITY: Record<Rarity, { label: string; stars: string; frame: string; deep: string; ink: string }> = {
  C: { label: 'COMMON', stars: '★', frame: '#EFE4D2', deep: '#CDBB9C', ink: '#5C4C36' },
  R: { label: 'RARE', stars: '★★', frame: '#B3C9F0', deep: '#7A96CC', ink: '#22406F' },
  E: { label: 'EPIC', stars: '★★★', frame: '#D3B8E4', deep: '#9F7BBB', ink: '#4F2B66' },
  L: { label: 'LEGENDARY', stars: '★★★★', frame: '#F2CF6B', deep: '#C79A25', ink: '#5C4204' },
};

type Time = 'dawn' | 'day' | 'dusk' | 'night';
type Pose = 'wave' | 'cheer' | 'jump' | 'hold' | 'sleep' | 'dance' | 'point' | 'lean' | 'umbrella';
type Weather = 'leaves' | 'snow' | 'rain' | 'stars' | 'petals' | 'none';
type Fx = 'none' | 'rainbow' | 'fireworks' | 'golden';
// Landmark scenes for QR spots (South Station uses its station scene).
type Landmark = 'mitdome' | 'faneuil' | 'yard' | 'common' | 'esplanade' | 'kendallband' | 'glovecycle';
const LANDMARK_BY_CODE: Record<string, Landmark> = {
  'MIT-DOME': 'mitdome', 'FANEUIL-HALL': 'faneuil', 'HARVARD-YARD': 'yard', 'BOSTON-COMMON': 'common',
  ESPLANADE: 'esplanade', 'ART-KENDALL-BAND': 'kendallband', 'ART-GLOVE-CYCLE': 'glovecycle',
};
const INDOOR: Landmark[] = ['kendallband', 'glovecycle'];
type Prop = 'cup' | 'book' | 'pie' | 'camera' | 'lantern' | 'umbrella' | 'none';

const PAL: Record<Time, Record<string, string>> = {
  dawn: { skyTop: '#F2B8A2', skyBot: '#FBE6C8', sun: '#F7A072', far: '#D8B4C2', ground: '#BFD29C', grass: '#A8C98A', water: '#B4CFE4', bld: '#E8C9B6', bld2: '#D9B3A6', ink: '#8C6458', win: '#FFF2C4', brick: '#D08A6E', dome: '#7FA8A0', trunk: '#8A5E44', stage: '#C46A6E', zzz: '#8C6458' },
  day: { skyTop: '#8EC3E8', skyBot: '#E4F2F7', sun: '#FFDB7A', far: '#B4D4C4', ground: '#A6CF8A', grass: '#94C47A', water: '#86BCE0', bld: '#EADFCB', bld2: '#D7CBB6', ink: '#7D6A58', win: '#BFE0F2', brick: '#C9775A', dome: '#6FA79B', trunk: '#80583F', stage: '#B5565A', zzz: '#5A6573' },
  dusk: { skyTop: '#8A76B6', skyBot: '#F3A47A', sun: '#F7C46C', far: '#A386A6', ground: '#8DA576', grass: '#7E9A6C', water: '#9789BC', bld: '#B79C9C', bld2: '#A08890', ink: '#59465A', win: '#FFD98A', brick: '#9E5E5A', dome: '#5E7F86', trunk: '#5E4238', stage: '#8E4B5E', zzz: '#FFF2E2' },
  night: { skyTop: '#222C55', skyBot: '#46578A', sun: '#F4F0CF', far: '#36426C', ground: '#3C5749', grass: '#36503F', water: '#31447A', bld: '#3E4A6E', bld2: '#353F60', ink: '#1C2340', win: '#FFD36B', brick: '#5E3E4A', dome: '#3E5A62', trunk: '#3A2E2E', stage: '#5A3248', zzz: '#FFF2E2' },
};

const GOLDEN: Record<string, string> = { skyTop: '#F2B45A', skyBot: '#FFE7B0', sun: '#FFF1C9', far: '#E3B98A', ground: '#C9C27A', grass: '#B8BE6E', water: '#E9C27E', bld: '#F1D9B0', bld2: '#E2C49A', ink: '#8A5A22', win: '#FFF4D0', brick: '#D08A5A', dome: '#E6B23A', trunk: '#7A5232', stage: '#C4703E', zzz: '#8A5A22' };

const ARMS: Record<Pose, [string, string]> = {
  wave: ['M17 58q-9 8-7 20', 'M83 56q12-6 14-26'],
  cheer: ['M17 56q-12-6-14-26', 'M83 56q12-6 14-26'],
  jump: ['M17 56q-14-2-18-14', 'M83 56q14-2 18-14'],
  hold: ['M17 60q8 12 22 12', 'M83 60q-8 12-22 12'],
  sleep: ['M17 60q-6 8-2 18', 'M83 60q6 8 2 18'],
  dance: ['M17 58q-14 4-20-6', 'M83 56q12-6 14-26'],
  point: ['M17 58q-9 8-7 20', 'M83 58q14-2 26-12'],
  lean: ['M17 58q-11 2-7 14', 'M83 58q11 2 7 14'],
  umbrella: ['M17 58q-9 8-7 20', 'M83 58q8-8 6-24'],
};
const FACE: Record<Pose, ['open' | 'happy' | 'closed' | 'wink', 'smile' | 'grin' | 'open' | 'tiny']> = {
  wave: ['open', 'smile'], cheer: ['happy', 'grin'], jump: ['happy', 'open'], hold: ['open', 'smile'], sleep: ['closed', 'tiny'],
  dance: ['wink', 'grin'], point: ['open', 'open'], lean: ['happy', 'smile'], umbrella: ['open', 'smile'],
};
const POSE_TITLES: Record<Pose, [string, string]> = {
  wave: ['Morning Wave', 'Hello, Rider'], cheer: ['Big Cheer', 'Hooray!'], jump: ['Hop!', 'Mind the Gap'], hold: ['Cozy Break', 'Little Snack'],
  sleep: ['Nap Stop', 'Dozing Off'], dance: ['Platform Dance', 'Shimmy'], point: ['Look, a Train!', 'Over There!'], lean: ['Just Chillin’', 'Waiting Game'],
  umbrella: ['Rainy Day', 'Puddle Hop'],
};
const TIME_NAME: Record<Time, string> = { dawn: 'Dawn', day: 'Midday', dusk: 'Dusk', night: 'Night' };
const SCENE_NAME: Record<Scene, string> = { river: 'by the river', park: 'in the park', city: 'downtown', campus: 'on campus', tower: 'by the clock tower', shore: 'by the shore', theatre: 'at the show' };
const BODY: Record<string, [number, number, number, number, number]> = { car: [14, 22, 72, 62, 22], round: [14, 20, 72, 66, 33], tall: [20, 14, 60, 72, 26], bean: [12, 26, 76, 58, 29] };

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
}

/** The text facts of a card (title, caption, number) plus what to paint. Same inputs → same card. */
export function describeCard(stationId: string, seed: number, rarity: Rarity = 'C', placeCode?: string) {
  const s = stationById(stationId);
  const rng = makeRng(hashString(stationId + ':' + seed));
  const time = pick<Time>(rng, ['dawn', 'day', 'day', 'dusk', 'night']);
  let pose = pick<Pose>(rng, ['wave', 'cheer', 'jump', 'hold', 'sleep', 'dance', 'point', 'lean']);
  let weather = pick<Weather>(rng, ['leaves', 'leaves', 'leaves', 'none', 'rain', 'snow']);
  if (weather === 'none' && time === 'night') weather = 'stars';
  if (weather === 'rain') pose = 'umbrella';
  if (pose === 'sleep' && time === 'day' && rng() < 0.5) pose = 'lean';
  let prop: Prop = pose === 'hold' ? (time === 'night' ? 'lantern' : pick<Prop>(rng, ['cup', 'book', 'pie', 'camera'])) : pose === 'umbrella' ? 'umbrella' : 'none';

  // Rarer cards unlock special skies (own random stream, so the base look stays the same).
  const fr = makeRng(hashString('fx:' + stationId + ':' + seed));
  let fx: Fx = 'none';
  if (rarity === 'R' && fr() < 0.45) fx = 'rainbow';
  if (rarity === 'E') fx = time === 'night' ? 'fireworks' : pick<Fx>(fr, ['rainbow', 'rainbow', 'none']);
  if (rarity === 'L') fx = time === 'night' ? 'fireworks' : 'golden';
  if (rarity === 'E' && time !== 'night' && fr() < 0.4) { weather = 'petals'; if (pose === 'umbrella') { pose = 'wave'; prop = 'none'; } }
  if (fx === 'rainbow' && weather === 'snow') weather = 'none';

  const landmark: Landmark | undefined = placeCode ? LANDMARK_BY_CODE[placeCode] : undefined;
  const indoor = !!landmark && INDOOR.includes(landmark);
  if (indoor) {
    weather = 'none';
    fx = 'none';
    if (pose === 'umbrella') { pose = 'wave'; prop = 'none'; }
  }
  const placeName = placeCode ? QR_TARGETS.find((t) => t.code === placeCode)?.name : undefined;
  const scene: Scene = s?.scene ?? 'city';
  const title = POSE_TITLES[pose][hashString(String(seed)) % 2];
  const no = String(1 + (hashString(stationId + seed) % 999)).padStart(3, '0');
  const timeName = fx === 'golden' ? 'Golden hour' : TIME_NAME[time];
  const where = placeName ? (indoor ? `on the platform at ${placeName}` : `${timeName} at ${placeName}`) : `${timeName} ${SCENE_NAME[scene]}`;
  return { time, pose, weather, prop, fx, scene, landmark, indoor, title, no, caption: `${s?.mascot ?? ''} · ${where}` };
}

type Props = { stationId: string; seed: number; rarity: Rarity; placeCode?: string; width?: number; compact?: boolean };

export const StampCard = memo(function StampCard({ stationId, seed, rarity, placeCode, width = 240, compact = false }: Props) {
  const s = stationById(stationId);
  const R = RARITY[rarity];
  const art = useMemo(() => paint(stationId, seed, rarity, placeCode), [stationId, seed, rarity, placeCode]);
  if (!s) return null;

  const pad = Math.round(width * 0.04);
  const height = Math.round(width * (compact ? 1.12 : 1.4));
  const tagFs = Math.max(8, Math.round(width * (compact ? 0.075 : 0.042)));

  return (
    <View
      accessible
      accessibilityLabel={`${s.mascot} stamp card, ${art.title}, ${R.label.toLowerCase()}`}
      style={{ width, height, padding: pad, gap: pad, borderRadius: width * 0.075, backgroundColor: R.frame, borderBottomWidth: Math.max(3, width * 0.022), borderBottomColor: R.deep }}>
      <View style={{ flex: 1, borderRadius: width * 0.05, overflow: 'hidden', backgroundColor: '#F4EBDD' }}>
        <Svg width="100%" height="100%" viewBox="0 0 200 220" preserveAspectRatio="xMidYMid slice">
          {art.svg}
        </Svg>
        <Image source={require('@/assets/textures/paper.png')} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />
        {(rarity === 'E' || rarity === 'L') && (
          <View pointerEvents="none" style={{ position: 'absolute', top: '-30%', bottom: '-30%', left: '38%', width: '18%', backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '22deg' }] }} />
        )}
        <View style={{ position: 'absolute', left: width * 0.03, top: width * 0.03, backgroundColor: R.frame, borderRadius: 99, paddingHorizontal: width * 0.035, paddingVertical: width * 0.012 }}>
          <Text style={{ fontFamily: font.black, fontSize: tagFs, letterSpacing: 0.6, color: R.ink }}>{compact ? R.stars : R.label}</Text>
        </View>
        {!compact && (
          <View style={{ position: 'absolute', right: width * 0.03, top: width * 0.03, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 99, paddingHorizontal: width * 0.035, paddingVertical: width * 0.012 }}>
            <Text style={{ fontFamily: font.black, fontSize: tagFs, color: '#3C3427' }}>No. {art.no}</Text>
          </View>
        )}
      </View>
      {!compact && (
        <View style={{ paddingHorizontal: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.black, fontSize: Math.round(width * 0.07), color: R.ink }}>{art.title}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.heavy, fontSize: Math.round(width * 0.048), color: R.ink, opacity: 0.85 }}>{art.caption}</Text>
            <Text style={{ fontFamily: font.heavy, fontSize: Math.round(width * 0.048), color: R.ink }}>{R.stars}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

/* ---------------------------------------------------------------- painting */

function paint(stationId: string, seed: number, rarity: Rarity, placeCode?: string) {
  const s = stationById(stationId)!;
  const d = describeCard(stationId, seed, rarity, placeCode);
  const rng: Rng = makeRng(hashString('paint:' + stationId + ':' + seed));
  const p = d.fx === 'golden' ? GOLDEN : PAL[d.time];
  const autumn = ['#E08A3C', '#D9634A', '#E8B34A'];
  const greens = d.time === 'night' ? ['#2F5A44', '#3B6B50', '#284C3B'] : ['#6FAF6B', '#88BE6E', '#5E9C64'];
  const trees = d.weather === 'leaves' ? autumn : greens;
  const lm = d.landmark;
  const groundFill = d.indoor ? (d.time === 'night' ? '#4A4F66' : '#BDB6AA') : lm === 'faneuil' || lm === 'mitdome' ? (d.time === 'night' ? '#4A4F66' : '#CFC6B8') : lm ? p.grass : d.scene === 'shore' ? (d.time === 'night' ? '#6E6650' : '#E6D3A3') : ['city', 'tower', 'theatre'].includes(d.scene) ? (d.time === 'night' ? '#4A4F66' : '#CFC6B8') : p.ground;

  // Draw a shape twice with different wobble: a solid coat and a lighter, slightly shifted wash.
  let key = 0;
  const coat = (pts: Pt[], fill: string, opts: { amp?: number; op?: number; wash?: number; stroke?: string; sw?: number } = {}) => {
    const amp = opts.amp ?? 1.6;
    return (
      <G key={key++}>
        <Path d={wobblePath(pts, amp * 1.6, rng)} fill={fill} opacity={(opts.op ?? 1) * (opts.wash ?? 0.35)} transform={`translate(${between(rng, -1.5, 1.5).toFixed(1)} ${between(rng, -1.5, 1.5).toFixed(1)})`} />
        <Path d={wobblePath(pts, amp, rng)} fill={fill} opacity={opts.op ?? 1} stroke={opts.stroke} strokeWidth={opts.sw} strokeOpacity={0.6} />
      </G>
    );
  };
  const brush = (x1: number, y1: number, x2: number, y2: number, color: string, w: number, op = 1) => (
    <Path key={key++} d={strokePath(rng, x1, y1, x2, y2)} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={op} />
  );

  const sunX = between(rng, 30, 170);
  const sunY = d.time === 'night' ? 30 : d.time === 'day' ? 34 : 58;

  // sky wash with a soft wavy lower edge
  const skyPts: Pt[] = [[-10, -10], [210, -10]];
  for (let x = 210; x >= -10; x -= 20) skyPts.push([x, 96 + Math.sin(x / 30) * 10 + between(rng, -4, 4)]);

  const sceneEls: ReactElement[] = [];
  const drawLandmark = (l: Landmark) => {
    const stroke = { stroke: p.ink, sw: 1.4, amp: 1 };
    const night = d.time === 'night';
    if (l === 'mitdome') {
      const domeC = night ? '#4E5D78' : '#B7C2CA';
      sceneEls.push(coat(rrectPts(8, 104, 184, 70, 2), p.bld, stroke));
      sceneEls.push(coat(ellipsePts(100, 54, 32, 28, 18).filter((pt) => pt[1] <= 54), domeC, { ...stroke, amp: 0.8 }));
      sceneEls.push(coat(rrectPts(70, 52, 60, 22, 3), p.bld2, stroke));
      sceneEls.push(<Rect key={key++} x={96} y={20} width={8} height={8} rx={2} fill={p.bld2} stroke={p.ink} strokeWidth={1} />);
      sceneEls.push(coat([[30, 92], [100, 70], [170, 92]], p.bld, { ...stroke, amp: 0.6 }));
      sceneEls.push(coat(rrectPts(28, 90, 144, 14, 2), p.bld2, stroke));
      for (let i = 0; i < 8; i++) sceneEls.push(<Rect key={key++} x={34 + i * 18} y={106} width={7} height={56} rx={2} fill="#F4EBDD" stroke={p.ink} strokeWidth={0.8} opacity={0.95} />);
      for (const y of [166, 171]) sceneEls.push(brush(14, y, 186, y, p.ink, 1.4, 0.5));
    } else if (l === 'faneuil') {
      sceneEls.push(coat([[-6, 102], [100, 84], [206, 102]], night ? '#3A3440' : '#6B5A55', { ...stroke, amp: 0.6 }));
      sceneEls.push(coat(rrectPts(-6, 100, 212, 76, 2), p.brick, stroke));
      for (const wy of [110, 140]) for (let wx = 6; wx < 196; wx += 22) sceneEls.push(<Rect key={key++} x={wx} y={wy} width={11} height={18} rx={5.5} fill={night ? p.win : '#FFF6E6'} stroke="#F4EBDD" strokeWidth={1.5} />);
      sceneEls.push(coat(rrectPts(88, 58, 24, 28, 2), '#F4EBDD', { ...stroke, amp: 0.6 }));
      sceneEls.push(coat(ellipsePts(100, 58, 13, 11, 12).filter((pt) => pt[1] <= 58), night ? '#5E7F86' : '#9FC1B4', { amp: 0.5 }));
      sceneEls.push(brush(100, 47, 100, 34, p.ink, 1.6));
      // the famous grasshopper weathervane
      sceneEls.push(<G key={key++}><Ellipse cx={100} cy={32} rx={7} ry={2.6} fill="#E6B23A" /><Path d="M96 33l-2 4M102 33l3 4M106 31l3-3" stroke="#B68719" strokeWidth={1.2} strokeLinecap="round" /></G>);
    } else if (l === 'yard') {
      sceneEls.push(coat(rrectPts(28, 98, 144, 60, 2), p.brick, { ...stroke, op: 0.9 }));
      for (const wy of [106, 128]) for (let wx = 36; wx < 166; wx += 16) sceneEls.push(<Rect key={key++} x={wx} y={wy} width={7} height={11} rx={1} fill={p.win} />);
      for (const [tx, ty, r] of [[30, 96, 22], [172, 92, 24]] as [number, number, number][]) {
        sceneEls.push(coat(ellipsePts(tx, ty, r, r), trees[0], { op: 0.9 }));
        sceneEls.push(coat(ellipsePts(tx + r * 0.4, ty + r * 0.3, r * 0.6, r * 0.55), trees[1], { op: 0.85 }));
      }
      for (const x of [8, 166]) {
        sceneEls.push(coat(rrectPts(x, 94, 26, 84, 2), '#B5654A', stroke));
        sceneEls.push(coat(rrectPts(x - 3, 88, 32, 8, 2), '#F4EBDD', { ...stroke, amp: 0.5 }));
      }
      sceneEls.push(<Path key={key++} d="M34 108Q100 58 166 108M34 116Q100 70 166 116" stroke="#2B3440" strokeWidth={2.6} fill="none" />);
      sceneEls.push(<Circle key={key++} cx={100} cy={70} r={4.5} fill="#E6B23A" stroke="#2B3440" strokeWidth={1.2} />);
      for (const x of [40, 48, 56, 144, 152, 160]) sceneEls.push(brush(x, 112, x, 172, '#2B3440', 1.6));
    } else if (l === 'common') {
      sceneEls.push(coat(hillPts(rng, 132, 5, 190), p.grass));
      sceneEls.push(coat(rrectPts(52, 98, 96, 40, 2), p.brick, stroke));
      for (let i = 0; i < 6; i++) sceneEls.push(<Rect key={key++} x={62 + i * 14} y={100} width={5} height={30} rx={1.5} fill="#F4EBDD" />);
      sceneEls.push(coat([[58, 98], [100, 84], [142, 98]], '#F4EBDD', { ...stroke, amp: 0.5 }));
      sceneEls.push(coat(rrectPts(80, 72, 40, 13, 2), '#F4EBDD', { ...stroke, amp: 0.5 }));
      sceneEls.push(coat(ellipsePts(100, 73, 22, 20, 16).filter((pt) => pt[1] <= 73), '#E6B23A', { stroke: '#B68719', sw: 1.4, amp: 0.6 }));
      sceneEls.push(<Rect key={key++} x={97} y={46} width={6} height={8} rx={2} fill="#E6B23A" stroke="#B68719" strokeWidth={1} />);
      for (const [tx, ty, r] of [[22, 112, 20], [182, 108, 22]] as [number, number, number][]) {
        sceneEls.push(coat(rrectPts(tx - 3, ty + 4, 6, 40, 2), p.trunk, { amp: 0.6 }));
        sceneEls.push(coat(ellipsePts(tx, ty, r, r), trees[1], { op: 0.92 }));
        sceneEls.push(coat(ellipsePts(tx - r * 0.4, ty + r * 0.3, r * 0.6, r * 0.55), trees[0], { op: 0.85 }));
      }
    } else if (l === 'esplanade') {
      for (const [x, h] of [[100, 18], [116, 26], [128, 14], [146, 30], [162, 20], [178, 24], [192, 16]]) sceneEls.push(coat(rrectPts(x, 126 - h, 12, h, 1), p.far, { op: 0.75, amp: 0.6 }));
      sceneEls.push(coat(hillPts(rng, 128, 2, 162), p.water));
      for (const [x, y, l2] of [[90, 140, 24], [140, 150, 30], [110, 156, 18]]) sceneEls.push(brush(x, y, x + l2, y, '#fff', 2, 0.55));
      for (const [bx2, by2] of [[146, 132], [180, 140]] as [number, number][]) {
        sceneEls.push(coat([[bx2 - 10, by2], [bx2 + 10, by2], [bx2 + 6, by2 + 5], [bx2 - 6, by2 + 5]], p.ink, { amp: 0.3 }));
        sceneEls.push(coat([[bx2, by2 - 1], [bx2, by2 - 22], [bx2 + 11, by2 - 1]], '#FFF8E6', { stroke: p.ink, sw: 1, amp: 0.4 }));
      }
      // Hatch Shell
      sceneEls.push(coat(ellipsePts(36, 156, 34, 44, 18).filter((pt) => pt[1] <= 156), '#F4EBDD', stroke));
      sceneEls.push(<Path key={key++} d="M10 156A26 34 0 0 1 62 156M18 156A18 24 0 0 1 54 156" stroke={p.ink} strokeWidth={1.4} fill="none" opacity={0.5} />);
    } else if (l === 'kendallband' || l === 'glovecycle') {
      const wall = night ? '#3E4A6E' : l === 'kendallband' ? '#E8E1D3' : '#D9D2C5';
      sceneEls.push(<Rect key={key++} x={0} y={0} width={200} height={175} fill={wall} />);
      sceneEls.push(<Rect key={key++} x={0} y={0} width={200} height={34} fill={night ? '#2B3440' : '#5A6573'} />);
      for (const x of [30, 100, 170]) sceneEls.push(<Circle key={key++} cx={x} cy={26} r={5} fill="#FFE7A8" />);
      for (let y = 46; y < 150; y += 12) sceneEls.push(<Path key={key++} d={`M0 ${y}H200`} stroke={p.ink} strokeWidth={0.5} opacity={0.18} />);
      sceneEls.push(<Rect key={key++} x={0} y={150} width={200} height={10} fill="#3A3440" />);
      if (l === 'kendallband') {
        sceneEls.push(coat(rrectPts(14, 54, 92, 18, 3), '#2B3440', { amp: 0.5 }));
        sceneEls.push(<SvgText key={key++} x={60} y={67} fontSize={10} fontWeight="900" fill="#fff" textAnchor="middle">KENDALL/MIT</SvgText>);
        sceneEls.push(<Rect key={key++} x={14} y={74} width={92} height={4} fill="#E26B60" />);
        sceneEls.push(brush(136, 62, 198, 62, '#F6D58A', 4));
        sceneEls.push(<Path key={key++} d="M146 62l-6 48M168 62v58M190 62l6 44" stroke={p.ink} strokeWidth={1.6} />);
        sceneEls.push(coat(ellipsePts(140, 114, 8, 8, 10), '#E26B60', { amp: 0.5 }));
        sceneEls.push(coat(ellipsePts(168, 124, 9, 9, 10), '#F6D58A', { amp: 0.5 }));
        sceneEls.push(coat(ellipsePts(196, 110, 7, 7, 10), '#6CC19A', { amp: 0.5 }));
        sceneEls.push(<Path key={key++} d="M24 150V118" stroke="#2B3440" strokeWidth={2.4} />);
        sceneEls.push(<Circle key={key++} cx={24} cy={116} r={4} fill="#E26B60" />);
      } else {
        sceneEls.push(coat([[0, 170], [0, 140], [200, 34], [200, 66]], night ? '#5A6573' : '#9AA6B2', { stroke: p.ink, sw: 1.2, amp: 0.6 }));
        for (let i = 0; i < 12; i++) { const x = i * 18; sceneEls.push(<Path key={key++} d={`M${x} ${158 - x * 0.53}l0 -24`} stroke={p.ink} strokeWidth={0.8} opacity={0.4} />); }
        sceneEls.push(<Path key={key++} d="M0 132L200 26" stroke="#2B3440" strokeWidth={4} strokeLinecap="round" />);
      }
    }
  };

  const sc = d.scene;
  if (lm) {
    drawLandmark(lm);
  } else if (sc === 'river') {
    sceneEls.push(coat(hillPts(rng, 148, 4, 190), p.water));
    for (const [x, y, l] of [[18, 160, 24], [70, 167, 30], [136, 157, 28], [118, 175, 20]]) sceneEls.push(brush(x, y, x + l, y, '#fff', 2, 0.55));
    sceneEls.push(brush(-10, 128, 210, 128, p.ink, 4));
    sceneEls.push(<Path key={key++} d="M8 146Q28 126 48 146M58 146Q78 126 98 146M108 146Q128 126 148 146M158 146Q178 126 198 146" fill="none" stroke={p.ink} strokeWidth={3} />);
    sceneEls.push(coat(rrectPts(44, 106, 9, 22, 2), p.bld, { stroke: p.ink, sw: 1.4, amp: 0.8 }));
    sceneEls.push(coat(rrectPts(146, 106, 9, 22, 2), p.bld, { stroke: p.ink, sw: 1.4, amp: 0.8 }));
  } else if (sc === 'park') {
    sceneEls.push(coat(hillPts(rng, 150, 7, 195), p.grass));
    for (const [tx, ty, r, cs] of [[30, 108, 21, [0, 1, 2]], [170, 100, 24, [1, 0, 2]]] as [number, number, number, number[]][]) {
      sceneEls.push(coat(rrectPts(tx - 3, ty + 4, 6, 42, 2), p.trunk, { amp: 0.6 }));
      sceneEls.push(coat(ellipsePts(tx, ty, r, r * 0.95), trees[cs[0]], { op: 0.92 }));
      sceneEls.push(coat(ellipsePts(tx - r * 0.45, ty + r * 0.35, r * 0.6, r * 0.55), trees[cs[1]], { op: 0.85 }));
      sceneEls.push(coat(ellipsePts(tx + r * 0.4, ty - r * 0.4, r * 0.5, r * 0.5), trees[cs[2]], { op: 0.8 }));
    }
    sceneEls.push(brush(132, 150, 132, 116, p.ink, 2.4));
    sceneEls.push(coat(ellipsePts(132, 114, 4, 4, 8), d.time === 'night' ? '#FFD36B' : p.bld, { amp: 0.4 }));
  } else if (sc === 'city' || sc === 'theatre') {
    const blds: [number, number, number, number, string][] = sc === 'city'
      ? [[-4, 96, 30, 84, p.bld], [22, 118, 26, 62, p.bld2], [148, 104, 28, 76, p.bld2], [172, 84, 32, 96, p.bld]]
      : [[-4, 110, 34, 70, p.bld2]];
    for (const [x, y, w, h, col] of blds) {
      sceneEls.push(coat(rrectPts(x, y, w, h, 2), col, { stroke: p.ink, sw: 1.4, amp: 1 }));
      for (let wy = y + 10; wy < y + h - 14; wy += 14) for (let wx = x + 6; wx < x + w - 6; wx += 10) sceneEls.push(<Rect key={key++} x={wx} y={wy} width={5} height={6} rx={1} fill={p.win} opacity={0.9} />);
    }
    if (sc === 'theatre') {
      sceneEls.push(coat(rrectPts(128, 76, 76, 104, 2), p.stage, { stroke: p.ink, sw: 1.4, amp: 1 }));
      sceneEls.push(coat(rrectPts(120, 110, 88, 16, 3), '#F2CF6B', { stroke: p.ink, sw: 1.4, amp: 0.6 }));
      for (let bx = 128; bx <= 198; bx += 10) sceneEls.push(<Circle key={key++} cx={bx} cy={118} r={2} fill="#fff" />);
      sceneEls.push(<Rect key={key++} x={150} y={84} width={30} height={18} rx={2} fill={p.win} />);
    }
  } else if (sc === 'campus') {
    sceneEls.push(coat(rrectPts(6, 106, 188, 72, 3), p.brick, { stroke: p.ink, sw: 1.4 }));
    sceneEls.push(coat([[6, 106], [100, 88], [194, 106]], p.brick, { stroke: p.ink, sw: 1.4, amp: 0.8 }));
    sceneEls.push(coat(rrectPts(91, 64, 18, 26, 1), '#F4EBDD', { stroke: p.ink, sw: 1.4, amp: 0.6 }));
    sceneEls.push(coat(ellipsePts(100, 64, 12, 12, 12).filter((pt) => pt[1] <= 64), p.dome, { amp: 0.5 }));
    sceneEls.push(brush(100, 52, 100, 40, p.ink, 1.6));
    for (const wx of [16, 34, 52, 140, 158, 176]) for (const wy of [118, 142]) sceneEls.push(<Rect key={key++} x={wx} y={wy} width={8} height={12} rx={1} fill={p.win} />);
  } else if (sc === 'tower') {
    sceneEls.push(coat(rrectPts(4, 122, 40, 58, 2), p.bld2, { stroke: p.ink, sw: 1.4 }));
    sceneEls.push(coat(rrectPts(140, 62, 36, 118, 2), p.bld, { stroke: p.ink, sw: 1.4 }));
    sceneEls.push(coat([[136, 62], [158, 40], [180, 62]], p.dome, { stroke: p.ink, sw: 1.4, amp: 0.6 }));
    sceneEls.push(coat(ellipsePts(158, 86, 11, 11, 12), '#FFF8E6', { stroke: p.ink, sw: 2, amp: 0.5 }));
    sceneEls.push(<Path key={key++} d="M158 86v-7M158 86l5 3" stroke={p.ink} strokeWidth={2} strokeLinecap="round" />);
    for (const [wx, wy] of [[148, 108], [162, 108], [148, 128], [162, 128], [12, 132], [28, 132]]) sceneEls.push(<Rect key={key++} x={wx} y={wy} width={6} height={9} rx={1} fill={p.win} />);
  } else if (sc === 'shore') {
    sceneEls.push(coat(hillPts(rng, 130, 2, 190), p.water));
    for (const [x, y, l] of [[10, 142, 30], [60, 152, 26], [120, 140, 34], [150, 160, 30]]) sceneEls.push(brush(x, y, x + l, y, '#fff', 2, 0.5));
    sceneEls.push(coat([[26, 132], [60, 132], [54, 140], [32, 140]], p.ink, { amp: 0.5 }));
    sceneEls.push(coat([[44, 130], [44, 102], [60, 128]], '#FFF8E6', { stroke: p.ink, sw: 1.2, amp: 0.6 }));
    sceneEls.push(<Path key={key++} d="M136 54q5-5 10 0q5-5 10 0M160 70q4-4 8 0q4-4 8 0" fill="none" stroke={p.ink} strokeWidth={1.8} strokeLinecap="round" />);
  }

  // mascot
  const [bx, by, bw, bh, brx] = BODY[s.shape];
  const bodyInk = shade(s.color, 0.62);
  let dx = 0, dy = 0, rot = 0;
  if (d.pose === 'jump') dy = -16;
  if (d.pose === 'dance') rot = 9;
  if (d.pose === 'lean') rot = -7;
  if (d.pose === 'point') rot = -4;
  if (d.pose === 'sleep') { rot = 8; dy = 3; }
  const [eye, mouth] = rarity === 'L' ? (['star', FACE[d.pose][1]] as const) : FACE[d.pose];
  const scarf = d.weather === 'leaves' ? '#C8743A' : pick(rng, ['#C8743A', '#E26B60', '#5A80C6', '#9C5E95', '#4FA874', '#E6B23A']);
  const umbrella = pick(rng, ['#E26B60', '#5A80C6', '#E6B23A', '#9C5E95']);
  const bodyPts = rrectPts(bx, by, bw, bh, brx, 4);

  const mascot = (
    <G transform={`translate(${55 + dx} ${92 + dy}) scale(0.9) rotate(${rot} 50 60)`}>
      <Circle cx={32} cy={89} r={6} fill="#2B3440" />
      <Circle cx={68} cy={89} r={6} fill="#2B3440" />
      {ARMS[d.pose].map((a, i) => <Path key={'ai' + i} d={a} stroke={bodyInk} strokeWidth={11} strokeLinecap="round" fill="none" opacity={0.55} />)}
      {ARMS[d.pose].map((a, i) => <Path key={'a' + i} d={a} stroke={s.color} strokeWidth={8} strokeLinecap="round" fill="none" />)}
      <Path d={wobblePath(bodyPts, 1.4, rng)} fill={s.color} stroke={bodyInk} strokeWidth={2.2} strokeOpacity={0.7} />
      <Path d={wobblePath(bodyPts, 2.2, rng)} fill="none" stroke={bodyInk} strokeWidth={1} opacity={0.35} transform="translate(1.6 1.2)" />
      <Ellipse cx={50} cy={by + bh - 8} rx={30} ry={9} fill={bodyInk} opacity={0.18} />
      <Path d={`M${bx + 9} ${by + 16}q6-8 16-9`} stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.45} />
      <Path d={wobblePath(rrectPts(26, 34, 48, 26, 11, 3), 0.8, rng)} fill="#FFF6EC" />
      {eye === 'open' && <G><Circle cx={40} cy={45} r={5.5} fill="#1E2A38" /><Circle cx={60} cy={45} r={5.5} fill="#1E2A38" /><Circle cx={41.8} cy={43.2} r={1.8} fill="#fff" /><Circle cx={61.8} cy={43.2} r={1.8} fill="#fff" /></G>}
      {eye === 'happy' && <Path d="M35 47q5-7 10 0M55 47q5-7 10 0" stroke="#1E2A38" strokeWidth={2.8} strokeLinecap="round" fill="none" />}
      {eye === 'closed' && <Path d="M35 46q5 3 10 0M55 46q5 3 10 0" stroke="#1E2A38" strokeWidth={2.6} strokeLinecap="round" fill="none" />}
      {eye === 'wink' && <G><Circle cx={40} cy={45} r={5.5} fill="#1E2A38" /><Circle cx={41.8} cy={43.2} r={1.8} fill="#fff" /><Path d="M55 47q5-7 10 0" stroke="#1E2A38" strokeWidth={2.8} strokeLinecap="round" fill="none" /></G>}
      {eye === 'star' && <Path d="M40 38.5l1.9 4.3 4.6.6-3.4 3.1.9 4.6-4-2.3-4 2.3.9-4.6-3.4-3.1 4.6-.6zM60 38.5l1.9 4.3 4.6.6-3.4 3.1.9 4.6-4-2.3-4 2.3.9-4.6-3.4-3.1 4.6-.6z" fill="#E6B23A" stroke="#8A6614" strokeWidth={0.8} />}
      {mouth === 'smile' && <Path d="M45 52q5 4 10 0" stroke="#1E2A38" strokeWidth={2.6} strokeLinecap="round" fill="none" />}
      {mouth === 'grin' && <Path d="M43 51q7 9 14 0z" fill="#1E2A38" />}
      {mouth === 'open' && <Ellipse cx={50} cy={54} rx={3} ry={3.6} fill="#1E2A38" />}
      {mouth === 'tiny' && <Path d="M47.5 54h5" stroke="#1E2A38" strokeWidth={2.4} strokeLinecap="round" />}
      <Circle cx={31.5} cy={54} r={3.6} fill="#F4A79F" opacity={0.9} />
      <Circle cx={68.5} cy={54} r={3.6} fill="#F4A79F" opacity={0.9} />
      <Path d={wobblePath(rrectPts(18, 64, 64, 9, 4.5, 2), 0.7, rng)} fill={scarf} />
      <Path d={wobblePath(rrectPts(59, 68, 9, 17, 4, 2), 0.5, rng)} fill={scarf} />
      <AccessoryShape kind={s.accessory} />
      {d.prop === 'cup' && <G><Rect x={42} y={64} width={16} height={14} rx={3} fill="#FFF8E6" stroke="#6B5A43" strokeWidth={1.4} /><Path d="M46 60q-2-4 0-7M53 60q-2-4 0-7" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.8} /></G>}
      {d.prop === 'book' && <G><Rect x={37} y={63} width={26} height={17} rx={2} fill="#E26B60" stroke="#9C3830" strokeWidth={1.4} /><Path d="M50 63v17" stroke="#FFF6EC" strokeWidth={1.6} /></G>}
      {d.prop === 'pie' && <G><Path d="M36 74a14 9 0 0 1 28 0z" fill="#E0A85A" stroke="#9A6526" strokeWidth={1.4} /><Path d="M42 70l4-5M50 69v-6M58 70l-4-5" stroke="#9A6526" strokeWidth={1.4} strokeLinecap="round" /></G>}
      {d.prop === 'camera' && <G><Rect x={39} y={64} width={22} height={15} rx={3} fill="#2B3440" /><Circle cx={50} cy={71.5} r={4.5} fill="#8FC1E3" stroke="#fff" strokeWidth={1.4} /></G>}
      {d.prop === 'lantern' && <G><Circle cx={50} cy={71} r={13} fill="#FFD36B" opacity={0.3} /><Rect x={44} y={64} width={12} height={15} rx={3} fill="#FFD36B" stroke="#8A6614" strokeWidth={1.4} /></G>}
      {d.prop === 'umbrella' && <G><Path d="M60 4Q90-26 120 4Q112-2 105 4Q97-2 90 4Q83-2 75 4Q67-2 60 4Z" fill={umbrella} stroke={bodyInk} strokeWidth={1.4} /><Path d="M90 4v30" stroke="#2B3440" strokeWidth={2} /></G>}
      {d.pose === 'sleep' && <G><SvgText x={80} y={18} fontSize={12} fontWeight="900" fill={p.zzz}>z</SvgText><SvgText x={90} y={8} fontSize={16} fontWeight="900" fill={p.zzz}>Z</SvgText></G>}
    </G>
  );

  // weather (foreground)
  const weatherEls: ReactElement[] = [];
  if (d.weather === 'leaves') {
    for (let i = 0; i < 6; i++) {
      weatherEls.push(<Path key={key++} d="M0 0c0-6 4-9 9-9 0 5-3 9-9 9z" fill={autumn[i % 3]} transform={`translate(${between(rng, 8, 192).toFixed(0)} ${between(rng, 10, 200).toFixed(0)}) rotate(${between(rng, 0, 360).toFixed(0)})`} />);
    }
  } else if (d.weather === 'petals') {
    for (let i = 0; i < 10; i++) weatherEls.push(<Ellipse key={key++} cx={0} cy={0} rx={3.2} ry={1.8} fill={i % 2 ? '#F4A7C0' : '#F9C9D8'} transform={`translate(${between(rng, 6, 194).toFixed(0)} ${between(rng, 8, 200).toFixed(0)}) rotate(${between(rng, 0, 180).toFixed(0)})`} />);
  } else if (d.weather === 'snow') {
    for (let i = 0; i < 12; i++) weatherEls.push(<Circle key={key++} cx={between(rng, 6, 194)} cy={between(rng, 8, 150)} r={between(rng, 1.4, 2.8)} fill="#fff" />);
  } else if (d.weather === 'rain') {
    for (let i = 0; i < 12; i++) { const x = between(rng, 6, 194), y = between(rng, 6, 140); weatherEls.push(<Path key={key++} d={`M${x} ${y}l-4 10`} stroke="#CFE3F5" strokeWidth={1.8} strokeLinecap="round" />); }
  }
  if (rarity === 'L' || rarity === 'E') {
    for (const [x, y, r] of [[28, 40, 7], [172, 34, 5.5], [160, 132, 5], [36, 140, 4.5]]) {
      weatherEls.push(<Path key={key++} d={`M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`} fill="#FFF3C4" />);
    }
  }

  const svg = (
    <>
      <Rect x={0} y={0} width={200} height={220} fill={p.skyBot} />
      {coat(skyPts, p.skyTop, { op: 0.9, amp: 3 })}
      {[[8, 34, 90], [112, 52, 194], [18, 74, 82], [120, 88, 172]].map(([x1, y, x2]) => brush(x1, y, x2, y + between(rng, -3, 3), '#fff', 3, 0.22))}
      {coat(ellipsePts(sunX, sunY, 28, 28), p.sun, { op: 0.28, amp: 3 })}
      {coat(ellipsePts(sunX, sunY, 15, 15), p.sun, { op: 0.95, amp: 1.2 })}
      {d.weather === 'stars' && [[22, 20], [58, 44], [96, 16], [130, 38], [182, 24], [74, 70], [150, 66], [10, 62]].map(([x, y], i) => <Circle key={'st' + i} cx={x} cy={y} r={1.3} fill="#FFF6D8" />)}
      {d.fx === 'rainbow' && [['#E26B60', 112], ['#EE9A45', 106], ['#E6B23A', 100], ['#4FA874', 94], ['#5A80C6', 88]].map(([col, r]) => (
        <Path key={'rb' + r} d={`M${100 - (r as number)} 150A${r} ${r} 0 0 1 ${100 + (r as number)} 150`} stroke={col as string} strokeWidth={6} fill="none" opacity={0.45} />
      ))}
      {d.fx === 'fireworks' && [[40, 40, '#F2CF6B'], [150, 30, '#E58BB0'], [112, 66, '#8FD3AA']].map(([fx2, fy, col], i) => (
        <G key={'fw' + i}>
          {Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return <Path key={k} d={`M${(fx2 as number) + Math.cos(a) * 4} ${(fy as number) + Math.sin(a) * 4}L${(fx2 as number) + Math.cos(a) * 15} ${(fy as number) + Math.sin(a) * 15}`} stroke={col as string} strokeWidth={2} strokeLinecap="round" />; })}
          <Circle cx={fx2 as number} cy={fy as number} r={2.5} fill="#fff" />
        </G>
      ))}
      {coat(hillPts(rng, 132, 8, 190), p.far, { op: 0.8, amp: 2 })}
      {sceneEls}
      {coat(hillPts(rng, 172, 3, 235), groundFill, { amp: 1.4 })}
      {(['city', 'tower'].includes(sc) && !lm || d.indoor || lm === 'faneuil') && <Path d="M-10 178C50 172 130 186 210 176" stroke="#F2CF6B" strokeWidth={3} strokeDasharray="10 6" fill="none" opacity={0.85} />}
      {lm === 'glovecycle' && [[30, 182, -20], [160, 186, 30], [176, 120, 60], [60, 150, -50]].map(([gx, gy, gr], i) => (
        <G key={'gl' + i} transform={`translate(${gx} ${gy}) rotate(${gr}) scale(1.3)`}>
          <Rect x={0} y={4} width={10} height={9} rx={3} fill="#B8863B" />
          {[0, 2.6, 5.2, 7.8].map((fx) => <Rect key={fx} x={fx} y={0} width={2.2} height={6} rx={1.1} fill="#B8863B" />)}
          <Rect x={-3} y={7} width={4} height={2.2} rx={1.1} fill="#B8863B" />
        </G>
      ))}
      {(rarity === 'L' || rarity === 'E') && coat(ellipsePts(100, 132, 58, 58), rarity === 'L' ? '#FFE08A' : '#E3C8F2', { op: rarity === 'L' ? 0.75 : 0.65, amp: 4 })}
      <Ellipse cx={100} cy={181} rx={d.pose === 'jump' ? 22 : 34} ry={5} fill="rgba(30,30,40,0.22)" />
      {d.pose === 'jump' && <Path d="M78 196q22 6 44 0M84 204q16 4 32 0" stroke={p.ink} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />}
      {mascot}
      {weatherEls}
      <Path d={wobblePath(rrectPts(1, 1, 198, 218, 6, 2), 2.2, rng)} fill="none" stroke="#F4EBDD" strokeWidth={8} />
    </>
  );

  return { svg, title: d.title, caption: d.caption, no: d.no };
}
