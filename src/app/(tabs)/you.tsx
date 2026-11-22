import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, View } from 'react-native';

import { getUsage, hasElevenLabs } from '@/api/elevenlabs';

import { Mascot } from '@/components/Mascot';
import { Button, Card, Kicker, ProgressBar, Screen, T } from '@/components/ui';
import { riderMascot } from '@/data/stations';
import { buzz, type BuzzPattern } from '@/lib/haptics';
import { useAuth } from '@/state/auth';
import { useGame } from '@/state/game';
import { useFeedback, type FeedbackSettings } from '@/state/feedback';
import { font } from '@/theme/colors';
import { useAppTheme, type ThemeMode } from '@/theme/ThemeContext';

// YOU tab — "hear it your way": text, voice, vibration (each testable), speech speed, motion comfort, theme.

const PATTERN_GUIDE: [BuzzPattern, string, string][] = [
  ['nextStop', 'Next stop', 'buzz · buzz'],
  ['yourStop', 'Your stop is next', 'short · short · LONG'],
  ['arrived', 'Arrived at a station', 'LONG · LONG'],
  ['reward', 'New card', 'tap · tap · ding'],
];

export default function You() {
  const { c, mode, setMode } = useAppTheme();
  const { settings, setSetting, announce } = useFeedback();
  const { session, profile, signOut, deleteAccount } = useAuth();
  const { streak } = useGame();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = () => {
    const run = async () => setDeleteError(await deleteAccount());
    const msg = 'This removes your account, cards and points for good.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete account? ${msg}`)) run();
      return;
    }
    Alert.alert('Delete account?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  useFocusEffect(useCallback(() => { getUsage().then(setUsage); }, []));

  const segmented = <V extends string | number>(options: [V, string][], value: V, onChange: (v: V) => void) => (
    <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: 16, padding: 4, gap: 4 }}>
      {options.map(([v, label]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} accessibilityRole="button" accessibilityState={{ selected: value === v }}
          style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: value === v ? c.card : 'transparent' }}>
          <Text style={{ fontFamily: font.black, fontSize: 15, color: value === v ? c.text : c.muted }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const testButton = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ paddingHorizontal: 12, height: 36, borderRadius: 12, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.black, fontSize: 13, color: c.blueInk }}>TEST</Text>
    </Pressable>
  );

  const row = (key: keyof Pick<FeedbackSettings, 'text' | 'voice' | 'vibration' | 'comfort'>, label: string, sub: string, test: (() => void) | null, last = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: last ? 0 : 2, borderBottomColor: c.line }}>
      <View style={{ flex: 1 }}>
        <T size={16} weight="black">{label}</T>
        <T size={13} color={c.muted} style={{ lineHeight: 18 }}>{sub}</T>
      </View>
      {test && settings[key] ? testButton(`Test ${label}`, test) : null}
      <Switch value={settings[key] as boolean} onValueChange={(v) => { setSetting(key, v); }} trackColor={{ true: c.greenBtn, false: c.track }} thumbColor="#fff" accessibilityLabel={label} />
    </View>
  );

  return (
    <Screen title="You">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mascot stationId={riderMascot(profile?.fav_station, profile?.username ?? '')} size={72} frame />
        <View style={{ flex: 1 }}>
          <T size={24} weight="black">Hi, {profile?.username ?? 'rider'}</T>
          <T size={15} color={c.muted}>{session?.user.email}</T>
          {streak > 0 ? <T size={15} weight="black" color={c.orangeInk}>{streak}-day streak</T> : null}
        </View>
      </View>

      <Kicker>Hear it your way</Kicker>
      <Card style={{ paddingVertical: 4 }}>
        {row('text', 'On-screen text', 'Big banner at the top of the screen', () =>
          announce({ kind: 'next', text: 'Kendall/MIT', voice: false }))}
        {row('voice', 'Voice', 'Spoken stop announcements', () =>
          announce({ kind: 'next', text: 'Kendall/MIT', speak: 'Next stop: Kendall MIT.', banner: false }))}
        {row('vibration', 'Vibration', 'A different buzz for each kind of alert — no need to look', () => buzz('yourStop'), true)}
      </Card>
      <T size={12} color={c.muted} style={{ marginTop: -6 }}>At least one of these stays on, so you never miss your stop. Screen readers always get every announcement.</T>

      {settings.voice && (
        <>
          <Kicker>Voice speed</Kicker>
          {segmented<number>([[0.8, 'Slow'], [1, 'Normal'], [1.15, 'Fast']], settings.speechRate, (v) => setSetting('speechRate', v))}
          {hasElevenLabs() && (
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <T size={16} weight="black">Questie’s premium voice</T>
                  <T size={13} color={c.muted} style={{ lineHeight: 18 }}>ElevenLabs voice. Off = the phone’s voice (free). Turn off while testing, on for the demo.</T>
                </View>
                <Switch value={settings.premiumVoice} onValueChange={(v) => { setSetting('premiumVoice', v); }} trackColor={{ true: c.greenBtn, false: c.track }} thumbColor="#fff" accessibilityLabel="Questie's premium voice" />
              </View>
              {usage && (
                <>
                  <ProgressBar value={usage.used / usage.limit} color={usage.used >= usage.limit ? c.orange : c.gold} height={10} />
                  <T size={12} color={c.muted}>
                    {usage.used >= usage.limit
                      ? `Today’s budget is used up (${usage.limit} characters) — Questie uses the phone voice until tomorrow.`
                      : `${usage.used} / ${usage.limit} characters used today · replays are free`}
                  </T>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {settings.vibration && (
        <>
          <Kicker>Vibration patterns · tap to feel</Kicker>
          <Card style={{ paddingVertical: 4 }}>
            {PATTERN_GUIDE.map(([p, label, shape], i) => (
              <Pressable key={p} onPress={() => buzz(p)} accessibilityRole="button" accessibilityLabel={`Feel the ${label} pattern`}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i === PATTERN_GUIDE.length - 1 ? 0 : 2, borderBottomColor: c.line }}>
                <T size={15} weight="black" style={{ flex: 1 }}>{label}</T>
                <T size={14} weight="heavy" color={c.orangeInk}>{shape}</T>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      <Kicker>Comfort</Kicker>
      <Card style={{ paddingVertical: 4 }}>
        {row('comfort', 'Motion comfort mode', 'For riders who feel queasy reading on the train: one calm screen, no animations. Voice and buzz lead.', null, true)}
      </Card>

      <Kicker>Appearance</Kicker>
      {segmented<ThemeMode>([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], mode, setMode)}

      <Kicker>Account</Kicker>
      <Button label="Log out" kind="plain" onPress={signOut} />
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={{ alignSelf: 'center', padding: 8 }}>
        <T size={15} weight="black" color={c.redInk}>Delete account</T>
      </Pressable>
      {deleteError ? <T size={14} color={c.redInk}>{deleteError}</T> : null}
    </Screen>
  );
}
