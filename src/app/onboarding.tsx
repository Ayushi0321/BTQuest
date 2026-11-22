import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AuthLayout, FormError } from '@/components/AuthLayout';
import { QuestieBubble } from '@/components/QuestieBubble';
import { Button, Kicker, T } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useFeedback } from '@/state/feedback';
import { useAppTheme } from '@/theme/ThemeContext';

type Key = 'text' | 'voice' | 'vibration' | 'comfort';

function Icon({ kind, color }: { kind: Key; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {kind === 'text' && <Path d="M4 7h16M4 12h16M4 17h10" {...p} />}
      {kind === 'voice' && <><Path d="M4 10v4h4l5 4V6L8 10H4z" {...p} /><Path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" {...p} /></>}
      {kind === 'vibration' && <><Rect x={8} y={4} width={8} height={16} rx={2} {...p} /><Path d="M4 9v6M20 9v6" {...p} /></>}
      {kind === 'comfort' && <Path d="M4 10q2-2 4 0t4 0 4 0 4 0M4 15q2-2 4 0t4 0 4 0 4 0" {...p} />}
    </Svg>
  );
}

function Option({ on, onPress, icon, iconBg, title, sub }: { on: boolean; onPress: () => void; icon: ReactNode; iconBg: string; title: string; sub: string }) {
  const { c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${title}. ${sub}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: 2, borderBottomWidth: 5,
        borderColor: on ? c.blue : c.line, borderBottomColor: on ? c.blue : c.cardShadow, backgroundColor: on ? c.blueTint : c.card }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T size={17} weight="black">{title}</T>
        <T size={14} color={c.muted} style={{ lineHeight: 19 }}>{sub}</T>
      </View>
      <View style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: on ? c.blueBtn : c.line, backgroundColor: on ? c.blueBtn : c.card, alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
      </View>
    </Pressable>
  );
}

export default function Onboarding() {
  const { c } = useAppTheme();
  const { settings, applySettings } = useFeedback();
  const { savePrefs } = useAuth();
  const [pick, setPick] = useState<Record<Key, boolean>>({ text: settings.text, voice: settings.voice, vibration: settings.vibration, comfort: settings.comfort });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (k: Key) => setPick((p) => ({ ...p, [k]: !p[k] }));
  const anyChannel = pick.text || pick.voice || pick.vibration;

  const submit = async () => {
    setBusy(true);
    applySettings(pick);
    const err = await savePrefs({ ...pick, speechRate: settings.speechRate, onboarded: true });
    setError(err);
    setBusy(false);
  };

  return (
    <AuthLayout
      back={false}
      progress={1}
      footer={
        <>
          <T size={14} color={c.muted} style={{ textAlign: 'center' }}>{anyChannel ? 'You can change these anytime in You.' : 'Pick at least one so you never miss your stop.'}</T>
          <Button label={busy ? 'Saving…' : 'Continue'} kind="green" disabled={busy || !anyChannel} onPress={submit} />
        </>
      }>
      <QuestieBubble text="How should I tell you your stop is coming? Pick as many as you like." />
      <Option on={pick.text} onPress={() => toggle('text')} icon={<Icon kind="text" color={c.blueInk} />} iconBg={c.blueTint} title="On-screen text" sub="Big, glanceable stop names" />
      <Option on={pick.voice} onPress={() => toggle('voice')} icon={<Icon kind="voice" color={c.redInk} />} iconBg={c.redTint} title="Voice" sub="Questie announces stops in your earbuds" />
      <Option on={pick.vibration} onPress={() => toggle('vibration')} icon={<Icon kind="vibration" color={c.orangeInk} />} iconBg={c.orangeTint} title="Vibration" sub="A distinct buzz when your stop is next" />
      <Kicker>Comfort</Kicker>
      <Option on={pick.comfort} onPress={() => toggle('comfort')} icon={<Icon kind="comfort" color={c.greenInk} />} iconBg={c.greenTint} title="Phones make me queasy on trains" sub="Keep the screen calm while moving. Voice and buzz lead." />
      <FormError text={error} />
    </AuthLayout>
  );
}
