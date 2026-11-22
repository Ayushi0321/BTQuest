// Auto-matchmaking host: the "Duel me" pill + the "Match found!" popup.
// The system pairs riders on the same line; nobody has to send an invite.
// Mount it once on the Ride tab (the popup is a modal, so it shows over any screen).

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Switch, Text, View } from 'react-native';

import { useMatchmaking } from '@/duel/match/useMatchmaking';
import type { DemoOptions } from '@/duel/match/demoMatchmaker';
import type { MatchOffer, MatchState } from '@/duel/match/types';
import { useFeedback } from '@/state/feedback';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

import { DuelInvite } from './DuelInvite';
import { useDuelFx } from './sfx';

type Props = {
  /** "Duel me" on/off (keep it in your settings or state) */
  enabled: boolean;
  onToggle: (on: boolean) => void;
  line: string;              // 'red'
  lineLabel: string;         // 'Red Line'
  trainId?: string | null;
  nickname: string;
  mascot: string;
  supabase?: SupabaseClient | null;
  userId?: string | null;
  demo?: boolean;
  demoOptions?: DemoOptions;
  /** both riders said yes → open the duel screen (offer.isBot → use the BotTransport) */
  onReady: (offer: MatchOffer) => void;
  /** hide the pill and only show popups */
  hidePill?: boolean;
};

export function DuelMatchmaker(p: Props) {
  const { announce } = useFeedback();
  const { play, haptic } = useDuelFx();
  const mm = useMatchmaking({
    enabled: p.enabled, line: p.line, trainId: p.trainId, nickname: p.nickname, mascot: p.mascot,
    supabase: p.supabase, userId: p.userId, demo: p.demo, demoOptions: p.demoOptions,
  });
  const { state } = mm;

  // one-off notes ("X can't duel — finding another rider…") go to the app's banner
  const lastNote = useRef(0);
  useEffect(() => {
    if (state.note && state.note.id !== lastNote.current) {
      lastNote.current = state.note.id;
      announce({ text: state.note.text, kind: 'info', voice: false, buzz: 'tap' });
    }
  }, [state.note, announce]);

  // both said yes → go (once per match)
  const launched = useRef<string | null>(null);
  useEffect(() => {
    if (state.phase === 'ready' && state.offer && launched.current !== state.offer.id) {
      launched.current = state.offer.id;
      play('matchWin');
      haptic('rare');
      p.onReady(state.offer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.offer?.id]);

  const offer = state.offer;
  const showPopup = (state.phase === 'offer' || state.phase === 'waiting') && !!offer;
  const secsLeft = offer ? Math.max(1, Math.round((offer.expiresAt - Date.now()) / 1000)) : 20;
  const where = offer?.trainId && offer.trainId !== 'demo-train' ? `${p.lineLabel} · same train` : `${p.lineLabel} · riding now`;

  return (
    <>
      {!p.hidePill && <MatchPill state={state} enabled={p.enabled} onToggle={p.onToggle} lineLabel={p.lineLabel} demo={state.source === 'demo'} />}
      {offer && (
        <DuelInvite
          key={offer.id}
          visible={showPopup}
          mode={state.phase === 'waiting' ? 'outgoing' : 'incoming'}
          name={offer.opponent.nickname}
          theirStationId={offer.opponent.mascot}
          myStationId={p.mascot}
          where={where}
          expiresInSec={secsLeft}
          eyebrow={state.phase === 'waiting' ? 'YOU SAID YES' : 'MATCH FOUND'}
          title={state.phase === 'waiting' ? `Waiting for ${offer.opponent.nickname}…` : `Duel ${offer.opponent.nickname}?`}
          acceptLabel="Duel!"
          declineLabel={state.phase === 'waiting' ? 'Cancel' : 'Not now'}
          onAccept={() => { void mm.respond(true); }}
          onDecline={() => { void mm.respond(false); }}
          onExpire={() => { void mm.expire(); }}
        />
      )}
    </>
  );
}

/** "Duel me" switch with a live status line. */
export function MatchPill({ state, enabled, onToggle, lineLabel, demo }: { state: MatchState; enabled: boolean; onToggle: (on: boolean) => void; lineLabel: string; demo?: boolean }) {
  const { c } = useAppTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const [, tick] = useState(0);
  const searching = enabled && state.phase === 'searching';

  useEffect(() => {
    if (!searching) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [searching, pulse]);

  // refresh the rest countdown once a second
  useEffect(() => {
    if (state.phase !== 'resting') return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  let line = `Get matched with a rider on the ${lineLabel}`;
  if (enabled) {
    if (state.phase === 'searching') line = state.looking > 0 ? `Matching you… ${state.looking} rider${state.looking === 1 ? '' : 's'} looking` : `Looking for a rider on the ${lineLabel}…`;
    else if (state.phase === 'offer') line = 'Match found!';
    else if (state.phase === 'waiting') line = 'Waiting for your opponent…';
    else if (state.phase === 'ready') line = 'Duel starting!';
    else if (state.phase === 'resting' && state.restingUntil) {
      const s = Math.max(0, Math.round((state.restingUntil - Date.now()) / 1000));
      line = `Short break · next match in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    } else if (state.phase === 'off') line = 'Connecting…';
  }

  return (
    <Pressable
      onPress={() => onToggle(!enabled)}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={`Train Duel. ${line}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: enabled ? c.goldTint : c.card, borderRadius: 22, padding: 12, borderWidth: 2, borderColor: enabled ? c.gold : c.line, borderBottomWidth: 5 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: enabled ? '#C64B41' : c.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.black, fontSize: 15, color: enabled ? '#FFFFFF' : c.muted }}>VS</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.black, fontSize: 16, color: c.text }}>Train Duel{demo && enabled ? ' · demo riders' : ''}</Text>
        <Animated.Text numberOfLines={1} style={{ opacity: pulse, fontFamily: font.heavy, fontSize: 13, color: c.muted }}>{line}</Animated.Text>
      </View>
      <Switch value={enabled} onValueChange={onToggle} trackColor={{ true: '#C64B41', false: c.track }} thumbColor="#FFFFFF" />
    </Pressable>
  );
}
