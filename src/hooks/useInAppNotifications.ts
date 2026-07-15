import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { fetcher } from '../utils';
import type { NotificationsResponse } from '../notifications';
import { useNotificationToastStore } from '../store';

const POLL_MS = 30_000;

export function useInAppNotifications(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/api/notifications'),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    staleTime: 15_000,
  });

  const markRead = async (id: string) => {
    await fetcher(`/api/notifications/${id}/read`, { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await fetcher('/api/notifications/read-all', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return {
    notifications: query.data?.data ?? [],
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markRead,
    markAllRead,
  };
}

/** Show toast banners when new notifications arrive (call once in App shell). */
export function useNotificationAlerts(enabled: boolean, notifications: NotificationsResponse['data']) {
  const addToast = useNotificationToastStore(s => s.addToast);
  const baselineRef = useRef<Set<string> | null>(null);
  const sessionStartRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!enabled || !notifications) return;

    if (baselineRef.current === null) {
      baselineRef.current = new Set(notifications.map(n => n.id));
      return;
    }

    const fresh = notifications.filter(n => {
      if (baselineRef.current!.has(n.id)) return false;
      if (n.read) return false;
      return new Date(n.createdAt).getTime() >= new Date(sessionStartRef.current).getTime() - 5000;
    });

    for (const n of fresh.slice(0, 3)) {
      baselineRef.current.add(n.id);
      addToast({ id: n.id, title: n.title, message: n.message, link: n.link });
    }

    for (const n of notifications) baselineRef.current.add(n.id);
  }, [enabled, notifications, addToast]);
}