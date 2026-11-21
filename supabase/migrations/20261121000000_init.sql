-- TQuest accounts, collection, points and leaderboard.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  fav_station text,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower on public.profiles (lower(username));

create table public.cards (
  uid uuid primary key,
  user_id uuid not null references public.profiles on delete cascade,
  station_id text not null check (station_id ~ '^[A-Z]{3}$'),
  seed int not null,
  rarity text not null check (rarity in ('C', 'R', 'E', 'L')),
  place text,
  place_code text,
  created_at timestamptz not null default now()
);
create index cards_user on public.cards (user_id);

create table public.art_finds (
  user_id uuid not null references public.profiles on delete cascade,
  station_id text not null check (station_id ~ '^[A-Z]{3}$'),
  found_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

create table public.point_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount int not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create index point_events_user_time on public.point_events (user_id, created_at);
create index point_events_time on public.point_events (created_at);

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.art_finds enable row level security;
alter table public.point_events enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own cards read" on public.cards for select to authenticated using (user_id = (select auth.uid()));
create policy "own art read" on public.art_finds for select to authenticated using (user_id = (select auth.uid()));
create policy "own points read" on public.point_events for select to authenticated using (user_id = (select auth.uid()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'rider_' || substr(replace(new.id::text, '-', ''), 1, 8))
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.week_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York'
$$;

create function public.username_available(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[A-Za-z0-9_]{3,20}$'
    and not exists (select 1 from public.profiles where lower(username) = lower(p_name))
$$;

create function public.pull_card(
  p_uid uuid, p_station text, p_seed int, p_rarity text, p_place text default null, p_place_code text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  first_here boolean;
  added int;
begin
  if me is null then raise exception 'not signed in'; end if;
  select not exists (select 1 from public.cards where user_id = me and station_id = p_station) into first_here;
  insert into public.cards (uid, user_id, station_id, seed, rarity, place, place_code)
  values (p_uid, me, p_station, p_seed, p_rarity, p_place, p_place_code)
  on conflict (uid) do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('inserted', false, 'is_new', false, 'points', 0); end if;
  insert into public.point_events (user_id, amount, reason, ref) values (me, 10, 'pull', p_uid::text);
  return jsonb_build_object('inserted', true, 'is_new', first_here, 'points', 10);
end $$;

create function public.find_art(p_station text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  added int;
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into public.art_finds (user_id, station_id) values (me, p_station) on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('inserted', false, 'points', 0); end if;
  insert into public.point_events (user_id, amount, reason, ref) values (me, 50, 'art', p_station);
  return jsonb_build_object('inserted', true, 'points', 50);
end $$;

create function public.my_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points', coalesce(sum(amount), 0),
    'week_points', coalesce(sum(amount) filter (where created_at >= public.week_start()), 0)
  )
  from public.point_events where user_id = auth.uid()
$$;

create function public.leaderboard(p_scope text default 'all', p_limit int default 20)
returns table (rank bigint, username text, fav_station text, points bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select p.id, p.username, p.fav_station, coalesce(sum(e.amount), 0)::bigint as points
    from public.profiles p
    left join public.point_events e
      on e.user_id = p.id and (p_scope <> 'week' or e.created_at >= public.week_start())
    group by p.id
  ),
  ranked as (
    select rank() over (order by points desc) as rank,
           row_number() over (order by points desc, username) as pos,
           id, username, fav_station, points
    from totals
    where points > 0 or id = auth.uid()
  )
  select rank, username, fav_station, points, id = auth.uid()
  from ranked
  where pos <= p_limit or id = auth.uid()
  order by pos
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.pull_card(uuid, text, int, text, text, text) from public, anon;
revoke execute on function public.find_art(text) from public, anon;
revoke execute on function public.my_stats() from public, anon;
revoke execute on function public.leaderboard(text, int) from public, anon;
grant execute on function public.pull_card(uuid, text, int, text, text, text) to authenticated;
grant execute on function public.find_art(text) to authenticated;
grant execute on function public.my_stats() to authenticated;
grant execute on function public.leaderboard(text, int) to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
