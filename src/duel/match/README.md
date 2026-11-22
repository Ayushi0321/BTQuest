# Train Duel auto-matchmaking

Nobody sends invites. Riders switch on **Duel me**, and the server pairs two riders on the same line
(same train first, then whoever has waited longest). Both get a **Match found!** popup for 20 s.

- Both say **Duel!** → the duel starts (`onReady`).
- One says **Not now** (or doesn't answer) → the other keeps their place in line and is matched with the
  next rider right away ("Swift Ken can't duel right now — finding another rider…"). The one who said no
  takes a 5-minute break; the same two riders aren't offered to each other again for 10 minutes.
- After a duel both riders take a 2-minute break, then matching resumes automatically.
- No real riders, no signal, not signed in, or `EXPO_PUBLIC_DUEL_DEMO=1` → **demo riders** take over with the
  same popups. By default the first demo rider backs out after you accept, so the pitch shows the re-match.

## 1 · Install the server part (once)

Supabase Dashboard → **SQL Editor** → paste `supabase/migrations/20261121_train_duel_matchmaking.sql` → **Run**.
It creates `duel_queue` + `duel_matches` (riders can only read their own rows), the functions
`duel_join / duel_respond / duel_finish / duel_leave`, and turns on Realtime for `duel_matches`.
Safe to run again.

## 2 · Mount it on the Ride tab

```tsx
import { DuelMatchmaker } from '@/duel/ui';
import { supabase } from '@/lib/supabase';          // ← wherever your client lives

<DuelMatchmaker
  enabled={duelMe} onToggle={setDuelMe}           // keep duelMe in settings / state
  line="red" lineLabel="Red Line"
  trainId={trip.trainId}                           // from useTrip; null is fine
  nickname={me.nickname} mascot={me.mascot}
  supabase={supabase} userId={session?.user.id}
  onReady={(offer) => router.push({
    pathname: '/duel/[matchId]',
    params: { matchId: offer.id, opponent: offer.opponent.nickname, mascot: offer.opponent.mascot, bot: offer.isBot ? '1' : '0' },
  })}
/>
```

In the duel screen: `bot === '1'` → `BotTransport`, otherwise `SupabaseTransport` on channel `duel:<matchId>`.
When the match ends call `finishCurrentMatch()` from `@/duel/match`.

## Demo switch

`.env`: `EXPO_PUBLIC_DUEL_DEMO=1` forces demo riders (recommended for the live pitch).
Without it, the app uses Supabase and quietly falls back to demo riders if anything fails.
