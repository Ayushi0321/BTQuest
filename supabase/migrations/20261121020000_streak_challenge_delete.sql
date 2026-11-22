-- Day streak and weekly art count in my_stats, plus self-service account deletion.

create or replace function public.my_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  with ev as (
    select amount, created_at from public.point_events where user_id = auth.uid()
  ),
  days as (
    select distinct (created_at at time zone 'America/New_York')::date as d from ev
  ),
  runs as (
    select d, d - (row_number() over (order by d))::int as grp from days
  ),
  last_run as (
    select max(d) as last_day, count(*) as len from runs group by grp order by max(d) desc limit 1
  )
  select jsonb_build_object(
    'points', (select coalesce(sum(amount), 0) from ev),
    'week_points', (select coalesce(sum(amount), 0) from ev where created_at >= public.week_start()),
    'month_points', (select coalesce(sum(amount), 0) from ev
      where created_at >= date_trunc('month', now() at time zone 'America/New_York') at time zone 'America/New_York'),
    'streak', coalesce((select len from last_run where last_day >= (now() at time zone 'America/New_York')::date - 1), 0),
    'week_art', (select count(*) from public.art_finds where user_id = auth.uid() and found_at >= public.week_start())
  )
$$;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.my_stats() from public, anon;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.my_stats() to authenticated;
grant execute on function public.delete_account() to authenticated;
