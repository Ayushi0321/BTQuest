import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { Rarity } from '@/components/StampCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth';

// The rider's collection and points. Saved to their account; pulls made offline wait in a queue and sync later.

export type OwnedCard = { uid: string; stationId: string; seed: number; rarity: Rarity; place?: string; placeCode?: string };

// Pull rates shown to riders in Rewards. Pulls only come from riding, never from payments.
export const PULL_RATES: [Rarity, number][] = [['L', 0.01], ['E', 0.07], ['R', 0.22], ['C', 0.7]];

const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
const PULL_POINTS = 10;
const ART_POINTS = 50;

function rollRarity(): Rarity {
  let x = Math.random();
  for (const [r, p] of PULL_RATES) {
    if (x < p) return r;
    x -= p;
  }
  return 'C';
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type Stats = { points: number; week: number; month: number; streak: number; weekArt: number };
type Op = { kind: 'pull'; card: OwnedCard } | { kind: 'art'; stationId: string };
type Saved = { cards: OwnedCard[]; artFound: Record<string, boolean>; stats: Stats; queue: Op[] };

const EMPTY: Saved = { cards: [], artFound: {}, stats: { points: 0, week: 0, month: 0, streak: 0, weekArt: 0 }, queue: [] };
const storageKey = (uid: string) => `tquest.game.v1.${uid}`;
const opId = (op: Op) => (op.kind === 'pull' ? op.card.uid : 'art:' + op.stationId);
const opPoints = (op: Op) => (op.kind === 'pull' ? PULL_POINTS : ART_POINTS);
const isRetryable = (e: { code?: string; message: string }) => !e.code || e.code.startsWith('PGRST3') || /fetch|network|jwt/i.test(e.message);

type Game = {
  cards: OwnedCard[];
  points: number;
  weekPoints: number;
  monthPoints: number;
  streak: number;
  /** Artwork stamps found since Monday, for the weekly challenge. */
  weekArt: number;
  artFound: Record<string, boolean>;
  /** Pulls waiting to reach the server. */
  pending: number;
  /** Arriving at a station: adds +10 points and one new card. Returns the card and whether it's the first one there. */
  pull: (stationId: string, place?: { name: string; code: string }, rarity?: Rarity) => { card: OwnedCard; isNew: boolean };
  findArt: (stationId: string) => void;
};

const GameCtx = createContext<Game | null>(null);

type ServerData = { cards: OwnedCard[]; art: string[]; stats: Stats };

async function fetchServer(): Promise<ServerData | null> {
  const [c, a, s] = await Promise.all([
    supabase.from('cards').select('uid, station_id, seed, rarity, place, place_code').order('created_at'),
    supabase.from('art_finds').select('station_id'),
    supabase.rpc('my_stats'),
  ]);
  if (c.error || a.error || s.error) return null;
  const st = s.data as { points: number; week_points: number; month_points?: number; streak?: number; week_art?: number };
  return {
    cards: c.data.map((r) => ({ uid: r.uid, stationId: r.station_id, seed: r.seed, rarity: r.rarity as Rarity, place: r.place ?? undefined, placeCode: r.place_code ?? undefined })),
    art: a.data.map((r) => r.station_id as string),
    stats: { points: st.points, week: st.week_points, month: st.month_points ?? 0, streak: st.streak ?? 0, weekArt: st.week_art ?? 0 },
  };
}

function mergeServer(local: Saved, server: ServerData): Saved {
  const onServer = new Set(server.cards.map((c) => c.uid));
  const artOnServer = new Set(server.art);
  const queue = local.queue.filter((op) => (op.kind === 'pull' ? !onServer.has(op.card.uid) : !artOnServer.has(op.stationId)));
  const queuedCards = queue.flatMap((op) => (op.kind === 'pull' ? [op.card] : []));
  const artFound: Record<string, boolean> = {};
  for (const id of server.art) artFound[id] = true;
  for (const op of queue) if (op.kind === 'art') artFound[op.stationId] = true;
  return { cards: [...server.cards, ...queuedCards], artFound, stats: server.stats, queue };
}

async function readSaved(uid: string): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Saved) } : null;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [store, setStore] = useState<{ uid: string; data: Saved } | null>(null);
  const data = store && store.uid === uid ? store.data : EMPTY;
  const latest = useRef(data);
  const flushing = useRef(false);
  const pulls = useRef(0);

  useEffect(() => {
    latest.current = data;
  }, [data]);

  useEffect(() => {
    if (store) AsyncStorage.setItem(storageKey(store.uid), JSON.stringify(store.data)).catch(() => {});
  }, [store]);

  const update = useCallback((fn: (d: Saved) => Saved) => {
    if (!uid) return;
    setStore((s) => ({ uid, data: fn(s && s.uid === uid ? s.data : EMPTY) }));
  }, [uid]);

  const flush = useCallback(async () => {
    if (flushing.current || !uid) return;
    flushing.current = true;
    try {
      const done = new Set<string>();
      let queue = latest.current.queue;
      while (queue.length) {
        const op = queue[0];
        const res = op.kind === 'pull'
          ? await supabase.rpc('pull_card', {
              p_uid: op.card.uid, p_station: op.card.stationId, p_seed: op.card.seed, p_rarity: op.card.rarity,
              p_place: op.card.place ?? null, p_place_code: op.card.placeCode ?? null,
            })
          : await supabase.rpc('find_art', { p_station: op.stationId });
        if (res.error && isRetryable(res.error)) break;
        const gained = res.error ? 0 : ((res.data as { points?: number } | null)?.points ?? 0);
        const id = opId(op);
        done.add(id);
        update((d) => ({
          ...d,
          queue: d.queue.filter((o) => opId(o) !== id),
          cards: res.error && op.kind === 'pull' ? d.cards.filter((c) => c.uid !== id) : d.cards,
          stats: { ...d.stats, points: d.stats.points + gained, week: d.stats.week + gained, month: d.stats.month + gained, weekArt: d.stats.weekArt + (op.kind === 'art' && gained ? 1 : 0) },
        }));
        queue = queue.slice(1);
        if (!queue.length) queue = latest.current.queue.filter((o) => !done.has(opId(o)));
      }
      if (done.size) {
        const server = await fetchServer();
        if (server) update((d) => mergeServer(d, server));
      }
    } finally {
      flushing.current = false;
    }
  }, [uid, update]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const server = await fetchServer();
    if (server) update((d) => mergeServer(d, server));
    flush();
  }, [uid, update, flush]);

  useEffect(() => {
    if (!uid) return;
    let live = true;
    (async () => {
      const cached = await readSaved(uid);
      if (!live) return;
      setStore({ uid, data: cached ?? EMPTY });
      const server = await fetchServer();
      if (!live || !server) return;
      setStore((s) => ({ uid, data: mergeServer(s && s.uid === uid ? s.data : EMPTY, server) }));
    })();
    return () => { live = false; };
  }, [uid]);

  const queued = data.queue.length;
  useEffect(() => {
    if (!queued) return;
    flush();
    const t = setInterval(flush, 30000);
    return () => clearInterval(t);
  }, [queued, flush]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const pull = useCallback(
    (stationId: string, place?: { name: string; code: string }, forcedRarity?: Rarity) => {
      const rarity: Rarity = forcedRarity ?? (DEMO_MODE && pulls.current === 0 ? 'E' : rollRarity());
      pulls.current += 1;
      const card: OwnedCard = { uid: uuid(), stationId, seed: 100 + Math.floor(Math.random() * 9000), rarity, place: place?.name, placeCode: place?.code };
      const isNew = !latest.current.cards.some((c) => c.stationId === stationId);
      update((d) => ({ ...d, cards: [...d.cards, card], queue: [...d.queue, { kind: 'pull', card }] }));
      return { card, isNew };
    },
    [update]
  );

  const findArt = useCallback((stationId: string) => {
    update((d) => (d.artFound[stationId] ? d : { ...d, artFound: { ...d.artFound, [stationId]: true }, queue: [...d.queue, { kind: 'art', stationId }] }));
  }, [update]);

  const value = useMemo<Game>(() => {
    const extra = data.queue.reduce((n, op) => n + opPoints(op), 0);
    const queuedArt = data.queue.filter((op) => op.kind === 'art').length;
    return {
      cards: data.cards,
      points: data.stats.points + extra,
      weekPoints: data.stats.week + extra,
      monthPoints: data.stats.month + extra,
      streak: data.stats.streak,
      weekArt: data.stats.weekArt + queuedArt,
      artFound: data.artFound,
      pending: data.queue.length,
      pull,
      findArt,
    };
  }, [data, pull, findArt]);

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Game {
  const g = useContext(GameCtx);
  if (!g) throw new Error('useGame must be used inside <GameProvider>');
  return g;
}

const RANK: Record<Rarity, number> = { L: 4, E: 3, R: 2, C: 1 };
/** Best card first (rarest, then newest). */
export const sortBest = (list: OwnedCard[]) => [...list].sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
