-- Adds points earned this calendar month (Boston time) for the raffle.

create or replace function public.my_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points', coalesce(sum(amount), 0),
    'week_points', coalesce(sum(amount) filter (where created_at >= public.week_start()), 0),
    'month_points', coalesce(sum(amount) filter (
      where created_at >= date_trunc('month', now() at time zone 'America/New_York') at time zone 'America/New_York'
    ), 0)
  )
  from public.point_events where user_id = auth.uid()
$$;

revoke execute on function public.my_stats() from public, anon;
grant execute on function public.my_stats() to authenticated;
