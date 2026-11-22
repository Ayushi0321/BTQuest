-- TQuest · Train Duel auto-matchmaking
-- Riders who switch on "Duel me" join a queue for their line. The server pairs two riders
-- (same train first, then same line, longest-waiting first) and both get a 20-second
-- "Match found" popup. If one says no or doesn't answer, the one who said yes keeps their
-- place in line and is matched with the next rider right away; the other rests for 5 minutes.
--
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run. Safe to run again.
-- All writes go through the functions below (clients can only read their own rows).

create extension if not exists pgcrypto;

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.duel_queue (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  nickname      text not null,
  mascot        text not null,                 -- station id of the rider's mascot, e.g. 'KEN'
  line          text not null,                 -- 'red', 'green-b', …
  train_id      text,                          -- MBTA vehicle id when known
  status        text not null default 'looking'
                check (status in ('looking', 'matched', 'dueling', 'resting')),
  resting_until timestamptz,
  queued_at     timestamptz not null default now(),  -- place in line (kept when your opponent backs out)
  last_seen     timestamptz not null default now()   -- heartbeat; riders silent for 45 s are skipped
);
create index if not exists duel_queue_line_idx on public.duel_queue (line, status, queued_at);

create table if not exists public.duel_matches (
  id          uuid primary key default gen_random_uuid(),
  line        text not null,
  train_id    text,                            -- set when both riders are on the same train
  player_a    uuid not null references auth.users(id) on delete cascade,
  player_b    uuid not null references auth.users(id) on delete cascade,
  a_nickname  text not null,
  a_mascot    text not null,
  b_nickname  text not null,
  b_mascot    text not null,
  a_accepted  boolean,                         -- null = hasn't answered yet
  b_accepted  boolean,
  status      text not null default 'pending'
              check (status in ('pending', 'ready', 'cancelled', 'expired', 'finished')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '20 seconds'
);
create index if not exists duel_matches_a_idx on public.duel_matches (player_a, status);
create index if not exists duel_matches_b_idx on public.duel_matches (player_b, status);

alter table public.duel_queue enable row level security;
alter table public.duel_matches enable row level security;

-- read-only for signed-in riders (their own rows, see policies); nothing for anonymous users
revoke all on public.duel_queue, public.duel_matches from anon, authenticated;
grant select on public.duel_queue, public.duel_matches to authenticated;

drop policy if exists "read own queue row" on public.duel_queue;
create policy "read own queue row" on public.duel_queue
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read my matches" on public.duel_matches;
create policy "read my matches" on public.duel_matches
  for select to authenticated using (auth.uid() = player_a or auth.uid() = player_b);

-- live updates for the app (Realtime → postgres_changes on duel_matches)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'duel_matches') then
    alter publication supabase_realtime add table public.duel_matches;
  end if;
end $$;

-- ───────────────────────── internal helpers ─────────────────────────

-- What the app needs to know about me right now.
create or replace function public._duel_state(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'queue_status',  (select status from duel_queue where user_id = p_user),
    'resting_until', (select resting_until from duel_queue where user_id = p_user),
    'looking',       (select count(*) from duel_queue q join duel_queue me on me.user_id = p_user
                       where q.line = me.line and q.user_id <> p_user and q.status = 'looking'
                         and q.last_seen > now() - interval '45 seconds'),
    'match',         (select to_jsonb(m) from duel_matches m
                       where p_user in (m.player_a, m.player_b) and m.status in ('pending', 'ready')
                       order by m.created_at desc limit 1)
  );
$$;

-- Pair this rider with the best waiting rider on the same line, if there is one.
create or replace function public._duel_try_match(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me  duel_queue;
  opp duel_queue;
begin
  select * into me from duel_queue where user_id = p_user for update;
  if not found or me.status <> 'looking' then return; end if;
  if exists (select 1 from duel_matches where p_user in (player_a, player_b) and status in ('pending', 'ready')) then
    return;
  end if;

  select q.* into opp
    from duel_queue q
   where q.user_id <> p_user
     and q.line = me.line
     and q.status = 'looking'
     and q.last_seen > now() - interval '45 seconds'
     -- don't offer the same two riders again right after one of them said no
     and not exists (
       select 1 from duel_matches x
        where x.status in ('cancelled', 'expired')
          and x.created_at > now() - interval '10 minutes'
          and ((x.player_a = p_user and x.player_b = q.user_id) or (x.player_b = p_user and x.player_a = q.user_id))
     )
   order by (q.train_id is not null and q.train_id = me.train_id) desc,  -- same train first
            q.queued_at asc                                                -- then longest waiting
   limit 1
   for update skip locked;
  if not found then return; end if;

  insert into duel_matches (line, train_id, player_a, player_b, a_nickname, a_mascot, b_nickname, b_mascot)
  values (me.line,
          case when opp.train_id is not null and opp.train_id = me.train_id then me.train_id end,
          opp.user_id, p_user, opp.nickname, opp.mascot, me.nickname, me.mascot);

  update duel_queue set status = 'matched' where user_id in (p_user, opp.user_id);
end;
$$;

-- Time out unanswered offers and wake up riders whose rest is over.
create or replace function public._duel_expire()
returns void language plpgsql security definer set search_path = public as $$
declare
  m duel_matches;
begin
  for m in
    select * from duel_matches where status = 'pending' and expires_at < now() for update skip locked
  loop
    update duel_matches set status = 'expired' where id = m.id;
    -- whoever said yes goes back to looking (keeps their place); whoever didn't answer rests
    update duel_queue q
       set status = case when (q.user_id = m.player_a and m.a_accepted is true)
                           or (q.user_id = m.player_b and m.b_accepted is true) then 'looking' else 'resting' end,
           resting_until = case when (q.user_id = m.player_a and m.a_accepted is true)
                                  or (q.user_id = m.player_b and m.b_accepted is true) then null
                                else now() + interval '5 minutes' end
     where q.user_id in (m.player_a, m.player_b) and q.status = 'matched';
    perform _duel_try_match(m.player_a);
    perform _duel_try_match(m.player_b);
  end loop;

  update duel_queue
     set status = 'looking', resting_until = null, queued_at = now()
   where status = 'resting' and resting_until < now();

  -- safety net: a duel nobody finished (app closed mid-game) ends after 15 minutes,
  -- and anyone marked matched/dueling without a live match goes back to looking
  update duel_matches set status = 'finished' where status = 'ready' and created_at < now() - interval '15 minutes';
  update duel_queue q
     set status = 'looking', queued_at = now()
   where q.status in ('matched', 'dueling')
     and not exists (select 1 from duel_matches live
                      where q.user_id in (live.player_a, live.player_b) and live.status in ('pending', 'ready'));
end;
$$;

-- ───────────────────────── app API (supabase.rpc) ─────────────────────────

-- Join the queue / heartbeat. Call when "Duel me" is on, then every ~10 s while it stays on.
create or replace function public.duel_join(p_line text, p_train text, p_nickname text, p_mascot text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in to duel'; end if;

  insert into duel_queue (user_id, nickname, mascot, line, train_id)
  values (uid, left(p_nickname, 40), left(p_mascot, 8), p_line, nullif(p_train, ''))
  on conflict (user_id) do update
     set nickname  = excluded.nickname,
         mascot    = excluded.mascot,
         line      = excluded.line,
         train_id  = excluded.train_id,
         last_seen = now(),
         status = case
                    when duel_queue.status = 'resting' and duel_queue.resting_until > now() then 'resting'
                    when duel_queue.status in ('matched', 'dueling') then duel_queue.status
                    else 'looking' end,
         queued_at = case when duel_queue.status = 'looking' then duel_queue.queued_at else now() end;

  perform _duel_expire();
  perform _duel_try_match(uid);
  return _duel_state(uid);
end;
$$;

-- Answer a "Match found" offer.
create or replace function public.duel_respond(p_match uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  m     duel_matches;
  other uuid;
begin
  select * into m from duel_matches where id = p_match for update;
  if not found or uid is null or uid not in (m.player_a, m.player_b) then
    raise exception 'not your match';
  end if;
  if m.status <> 'pending' then return _duel_state(uid); end if;
  other := case when uid = m.player_a then m.player_b else m.player_a end;

  if p_accept then
    update duel_matches
       set a_accepted = case when uid = player_a then true else a_accepted end,
           b_accepted = case when uid = player_b then true else b_accepted end
     where id = m.id
    returning * into m;
    if m.a_accepted is true and m.b_accepted is true then
      update duel_matches set status = 'ready' where id = m.id;
      update duel_queue set status = 'dueling' where user_id in (m.player_a, m.player_b);
    end if;
  else
    update duel_matches
       set status = 'cancelled',
           a_accepted = case when uid = player_a then false else a_accepted end,
           b_accepted = case when uid = player_b then false else b_accepted end
     where id = m.id;
    update duel_queue set status = 'resting', resting_until = now() + interval '5 minutes' where user_id = uid;
    -- the other rider keeps their place in line and gets the next match right away
    update duel_queue set status = 'looking' where user_id = other and status = 'matched';
    perform _duel_try_match(other);
  end if;

  return _duel_state(uid);
end;
$$;

-- The duel is over: both riders take a short break before the next match.
create or replace function public.duel_finish(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m   duel_matches;
begin
  select * into m from duel_matches where id = p_match for update;
  if not found or uid is null or uid not in (m.player_a, m.player_b) then
    raise exception 'not your match';
  end if;
  if m.status = 'ready' then
    update duel_matches set status = 'finished' where id = m.id;
  end if;
  update duel_queue set status = 'resting', resting_until = now() + interval '2 minutes'
   where user_id in (m.player_a, m.player_b) and status = 'dueling';
  return _duel_state(uid);
end;
$$;

-- "Duel me" switched off, ride ended or app closed.
create or replace function public.duel_leave()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  m     duel_matches;
  other uuid;
begin
  if uid is null then return null; end if;
  for m in
    select * from duel_matches where uid in (player_a, player_b) and status = 'pending' for update
  loop
    update duel_matches set status = 'cancelled' where id = m.id;
    other := case when uid = m.player_a then m.player_b else m.player_a end;
    update duel_queue set status = 'looking' where user_id = other and status = 'matched';
    delete from duel_queue where user_id = uid;
    perform _duel_try_match(other);
  end loop;
  delete from duel_queue where user_id = uid;
  return jsonb_build_object('queue_status', null, 'resting_until', null, 'looking', 0, 'match', null);
end;
$$;

-- ───────────────────────── permissions ─────────────────────────

revoke all on function public._duel_state(uuid)      from public, anon, authenticated;
revoke all on function public._duel_try_match(uuid)  from public, anon, authenticated;
revoke all on function public._duel_expire()         from public, anon, authenticated;
revoke all on function public.duel_join(text, text, text, text) from public, anon;
revoke all on function public.duel_respond(uuid, boolean)      from public, anon;
revoke all on function public.duel_finish(uuid)                from public, anon;
revoke all on function public.duel_leave()                     from public, anon;
grant execute on function public.duel_join(text, text, text, text) to authenticated;
grant execute on function public.duel_respond(uuid, boolean)      to authenticated;
grant execute on function public.duel_finish(uuid)                to authenticated;
grant execute on function public.duel_leave()                     to authenticated;
