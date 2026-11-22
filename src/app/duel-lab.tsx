// /duel-lab — try every painted duel step on its own, with demo cards and no opponent needed.
// Safe to delete before shipping.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChargePhase, ClashArena, DuelInvite, DuelMatchmaker, DuelResult, HandPicker, ScorePill, makeFighter,
  type DuelCardView,
} from '@/duel/ui';
import { finishCurrentMatch } from '@/duel/match';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

const HAND: DuelCardView[] = [
  { uid: 'demo-1', stationId: 'PRK', seed: 77, rarity: 'E', element: 'moon' },
  { uid: 'demo-2', stationId: 'KEN', seed: 312, rarity: 'R', element: 'storm' },
  { uid: 'demo-3', stationId: 'HAR', seed: 523, rarity: 'C', element: 'sun' },
];
const OPP_CARD: DuelCardView = { uid: 'opp-1', stationId: 'SST', seed: 134, rarity: 'C', element: 'moon' };
const OPP = 'Swift Ken #46';

type Tab = 'match' | 'invite' | 'pick' | 'sun' | 'storm' | 'moon' | 'clash' | 'result';
const TABS: Tab[] = ['match', 'invite', 'pick', 'sun', 'storm', 'moon', 'clash', 'result'];

const CLASHES = {
  'Win': [60, 70],   // 60 + ⚡25 + 5 = 90 vs 70
  'KO': [92, 30],    // 122 vs 30 → knocked out
  'Lose': [30, 80],  // 60 vs 80
  'Tie': [65, 75],
} as const;

export default function DuelLab() {
  const { c } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const W = Math.min(width, 520) - 32;
  const [tab, setTab] = useState<Tab>('pick');
  const [run, setRun] = useState(0); // bump to restart the current step
  const [log, setLog] = useState('');
  const [clash, setClash] = useState<keyof typeof CLASHES>('Win');
  const [invite, setInvite] = useState<'incoming' | 'outgoing' | null>(null);
  const [duelMe, setDuelMe] = useState(false);

  const restart = () => setRun((r) => r + 1);

  const myCard = tab === 'sun' ? HAND[2] : tab === 'storm' ? HAND[1] : HAND[0];
  const [yp, op] = CLASHES[clash];
  const youCard = HAND[1];
  // 'Tie' is Moon vs Moon (no element bonus): 65 + 10 epic = 75 vs 75
  const you = makeFighter('You', clash === 'Tie' ? HAND[0] : youCard, clash === 'Tie' ? 65 : yp, OPP_CARD);
  const opp = makeFighter(OPP, OPP_CARD, clash === 'Tie' ? 75 : op, clash === 'Tie' ? HAND[0] : youCard);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, alignItems: 'center' }}>
        <View style={{ width: W, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.black, fontSize: 28, color: c.text }}>Duel lab</Text>
          <Pressable onPress={() => router.back()}><Text style={{ fontFamily: font.heavy, fontSize: 16, color: c.blueInk }}>Close</Text></Pressable>
        </View>

        <View style={{ width: W, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => { setTab(t); setLog(''); restart(); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: t === tab ? c.text : c.card2 }}>
              <Text style={{ fontFamily: font.black, fontSize: 14, color: t === tab ? c.bg : c.text }}>{t}</Text>
            </Pressable>
          ))}
          <Pressable onPress={restart} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.goldTint }}>
            <Text style={{ fontFamily: font.black, fontSize: 14, color: c.goldInk }}>↻ restart</Text>
          </Pressable>
        </View>

        <ScorePill you={1} opp={0} oppName={OPP} />

        {tab === 'match' && (
          <View style={{ width: W, gap: 10 }}>
            <DuelMatchmaker
              enabled={duelMe}
              onToggle={setDuelMe}
              line="red"
              lineLabel="Red Line"
              nickname="Daisy #1"
              mascot="DAV"
              demo
              demoOptions={{ restMs: 8000 }}
              onReady={(o) => setLog(`ready vs ${o.opponent.nickname}${o.isBot ? ' (bot)' : ''} → open the duel screen`)}
            />
            <Pressable onPress={() => { void finishCurrentMatch(); setLog('duel finished → short break'); }} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.card2 }}>
              <Text style={{ fontFamily: font.black, fontSize: 14, color: c.text }}>Simulate duel finished</Text>
            </Pressable>
          </View>
        )}

        {tab === 'invite' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['incoming', 'outgoing'] as const).map((m) => (
              <Pressable key={m} onPress={() => setInvite(m)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: c.blueBtn }}>
                <Text style={{ fontFamily: font.black, fontSize: 15, color: '#fff' }}>Show {m}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <DuelInvite
          visible={invite !== null}
          mode={invite ?? 'incoming'}
          name={OPP}
          theirStationId="KEN"
          myStationId="DAV"
          onAccept={() => { setInvite(null); setLog('accepted → start duel'); setTab('pick'); restart(); }}
          onDecline={() => { setInvite(null); setLog(invite === 'outgoing' ? 'invite cancelled' : 'declined'); }}
          onExpire={() => { setInvite(null); setLog('invite expired'); }}
        />

        {tab === 'pick' && (
          <HandPicker key={run} hand={HAND} opponentName={OPP} opponentReady={false} width={W} height={height - 220} onPlay={(card) => setLog(`played ${card.element} ${card.uid}`)} />
        )}

        {(tab === 'sun' || tab === 'storm' || tab === 'moon') && (
          <ChargePhase key={`${tab}${run}`} card={myCard} opponentName={OPP} width={W} height={height - 220} onDone={(p) => setLog(`power ${p}`)} />
        )}

        {tab === 'clash' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(CLASHES) as (keyof typeof CLASHES)[]).map((k) => (
                <Pressable key={k} onPress={() => { setClash(k); restart(); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: k === clash ? c.blueBtn : c.card2 }}>
                  <Text style={{ fontFamily: font.black, fontSize: 14, color: k === clash ? '#fff' : c.text }}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <ClashArena key={`${clash}${run}`} you={you} opp={opp} width={W} onDone={(r) => setLog(`result: ${r}`)} />
          </>
        )}

        {tab === 'result' && (
          <DuelResult key={run} won you={2} opp={1} oppName={OPP} winningCard={HAND[1]} width={W} onRematch={restart} onBack={() => setTab('pick')} />
        )}

        {log ? <Text style={{ fontFamily: font.bold, fontSize: 14, color: c.muted }}>{log}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
