import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { fetcher, cn } from '../utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsView() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Notification[]; unread: number }>({
    queryKey: ['notifications'],
    queryFn: () => fetcher('/api/notifications'),
  });

  const notifications = data?.data || [];
  const unread = data?.unread || 0;

  const markRead = async (id: string) => {
    await fetcher(`/api/notifications/${id}/read`, { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllRead = async () => {
    await fetcher('/api/notifications/read-all', { method: 'PATCH' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={cn(
                  'w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors',
                  !n.read && 'bg-blue-50/20',
                )}
              >
                <div className="flex items-start gap-3">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                  <div className={cn(!n.read ? '' : 'ml-5')}>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}