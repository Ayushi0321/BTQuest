import { AppState, type AppStateStatus } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';

import { SupabaseDuelTransport } from '@/duel/supabaseTransport';
import { BotTransport } from '@/features/duel/botTransport';
import type { DuelTransport } from '@/features/duel/transport';
import type { PublicRider } from '@/features/duel/types';
import { hasSupabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth';
import { useGame } from '@/state/game';
import { router } from 'expo-router';
import { setActiveDuelTransport } from '@/features/duel/transportRegistry';

const DEMO_DUEL_ROOM = process.env.EXPO_PUBLIC_DUEL_DEMO_TRAIN === '1';

function randomSessionId(): string {
  return `rider-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function generatedNickname(username?: string): string {
  const names = ['Swift', 'Bright', 'Brave', 'Lucky', 'Clever'];
  const name = names[Math.floor(Math.random() * names.length)];
  const number = 10 + Math.floor(Math.random() * 90);
  return `${name} ${username ? username.slice(0, 10) : 'Rider'} #${number}`;
}

export function useTrainRoom(trainId?: string) {
  const focused = useIsFocused();
  const { profile } = useAuth();
  const { cards } = useGame();
  const sessionId = useRef(randomSessionId()).current;
  const [riders, setRiders] = useState<PublicRider[]>([]);
  const [connected, setConnected] = useState(false);
  const [invite, setInvite] = useState<{ from: PublicRider; duelId: string } | null>(null);

  const transport = useMemo<DuelTransport>(() => {
    if (!hasSupabase()) return new BotTransport(cards);
    return new SupabaseDuelTransport(sessionId);
  }, [cards, sessionId]);
  const botTransport = useMemo(() => new BotTransport(cards), [cards]);
  const activeTransport = riders.length === 0 ? botTransport : transport;

  const me = useMemo<PublicRider>(() => ({
    riderId: sessionId,
    nickname: generatedNickname(profile?.username),
    mascotStationId: profile?.fav_station ?? 'KEN',
  }), [profile?.fav_station, profile?.username, sessionId]);

  const join = useCallback((roomId: string) => {
    transport.joinTrainRoom(roomId, me);
  }, [me, transport]);

  useEffect(() => {
    if (!trainId || !focused) {
      transport.leaveTrainRoom();
      setRiders([]);
      setConnected(false);
      return;
    }

    const roomId = DEMO_DUEL_ROOM ? 'demo-train' : trainId;
    join(roomId);
    setConnected(hasSupabase());
    setActiveDuelTransport(transport);
    const unsubscribeRiders = transport.onRidersChanged(setRiders);
    const unsubscribeInvite = transport.onInvite((from, duelId) => {
      setInvite({ from, duelId });
      setTimeout(() => setInvite((current) => current?.duelId === duelId ? null : current), 20_000);
    });
    const unsubscribeStarted = transport.onDuelStarted((state) => {
      setActiveDuelTransport(transport);
      router.push(`/duel/${state.duelId}` as never);
    });
    return () => {
      unsubscribeRiders();
      unsubscribeInvite();
      unsubscribeStarted();
    };
  }, [focused, join, trainId, transport]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') {
        transport.leaveTrainRoom();
        setRiders([]);
        setConnected(false);
      } else if (focused && trainId) {
        join(DEMO_DUEL_ROOM ? 'demo-train' : trainId);
        setConnected(hasSupabase());
      }
    });
    return () => subscription.remove();
  }, [focused, join, trainId, transport]);

  const acceptInvite = useCallback(() => {
    if (!invite) return;
    transport.acceptInvite(invite.duelId);
    setInvite(null);
  }, [invite, transport]);

  const declineInvite = useCallback(() => {
    if (!invite) return;
    transport.declineInvite(invite.duelId);
    setInvite(null);
  }, [invite, transport]);

  return {
    transport,
    activeTransport,
    riders,
    me,
    connected,
    sessionId,
    invite,
    acceptInvite,
    declineInvite,
  };
}
