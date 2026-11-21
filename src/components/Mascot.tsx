import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { stationById, type Accessory, type BodyShape } from '@/data/stations';

// One template for every station: body shape + station color + landmark accessory.
// Drawn in a 100×100 box. `frame` wraps it in a round stamp; `locked` shows a grey "?" silhouette.

const SHAPES: Record<BodyShape, [number, number, number, number, number]> = {
  car: [14, 22, 72, 62, 22],
  round: [14, 20, 72, 66, 33],
  tall: [20, 14, 60, 72, 26],
  bean: [12, 26, 76, 58, 29],
};

type Props = {
  stationId: string;
  size?: number;
  locked?: boolean;
  frame?: boolean;
  frameColor?: string;   // daily / seasonal stamp ring
  scarfColor?: string;   // daily / seasonal costume
};

export function Mascot({ stationId, size = 96, locked = false, frame = false, frameColor = '#F5B97A', scarfColor = '#C8743A' }: Props) {
  const s = stationById(stationId);
  if (!s) return null;
  const [bx, by, bw, bh, brx] = SHAPES[s.shape];
  const body = locked ? '#C9CFD6' : s.color;
  const feet = locked ? '#B3BAC2' : '#2B3440';
  const inner = frame ? 'translate(15 14) scale(0.7)' : undefined;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={locked ? 'Locked mascot' : `${s.mascot}, ${s.name} mascot`}>
      {frame && (
        <>
          <Circle cx={50} cy={50} r={49} fill={locked ? '#E3E6EA' : frameColor} />
          <Circle cx={50} cy={50} r={43.5} fill="none" stroke={locked ? '#B8BEC6' : 'rgba(255,255,255,0.8)'} strokeWidth={2.2} strokeDasharray="3 4" />
        </>
      )}
      <G transform={inner}>
        <Circle cx={32} cy={89} r={6} fill={feet} />
        <Circle cx={68} cy={89} r={6} fill={feet} />
        <Rect x={bx} y={by} width={bw} height={bh} rx={brx} fill={body} />
        {!locked && <Ellipse cx={34} cy={by + 9} rx={7} ry={4} fill="rgba(255,255,255,0.28)" />}
        <Rect x={26} y={34} width={48} height={26} rx={11} fill={locked ? '#E8EBEE' : '#FFF6EC'} />
        {locked ? (
          <SvgText x={50} y={55} fontSize={22} fontWeight="900" fill="#8A94A0" textAnchor="middle">?</SvgText>
        ) : (
          <>
            <Circle cx={40} cy={45} r={5.5} fill="#1E2A38" />
            <Circle cx={60} cy={45} r={5.5} fill="#1E2A38" />
            <Circle cx={41.8} cy={43.2} r={1.8} fill="#fff" />
            <Circle cx={61.8} cy={43.2} r={1.8} fill="#fff" />
            <Path d="M45 52q5 4 10 0" fill="none" stroke="#1E2A38" strokeWidth={2.6} strokeLinecap="round" />
            <Circle cx={31.5} cy={54} r={3.4} fill="#F4A79F" />
            <Circle cx={68.5} cy={54} r={3.4} fill="#F4A79F" />
            <Rect x={18} y={64} width={64} height={9} rx={4.5} fill={scarfColor} />
            <Rect x={59} y={68} width={9} height={17} rx={4} fill={scarfColor} />
            <AccessoryShape kind={s.accessory} />
          </>
        )}
      </G>
    </Svg>
  );
}

export function AccessoryShape({ kind }: { kind: Accessory }) {
  switch (kind) {
    case 'grad':
      return (
        <G>
          <Path d="M50 3l30 10-30 10-30-10z" fill="#2B3440" />
          <Rect x={38} y={15} width={24} height={9} rx={2} fill="#2B3440" />
          <Path d="M78 13v12" stroke="#E6B23A" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d="M22 40a28 28 0 0 1 56 0" fill="none" stroke="#2B3440" strokeWidth={5} />
          <Rect x={15} y={34} width={11} height={19} rx={5} fill="#2B3440" />
          <Rect x={74} y={34} width={11} height={19} rx={5} fill="#2B3440" />
        </G>
      );
    case 'antenna':
      return (
        <G>
          <Path d="M50 22V7" stroke="#2B3440" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={50} cy={6} r={5.5} fill="#FFD15C" />
        </G>
      );
    case 'leaf':
      return <Path d="M50 24C49 14 56 6 68 5c-1 11-8 17-18 19z" fill="#4FA874" />;
    case 'clock':
      return (
        <G>
          <Circle cx={50} cy={12} r={10.5} fill="#fff" stroke="#2B3440" strokeWidth={3} />
          <Path d="M50 12V6.5M50 12l4 2.5" stroke="#2B3440" strokeWidth={2.4} strokeLinecap="round" />
        </G>
      );
    case 'tophat':
      return (
        <G>
          <Rect x={35} y={0} width={30} height={20} rx={3} fill="#2B3440" />
          <Rect x={26} y={18} width={48} height={5} rx={2.5} fill="#2B3440" />
          <Rect x={35} y={13} width={30} height={4} fill="#E26B60" />
        </G>
      );
    case 'fin':
      return <Path d="M38 24C42 10 54 2 66 4c-4 7-5 14-4 20z" fill="#3E8F8B" />;
    case 'crown':
      return <Path d="M31 24V8l9.5 7L50 3l9.5 12L69 8v16z" fill="#FFD15C" stroke="#B68719" strokeWidth={1.6} strokeLinejoin="round" />;
    case 'beanie':
      return (
        <G>
          <Path d="M24 27a26 21 0 0 1 52 0z" fill="#5A80C6" />
          <Rect x={22} y={22} width={56} height={7} rx={3.5} fill="#3F65AE" />
          <Circle cx={50} cy={5} r={6} fill="#fff" />
        </G>
      );
    case 'mitten':
      return (
        <G>
          <Rect x={40} y={0} width={20} height={24} rx={9} fill="#C99A4E" />
          <Ellipse cx={38.5} cy={14} rx={5} ry={7} fill="#C99A4E" transform="rotate(-25 38.5 14)" />
        </G>
      );
    case 'cross':
      return (
        <G>
          <Rect x={34} y={8} width={32} height={16} rx={5} fill="#fff" stroke="#D9DDE2" strokeWidth={1.5} />
          <Path d="M50 11v10M45 16h10" stroke="#E26B60" strokeWidth={3.4} strokeLinecap="round" />
        </G>
      );
    case 'star':
      return <Path d="M50 1.5l4.3 8.8 9.7 1.4-7 6.8 1.7 9.6-8.7-4.6-8.7 4.6 1.7-9.6-7-6.8 9.7-1.4z" fill="#FFD15C" stroke="#B68719" strokeWidth={1.4} strokeLinejoin="round" />;
    case 'bow':
      return (
        <G>
          <Path d="M50 14L34 5v18zM50 14l16-9v18z" fill="#E58BB0" />
          <Circle cx={50} cy={14} r={4.5} fill="#C9638E" />
        </G>
      );
  }
}
