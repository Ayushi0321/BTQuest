import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Button, Card, Kicker, ProgressBar, Screen, T } from '@/components/ui';
import { riderMascot } from '@/data/stations';
import { supabase } from '@/lib/supabase';
import { BotTransport } from '@/features/duel/botTransport';
import { setActiveDuelTransport } from '@/features/duel/transportRegistry';
import { useAuth } from '@/state/auth';
import { useGame } from '@/state/game';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

type Scope = 'week' | 'all';
type Row = { rank: number; username: string; fav_station: string | null; points: number; is_me: boolean };

const LIMIT = 20;

async function fetchBoard(scope: Scope): Promise<Row[] | null> {
  const { data, error } = await supabase.rpc('leaderboard', { p_scope: scope, p_limit: LIMIT });
  if (error) return null;
  return (data as Row[]).map((r) => ({ ...r, rank: Number(r.rank), points: Number(r.points) }));
}

export default function Board() {
  const { c } = useAppTheme();
  const { cards, points, pending, weekArt } = useGame();
  const { profile } = useAuth();
  const artLeft = Math.max(0, 3 - weekArt);
  const [scope, setScope] = useState<Scope>('week');
  const [boards, setBoards] = useState<Partial<Record<Scope, Row[]>>>({});
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const practiceDuel = () => {
    const bot = new BotTransport(cards);
    const me = {
      riderId: 'practice-me',
      nickname: profile?.username ? `Swift ${profile.username} #42` : 'Swift Rider #42',
      mascotStationId: profile?.fav_station ?? 'KEN',
    };
    setActiveDuelTransport(bot);
    const matchId = bot.startPractice(me, cards);
    router.push(`/duel/${matchId}` as never);
  };

  const load = useCallback((s: Scope) => fetchBoard(s).then((r) => {
    setFailed(!r);
    if (r) setBoards((b) => ({ ...b, [s]: r }));
  }), []);

  useFocusEffect(useCallback(() => { load(scope); }, [load, scope]));

  useEffect(() => {
    if (!pending) load(scope);
  }, [points, pending, scope, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(scope);
    setRefreshing(false);
  };

  const rows = boards[scope];
  const meIdx = rows ? rows.findIndex((r) => r.is_me) : -1;
  const pinned = rows && meIdx >= LIMIT ? rows[meIdx] : null;
  const list = rows ? (pinned ? rows.slice(0, LIMIT) : rows) : [];

  const row = (p: Row, key: string) => (
    <View key={key} accessibilityLabel={`Rank ${p.rank}, ${p.is_me ? 'you' : p.username}, ${p.points} points`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: p.is_me ? c.red : c.line, backgroundColor: p.is_me ? c.redTint : c.card }}>
      <T size={16} weight="black" color={p.rank <= 3 ? c.goldInk : c.muted} style={{ width: 28, textAlign: 'center' }}>{p.rank}</T>
      <Mascot stationId={riderMascot(p.fav_station, p.username)} size={44} />
      <T size={16} weight="heavy" style={{ flex: 1 }}>{p.is_me ? `${p.username} (you)` : p.username}</T>
      <T size={15} weight="black" color={c.muted}>{p.points} pts</T>
    </View>
  );

  return (
    <Screen
      title="Board"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
      footer={pinned ? <View style={{ paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 2, borderTopColor: c.line, backgroundColor: c.bg }}>{row(pinned, 'pinned')}</View> : null}>
      <Card>
        <Kicker color={c.purple}>Weekly challenge</Kicker>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}>
          <T size={18} weight="black" style={{ flex: 1 }}>{artLeft ? `Art hunter: ${artLeft} more artwork${artLeft > 1 ? 's' : ''} to go` : 'Art hunter: done this week!'}</T>
          <T size={15} weight="black" color={c.muted}>{Math.min(weekArt, 3)} / 3</T>
        </View>
        <ProgressBar value={weekArt / 3} color={c.purple} />
      </Card>

      <Button label="Practice duel vs bot" kind="gold" onPress={practiceDuel} />

      <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: 16, padding: 4, gap: 4 }}>
        {([['week', 'This week'], ['all', 'All time']] as [Scope, string][]).map(([v, label]) => (
          <Pressable key={v} onPress={() => setScope(v)} accessibilityRole="button" accessibilityState={{ selected: scope === v }}
            style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: scope === v ? c.card : 'transparent' }}>
            <Text style={{ fontFamily: font.black, fontSize: 15, color: scope === v ? c.text : c.muted }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {failed ? <T size={14} color={c.orangeInk}>Can’t reach the board. Pull down to try again.</T> : null}
      {scope === 'week' && rows && list.every((r) => r.points === 0) ? (
        <T size={14} color={c.muted}>No points yet this week. Ride to get on the board.</T>
      ) : null}

      <View style={{ gap: 8 }}>
        {list.map((p) => row(p, p.username))}
      </View>
    </Screen>
  );
}
