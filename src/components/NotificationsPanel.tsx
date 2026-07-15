import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import type { AppNotification } from '../notifications';
import { formatNotificationTime } from '../notifications';

interface NotificationsPanelProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  notifications: AppNotification[];
  unread: number;
  onMarkRead: (id: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
}

export function NotificationsPanel({
  open, onToggle, onClose, notifications, unread, onMarkRead, onMarkAllRead,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  const openNotification = async (n: AppNotification) => {
    if (!n.read) await onMarkRead(n.id);
    onClose();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={onToggle}
        className="relative p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-ivory-muted hover:text-ivory hover:bg-marble-light rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] px-0.5 items-center justify-center rounded-full bg-gold text-[9px] text-white font-bold ring-2 ring-marble-light">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-ink/40 z-40 sm:hidden" onClick={onClose} aria-hidden />
          <div
            className={cn(
              'studio-card overflow-hidden z-50',
              'fixed left-2 right-2 bottom-2 max-h-[min(70dvh,32rem)] sm:max-h-none',
              'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:left-auto sm:bottom-auto',
              'w-auto sm:w-[min(22rem,calc(100vw-1rem))]',
            )}
          >
            <div className="px-4 py-3 border-b border-slate flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ivory">Notifications</h3>
                {unread > 0 && (
                  <p className="text-[10px] text-ivory-muted mt-0.5">{unread} unread</p>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[10px] text-gold hover:text-gold-light flex items-center gap-1 transition-colors font-semibold uppercase tracking-wider"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all
                </button>
              )}
            </div>
            <div className="max-h-[min(50dvh,20rem)] sm:max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-sm text-ivory-muted text-center">No notifications yet</p>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-slate hover:bg-charcoal/30 transition-colors flex items-start gap-2',
                      !n.read && 'bg-gold/5',
                    )}
                  >
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />}
                    <div className={cn('flex-1 min-w-0', n.read && 'ml-3.5')}>
                      {n.category && (
                        <p className="text-[9px] uppercase tracking-wider text-ivory-muted mb-0.5">{n.category}</p>
                      )}
                      <p className="text-sm font-medium text-ivory">{n.title}</p>
                      <p className="text-xs text-ivory-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-ivory-muted/70 mt-1.5">
                        {formatNotificationTime(n.createdAt)}
                      </p>
                    </div>
                    {n.link && <ChevronRight className="w-4 h-4 text-ivory-muted shrink-0 mt-1" />}
                  </button>
                ))
              )}
            </div>
            <Link
              to="/notifications"
              onClick={onClose}
              className="block px-4 py-3 text-center text-xs font-semibold text-gold hover:bg-charcoal/30 border-t border-slate transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}