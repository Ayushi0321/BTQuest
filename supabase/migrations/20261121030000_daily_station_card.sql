-- One point-earning ride card per station every 24 h. Repeats still go to the album, for 0 points.
-- Place and reward cards (place_code set) are not limited.

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
  select not exists (select 1 from public.cards where user_id = me and station_id = p_station) into first_here;
  select p_place_code is null and exists (
    select 1 from public.cards
    where user_id = me and station_id = p_station and place_code is null and created_at > now() - interval '24 hours'
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

revoke execute on function public.pull_card(uuid, text, int, text, text, text) from public, anon;
grant execute on function public.pull_card(uuid, text, int, text, text, text) to authenticated;
