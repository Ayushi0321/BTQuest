/**
 * useAlerts(route): service alerts on a route active right now.
 *
 *   const { alerts } = useAlerts('Green-B');   // default 'Red'
 *
 * - `alerts`: most severe first (see `Alert` in @/api/mbta). Watch for
 *   effect 'SHUTTLE' / 'SUSPENSION', which mean part of the line has no trains.
 * - Polls every 60 s; pauses when unfocused or in the background.
 * - Errors are swallowed (alerts are nice-to-have); `error` is exposed for debugging.
 */
import { useCallback } from 'react';

import { getAlerts, type Alert, type RouteId } from '@/api/mbta';
import { usePolling } from '@/hooks/usePolling';

const POLL_MS = 60_000;

export function useAlerts(route: RouteId = 'Red'): { alerts: Alert[]; error?: string } {
  const fetcher = useCallback(() => getAlerts(route), [route]);
  const { data, error } = usePolling(fetcher, POLL_MS, route);
  return { alerts: data ?? [], error };
}
