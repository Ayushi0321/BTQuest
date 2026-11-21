import { useEffect, useState } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

// QUESTIE — TQuest's main mascot and voice guide: a gold subway-token buddy
// with a conductor cap and a headset mic. The mouth moves while `talking` is true.

export function Questie({ size = 96, talking = false, listening = false }: { size?: number; talking?: boolean; listening?: boolean }) {
  const [mouth, setMouth] = useState(0);

  useEffect(() => {
    if (!talking) { setMouth(0); return; }
    const t = setInterval(() => setMouth(0.25 + Math.random() * 0.75), 130);
    return () => clearInterval(t);
  }, [talking]);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={talking ? 'Questie is talking' : listening ? 'Questie is listening' : 'Questie'}>
      {/* sound waves while talking / listening */}
      {(talking || listening) && (
        <G stroke={listening ? '#E26B60' : '#5A80C6'} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8}>
          <Path d="M88 44q5 8 0 16" />
          <Path d="M94 39q8 13 0 26" opacity={0.6} />
          <Path d="M12 44q-5 8 0 16" />
          <Path d="M6 39q-8 13 0 26" opacity={0.6} />
        </G>
      )}
      {/* token body */}
      <Circle cx={50} cy={57} r={38} fill="#E6B23A" />
      <Circle cx={50} cy={57} r={38} fill="none" stroke="#B68719" strokeWidth={3} />
      <Circle cx={50} cy={57} r={31} fill="none" stroke="#F6D58A" strokeWidth={2.4} strokeDasharray="4 4" />
      <Ellipse cx={34} cy={40} rx={8} ry={4} fill="#fff" opacity={0.35} transform="rotate(-30 34 40)" />
      {/* face */}
      <Ellipse cx={50} cy={62} rx={24} ry={17} fill="#FFF6EC" />
      <Ellipse cx={41} cy={58} rx={4.6} ry={5.6} fill="#1E2A38" />
      <Ellipse cx={59} cy={58} rx={4.6} ry={5.6} fill="#1E2A38" />
      <Circle cx={42.6} cy={56} r={1.7} fill="#fff" />
      <Circle cx={60.6} cy={56} r={1.7} fill="#fff" />
      <Circle cx={33} cy={66} r={3.6} fill="#F4A79F" opacity={0.9} />
      <Circle cx={67} cy={66} r={3.6} fill="#F4A79F" opacity={0.9} />
      {mouth > 0 ? (
        <Ellipse cx={50} cy={69} rx={4 + mouth * 2} ry={1.5 + mouth * 4} fill="#1E2A38" />
      ) : (
        <Path d="M44 67q6 6 12 0" stroke="#1E2A38" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      )}
      {/* conductor cap */}
      <Path d="M24 30Q26 12 50 10Q74 12 76 30Z" fill="#2B3440" />
      <Rect x={24} y={26} width={52} height={7} rx={3} fill="#E26B60" />
      <Path d="M22 33Q50 42 78 33L76 30Q50 37 24 30Z" fill="#1E2530" />
      <Path d="M50 14l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7z" fill="#E6B23A" />
      {/* headset mic */}
      <Path d="M16 56q0-10 8-14" stroke="#2B3440" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Rect x={11} y={52} width={8} height={12} rx={4} fill="#2B3440" />
      <Path d="M15 64q2 10 18 9" stroke="#2B3440" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Circle cx={34} cy={73} r={2.8} fill={listening ? '#E26B60' : '#2B3440'} />
    </Svg>
  );
}
