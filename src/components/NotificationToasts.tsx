import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { useNotificationToastStore } from '../store';
import { fetcher, cn } from '../utils';

function ToastItem({
  id, title, message, link, onDismiss, onOpen,
}: {
  id: string;
  title: string;
  message: string;
  link?: string;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        'studio-card shadow-xl border-gold/20 p-4 w-[min(22rem,calc(100vw-2rem))]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-gold" />
        </div>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-ivory leading-snug">{title}</p>
          <p className="text-xs text-ivory-muted mt-1 line-clamp-2">{message}</p>
          {link && (
            <p className="text-[10px] text-gold mt-2 font-semibold uppercase tracking-wider">Tap to view</p>
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-ivory-muted hover:text-ivory rounded shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function NotificationToasts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toasts = useNotificationToastStore(s => s.toasts);
  const removeToast = useNotificationToastStore(s => s.removeToast);

  const openToast = async (id: string, link?: string) => {
    try {
      await fetcher(`/api/notifications/${id}/read`, { method: 'PATCH' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch { /* ignore */ }
    removeToast(id);
    if (link) navigate(link);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[4.5rem] right-3 sm:right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem
            id={t.id}
            title={t.title}
            message={t.message}
            link={t.link}
            onDismiss={() => removeToast(t.id)}
            onOpen={() => openToast(t.id, t.link)}
          />
        </div>
      ))}
    </div>
  );
}