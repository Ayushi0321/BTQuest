// One hook for the app: real matchmaking through Supabase when it's available,
// otherwise (or when EXPO_PUBLIC_DUEL_DEMO=1) the scripted demo riders. If Supabase fails
// to start (offline, not signed in, SQL not installed), it switches to demo by itself.

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DemoMatchmaker, type DemoOptions } from './demoMatchmaker';
import { SupabaseMatchmaker } from './supabaseMatchmaker';
import { OFF_STATE, type JoinParams, type Matchmaker, type MatchState } from './types';

export type UseMatchmakingArgs = JoinParams & {
  /** "Duel me" switch — false leaves the queue */
  enabled: boolean;
  supabase?: SupabaseClient | null;
  /** signed-in Supabase user id; without it we use demo riders */
  userId?: string | null;
  /** force demo riders (also on when EXPO_PUBLIC_DUEL_DEMO=1) */
  demo?: boolean;
  demoOptions?: DemoOptions;
};

const ENV_DEMO = process.env.EXPO_PUBLIC_DUEL_DEMO === '1';

let current: Matchmaker | null = null;
/** Call from the duel screen when the match is over (starts the short break, then matching resumes). */
export function finishCurrentMatch() {
  return current?.finish();
}

export function useMatchmaking({ enabled, supabase, userId, demo, demoOptions, line, trainId, nickname, mascot }: UseMatchmakingArgs) {
  const wantDemo = demo || ENV_DEMO || !supabase || !userId;
  const [fellBack, setFellBack] = useState<string | null>(null);
  const useDemo = wantDemo || fellBack !== null;

  const mm: Matchmaker = useMemo(
    () => (useDemo ? new DemoMatchmaker(demoOptions) : new SupabaseMatchmaker(supabase!, userId!)),
    // demoOptions is read once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useDemo, supabase, userId],
  );
  const [state, setState] = useState<MatchState>(() => OFF_STATE(mm.source));
  useEffect(() => mm.subscribe(setState), [mm]);
  useEffect(() => {
    current = mm;
    return () => { if (current === mm) current = null; };
  }, [mm]);

  // join / re-join when the ride changes; leave when switched off or unmounted
  const started = useRef(false);
  useEffect(() => {
    if (!enabled) {
      if (started.current) { started.current = false; void mm.stop(); }
      return;
    }
    let cancelled = false;
    mm.start({ line, trainId, nickname, mascot })
      .then(() => { started.current = true; })
      .catch((e: unknown) => {
        if (cancelled || mm.source !== 'supabase') return;
        const why = e instanceof Error ? e.message : String(e);
        console.warn('[duel] Supabase matchmaking unavailable, using demo riders:', why);
        setFellBack(why);
      });
    return () => { cancelled = true; };
  }, [enabled, mm, line, trainId, nickname, mascot]);

  useEffect(() => () => { void mm.stop(); }, [mm]);

  return {
    state,
    /** why we're on demo riders, if Supabase failed */
    fallbackReason: fellBack,
    respond: (accept: boolean) => mm.respond(accept),
    expire: () => mm.expire(),
    finish: () => mm.finish(),
    matchmaker: mm,
  };
}
