import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { artHistory, type ArtHistory } from '@/api/questie';
import { ArtStamp } from '@/components/ArtStamp';
import { Questie } from '@/components/Questie';
import { Button, Card, Kicker, Screen, T } from '@/components/ui';
import { stationById } from '@/data/stations';
import { questieSay, stopQuestie, useQuestieSpeaking } from '@/lib/questieVoice';
import { useFeedback } from '@/state/feedback';
import { useGame } from '@/state/game';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// ARTWORK page: the artwork stamp + its real history (Gemini with Google Search grounding),
// read aloud by Questie every time the rider taps the stamp. Sources are listed underneath.
export default function ArtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useAppTheme();
  const { artFound } = useGame();
  const { settings } = useFeedback();
  const talking = useQuestieSpeaking();
  const s = stationById(id ?? '');
  const [history, setHistory] = useState<ArtHistory | null>(null);
  const [error, setError] = useState('');

  const found = !!(s && artFound[s.id]);

  const play = useCallback((text: string) => {
    if (settings.voice) questieSay(text, settings.speechRate);
  }, [settings.voice, settings.speechRate]);

  useEffect(() => {
    if (!s?.art || !found) return;
    let alive = true;
    artHistory({ title: s.art.title, artist: s.art.artist, stationName: s.name })
      .then((h) => { if (!alive) return; setHistory(h); play(h.text); })
      .catch((e) => { if (alive) setError(String(e)); });
    return () => { alive = false; stopQuestie(); };
  }, [s, found, play]);

  if (!s?.art) return null;

  const back = (
    <Pressable accessibilityLabel="Back" onPress={() => router.back()}
      style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
    </Pressable>
  );

  return (
    <Screen title={s.art.title} right={back} questie={false}>
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={() => history && play(history.text)} disabled={!found} accessibilityRole="button" accessibilityHint="Questie tells the story of this artwork">
          <ArtStamp stationId={s.id} width={240} locked={!found} holeColor={c.bg} />
        </Pressable>
        {found && <T size={13} weight="heavy" color={c.muted} style={{ marginTop: 8 }}>Tap the stamp to hear the story again</T>}
      </View>

      {!found ? (
        <Card>
          <T size={16} weight="black">Find it at {s.name} and scan its TQuest code to unlock this stamp and its story.</T>
          <Button label="Open the scanner" kind="gold" style={{ marginTop: 12 }} onPress={() => router.navigate('/scan')} />
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Questie size={56} talking={talking} />
            <View style={{ flex: 1 }}>
              <Kicker color={c.goldInk}>The story · told by Questie</Kicker>
              <T size={14} color={c.muted}>{s.art.artist} · {s.name} station</T>
            </View>
          </View>
          {history ? (
            <>
              <T size={17} style={{ lineHeight: 26 }}>{history.text}</T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button label={talking ? 'Stop' : 'Listen again'} kind={talking ? 'plain' : 'blue'} style={{ flex: 1 }} onPress={() => (talking ? stopQuestie() : play(history.text))} />
              </View>
              {history.sources.length > 0 && (
                <View style={{ marginTop: 14, gap: 4 }}>
                  <Kicker>Sources</Kicker>
                  {history.sources.slice(0, 4).map((src) => (
                    <Text key={src.uri} onPress={() => Linking.openURL(src.uri)} style={{ fontFamily: font.heavy, fontSize: 13, color: c.blueInk, textDecorationLine: 'underline' }}>{src.title}</Text>
                  ))}
                </View>
              )}
            </>
          ) : error ? (
            <>
              <T size={15} color={c.muted}>Questie couldn’t look this up right now. Check your internet connection and try again.</T>
              <Button label="Try again" kind="plain" style={{ marginTop: 10 }} onPress={() => { setError(''); router.replace({ pathname: '/art/[id]', params: { id: s.id } }); }} />
            </>
          ) : (
            <T size={15} color={c.muted} style={{ fontStyle: 'italic' }}>Questie is looking up the story…</T>
          )}
        </Card>
      )}
    </Screen>
  );
}
