import { AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import type { GeminiTurn, Source } from '@/api/gemini';
import { askQuestie, type ChatInput } from '@/api/questie';
import { Questie } from '@/components/Questie';
import { buzz } from '@/lib/haptics';
import { questieSay, stopQuestie, useQuestieSpeaking } from '@/lib/questieVoice';
import { useFeedback } from '@/state/feedback';
import { useGame } from '@/state/game';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

// QUESTIE — voice guide. Hold the mic to ask out loud (audio goes straight to Gemini), or type.
// Answers are spoken in Questie's ElevenLabs voice.

// Small mono recordings in formats Gemini accepts: WAV on iPhone, AAC on Android.
const REC: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { extension: '.aac', outputFormat: 'aac_adts', audioEncoder: 'aac' },
  ios: { extension: '.wav', outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.MEDIUM, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};
const REC_MIME = Platform.OS === 'ios' ? 'audio/wav' : 'audio/aac';

type Msg = { id: number; from: 'questie' | 'rider'; text: string; sources?: Source[]; pending?: boolean; error?: boolean };

const GREETING = 'Hi, I’m Questie, your Red Line buddy! Hold the mic and ask me anything, or type below.';
const SUGGESTIONS = ['What can I do in TQuest?', 'How do I get Legendary cards?', 'Tell me about Kendall Band', 'What’s fun near Park Street?'];

export default function QuestieScreen() {
  const { c } = useAppTheme();
  const { settings } = useFeedback();
  const { cards, points, artFound } = useGame();
  const talking = useQuestieSpeaking();
  const recorder = useAudioRecorder(REC);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'questie', text: GREETING }]);
  const [history, setHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recStart = useRef(0);
  const nextId = useRef(1);
  const scroll = useRef<ScrollViewInstance>(null);
  const canTalk = Platform.OS !== 'web';

  useEffect(() => {
    if (settings.voice) questieSay(GREETING, settings.speechRate);
    return () => stopQuestie();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const riderContext = () => {
    const met = new Set(cards.map((k) => k.stationId)).size;
    const art = Object.keys(artFound).filter((k) => artFound[k]).length;
    return `${cards.length} stamp cards from ${met} of 22 Red Line stations, ${art} artwork stamps, ${points} points.`;
  };

  async function send(inp: ChatInput) {
    if (busy) return;
    stopQuestie();
    const riderId = nextId.current++;
    const replyId = nextId.current++;
    setMsgs((m) => [
      ...m,
      { id: riderId, from: 'rider', text: 'text' in inp ? inp.text : 'Listening to your question…', pending: !('text' in inp) },
      { id: replyId, from: 'questie', text: 'Thinking…', pending: true },
    ]);
    setBusy(true);
    try {
      const { heard, reply, sources } = await askQuestie(history, inp, riderContext());
      const asked = 'text' in inp ? inp.text : heard || '(voice question)';
      setMsgs((m) => m.map((x) => (x.id === riderId ? { ...x, text: asked, pending: false } : x.id === replyId ? { ...x, text: reply, sources, pending: false } : x)));
      setHistory((h): GeminiTurn[] => [...h, { role: 'user' as const, parts: [{ text: asked }] }, { role: 'model' as const, parts: [{ text: reply }] }].slice(-12));
      if (settings.vibration) buzz('tap');
      if (settings.voice) questieSay(reply, settings.speechRate);
    } catch (e) {
      const msg = 'Hmm, I couldn’t reach my brain just now. Check your internet connection and try again.';
      console.warn('[Questie]', String(e));
      setMsgs((m) => m.map((x) => (x.id === riderId ? { ...x, pending: false, text: 'text' in inp ? x.text : '(voice question)' } : x.id === replyId ? { ...x, text: msg, pending: false, error: true } : x)));
      if (settings.vibration) buzz('error');
    }
    setBusy(false);
  }

  async function startTalking() {
    if (busy || recording) return;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMsgs((m) => [...m, { id: nextId.current++, from: 'questie', text: 'I need microphone permission to hear you. You can also type your question.' }]);
      return;
    }
    stopQuestie();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    recStart.current = Date.now();
    setRecording(true);
    if (settings.vibration) buzz('tap');
  }

  async function stopTalking() {
    if (!recording) return;
    setRecording(false);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); // back to loudspeaker for Questie
    if (Date.now() - recStart.current < 600 || !recorder.uri) return; // too short — ignore accidental taps
    const base64 = await new File(recorder.uri).base64();
    send({ audio: { base64, mimeType: REC_MIME } });
  }

  const sendText = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    send({ text: t });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
          <Pressable accessibilityLabel="Close Questie" onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth={2.8} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.black, fontSize: 22, color: c.text }}>Questie</Text>
            <Text style={{ fontFamily: font.heavy, fontSize: 12, color: c.muted }}>Your Red Line guide · Gemini + ElevenLabs</Text>
          </View>
          {talking && (
            <Pressable onPress={stopQuestie} accessibilityLabel="Stop talking"
              style={{ paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: c.card2, justifyContent: 'center' }}>
              <Text style={{ fontFamily: font.black, fontSize: 13, color: c.text }}>STOP</Text>
            </Pressable>
          )}
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Questie size={120} talking={talking} listening={recording} />
          <Text style={{ fontFamily: font.heavy, fontSize: 13, color: recording ? c.redInk : c.muted }}>
            {recording ? 'Listening… let go when you’re done' : busy ? 'Thinking…' : talking ? 'Talking…' : 'Ready'}
          </Text>
        </View>

        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !settings.comfort })}>
          {msgs.map((m) => (
            <View key={m.id} style={{ alignSelf: m.from === 'rider' ? 'flex-end' : 'flex-start', maxWidth: '86%', gap: 4 }}>
              <View style={{
                backgroundColor: m.from === 'rider' ? c.redTint : c.card, borderRadius: 18, padding: 12,
                borderWidth: m.from === 'rider' ? 0 : 2, borderColor: c.line, opacity: m.pending ? 0.7 : 1,
              }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, lineHeight: 23, color: c.text }}>{m.text}</Text>
              </View>
              {m.from === 'questie' && !m.pending && !m.error && m.id !== 0 && (
                <Pressable onPress={() => questieSay(m.text, settings.speechRate)} accessibilityLabel="Hear this again" style={{ alignSelf: 'flex-start' }}>
                  <Text style={{ fontFamily: font.black, fontSize: 12, color: c.blueInk }}>▶ Hear again</Text>
                </Pressable>
              )}
              {m.sources && m.sources.length > 0 && (
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: c.muted }}>
                  Sources:{' '}
                  {m.sources.slice(0, 3).map((s, i) => (
                    <Text key={s.uri} onPress={() => Linking.openURL(s.uri)} style={{ color: c.blueInk, textDecorationLine: 'underline' }}>
                      {i ? ' · ' : ''}{s.title}
                    </Text>
                  ))}
                </Text>
              )}
            </View>
          ))}
          {msgs.length === 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send({ text: s })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: c.blueTint }}>
                  <Text style={{ fontFamily: font.black, fontSize: 13, color: c.blueInk }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 2, borderTopColor: c.line, backgroundColor: c.card }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendText}
            placeholder="Type a question…"
            placeholderTextColor={c.muted}
            returnKeyType="send"
            accessibilityLabel="Type a question for Questie"
            style={{ flex: 1, height: 48, borderRadius: 16, borderWidth: 2, borderColor: c.line, paddingHorizontal: 14, fontFamily: font.bold, fontSize: 16, color: c.text, backgroundColor: c.bg }}
          />
          {input.trim() || !canTalk ? (
            <Pressable onPress={sendText} accessibilityRole="button" accessibilityLabel="Send"
              style={{ height: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.blueBtn, justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: c.blueDeep }}>
              <Text style={{ fontFamily: font.black, fontSize: 15, color: '#fff' }}>SEND</Text>
            </Pressable>
          ) : (
            <Pressable
              onPressIn={startTalking}
              onPressOut={stopTalking}
              accessibilityRole="button"
              accessibilityLabel="Hold to talk to Questie"
              style={{
                width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
                backgroundColor: recording ? c.red : c.redBtn, borderBottomWidth: recording ? 1 : 5, borderBottomColor: c.redDeep,
                transform: [{ scale: recording ? 1.12 : 1 }],
              }}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={9} y={3} width={6} height={11} rx={3} /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </Svg>
            </Pressable>
          )}
        </View>
        {canTalk && !recording && <Text style={{ textAlign: 'center', fontFamily: font.heavy, fontSize: 12, color: c.muted, paddingBottom: 6, backgroundColor: c.card }}>Hold the red button to talk</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
