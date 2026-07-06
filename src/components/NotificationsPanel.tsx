import { useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher } from '../utils';
import { cn } from '../utils';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsPanelProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function NotificationsPanel({ open, onToggle, onClose }: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery<{ data: Notification[]; unread: number }>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/api/notifications'),
    refetchInterval: 10000,
  });

  const notifications = data?.data || [];
  const unread = data?.unread || 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  const markRead = async (id: string) => {
    await fetcher(`/api/notifications/${id}/read`, { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await fetcher('/api/notifications/read-all', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={onToggle}
        className="relative p-2.5 text-maroon-500 hover:text-maroon-900 hover:bg-maroon-50 rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] text-white font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-maroon-100 rounded-2xl shadow-xl shadow-maroon-900/10 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-maroon-50 flex items-center justify-between bg-maroon-50/50">
            <h3 className="text-sm font-semibold text-maroon-900 font-display">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-maroon-600 hover:text-maroon-900 flex items-center gap-1 font-medium">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-maroon-400 text-center">No notifications</p>
            ) : (
              notifications.slice(0, 8).map(n => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-maroon-50 hover:bg-maroon-50/50 transition-colors',
                    !n.read && 'bg-maroon-50/80',
                  )}
                >
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="text-xs text-maroon-700/70 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-maroon-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={onClose}
            className="block px-4 py-3 text-center text-xs font-semibold text-maroon-700 hover:bg-maroon-50 border-t border-maroon-50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}