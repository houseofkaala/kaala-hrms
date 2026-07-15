import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { cn } from '../utils';
import { useInAppNotifications } from '../hooks/useInAppNotifications';
import { formatNotificationTime } from '../notifications';

export function NotificationsView() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { notifications, unread, isLoading, markRead, markAllRead } = useInAppNotifications();

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications;
  }, [notifications, filter]);

  const openNotification = async (id: string, link?: string, read?: boolean) => {
    if (!read) await markRead(id);
    if (link) navigate(link);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="studio-card px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ivory">Notifications</h2>
          <p className="text-sm text-ivory-muted mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate overflow-hidden">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn('px-3 py-1.5 text-xs font-semibold', filter === 'all' ? 'bg-charcoal text-ivory' : 'text-ivory-muted')}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn('px-3 py-1.5 text-xs font-semibold', filter === 'unread' ? 'bg-charcoal text-ivory' : 'text-ivory-muted')}
            >
              Unread
            </button>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="studio-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ivory-muted">Loading notifications…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ivory-muted">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
            <p className="text-xs mt-2 max-w-sm mx-auto">
              You will see alerts here for leave updates, tasks, attendance, payroll, and more.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate">
            {filtered.map(n => (
              <button
                key={n.id}
                onClick={() => openNotification(n.id, n.link, n.read)}
                className={cn(
                  'w-full text-left px-6 py-4 hover:bg-charcoal/20 transition-colors flex items-start gap-3',
                  !n.read && 'bg-gold/5',
                )}
              >
                {!n.read && <span className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />}
                <div className={cn('flex-1 min-w-0', n.read && 'ml-5')}>
                  {n.category && (
                    <p className="text-[10px] uppercase tracking-wider text-ivory-muted mb-1">{n.category}</p>
                  )}
                  <p className="font-medium text-ivory">{n.title}</p>
                  <p className="text-sm text-ivory-muted mt-0.5">{n.message}</p>
                  <p className="text-xs text-ivory-muted/70 mt-1.5">{formatNotificationTime(n.createdAt)}</p>
                </div>
                {n.link && <ChevronRight className="w-4 h-4 text-ivory-muted shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}