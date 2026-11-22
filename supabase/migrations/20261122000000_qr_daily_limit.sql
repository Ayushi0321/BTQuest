-- QR and reward cards now earn points once per code every 24 h (ride cards: once per station every 24 h, unchanged).
-- Only known codes are accepted, so a made-up place_code can't be used to dodge the limit.
-- find_art only accepts stations that have an artwork, so it can't be farmed with fake station ids.
-- Keep these lists in sync with src/data/places.ts (QR_TARGETS) and src/data/lines.ts (champion codes).

create or replace function public.pull_card(
  p_uid uuid, p_station text, p_seed int, p_rarity text, p_place text default null, p_place_code text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  first_here boolean;
  repeat_today boolean;
  added int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_place_code is not null and p_place_code not in (
    'HARVARD-YARD', 'MIT-DOME', 'ESPLANADE', 'BOSTON-COMMON', 'FANEUIL-HALL', 'SOUTH-STATION',
    'CITY-HALL-PLAZA', 'PUBLIC-GARDEN', 'BOSTON-PUBLIC-LIBRARY', 'FENWAY-PARK', 'BC-GASSON-HALL',
    'ART-KENDALL-BAND', 'ART-GLOVE-CYCLE',
    'RED-CHAMPION', 'GREEN-B-CHAMPION'
  ) then
    raise exception 'unknown place code';
  end if;
  -- One pull at a time per rider, so two quick calls can't both see "nothing in the last 24 h".
  perform pg_advisory_xact_lock(hashtext('pull_card:' || me::text));
  select not exists (select 1 from public.cards where user_id = me and station_id = p_station) into first_here;
  select exists (
    select 1 from public.cards
    where user_id = me and created_at > now() - interval '24 hours'
      and (
        (p_place_code is null and place_code is null and station_id = p_station)
        or (p_place_code is not null and place_code = p_place_code)
      )
  ) into repeat_today;
  insert into public.cards (uid, user_id, station_id, seed, rarity, place, place_code)
  values (p_uid, me, p_station, p_seed, p_rarity, p_place, p_place_code)
  on conflict (uid) do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('inserted', false, 'is_new', false, 'points', 0, 'repeat', false); end if;
  if repeat_today then return jsonb_build_object('inserted', true, 'is_new', first_here, 'points', 0, 'repeat', true); end if;
  insert into public.point_events (user_id, amount, reason, ref) values (me, 10, 'pull', p_uid::text);
  return jsonb_build_object('inserted', true, 'is_new', first_here, 'points', 10, 'repeat', false);
end $$;

create or replace function public.find_art(p_station text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  added int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_station not in ('KEN', 'POR') then raise exception 'no artwork at this station'; end if;
  insert into public.art_finds (user_id, station_id) values (me, p_station) on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('inserted', false, 'points', 0); end if;
  insert into public.point_events (user_id, amount, reason, ref) values (me, 50, 'art', p_station);
  return jsonb_build_object('inserted', true, 'points', 50);
end $$;

revoke execute on function public.pull_card(uuid, text, int, text, text, text) from public, anon;
revoke execute on function public.find_art(text) from public, anon;
grant execute on function public.pull_card(uuid, text, int, text, text, text) to authenticated;
grant execute on function public.find_art(text) to authenticated;
