import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { fetcher } from '../utils';

interface ChatThreadOverview {
  userA: string;
  userB: string;
  userAName: string;
  userBName: string;
  messageCount: number;
  lastMessage?: string;
  lastAt?: string;
}

interface ChatOverview {
  totalMessages: number;
  threadCount: number;
  threads: ChatThreadOverview[];
}

export function ChatModerationSettings() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery<ChatOverview>({
    queryKey: ['admin-chat-overview'],
    queryFn: () => fetcher('/api/admin/chat/overview'),
  });

  const invalidateChat = () => {
    qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
    qc.invalidateQueries({ queryKey: ['admin-chat-overview'] });
  };

  const deleteThread = async (userA: string, userB: string) => {
    const label = `${data?.threads.find(t => t.userA === userA && t.userB === userB)?.userAName ?? userA} ↔ ${data?.threads.find(t => t.userA === userA && t.userB === userB)?.userBName ?? userB}`;
    if (!confirm(`Delete all messages in the conversation between ${label}?`)) return;
    setBusy(`${userA}:${userB}`);
    setError('');
    try {
      await fetcher('/api/admin/chat/threads', {
        method: 'DELETE',
        body: JSON.stringify({ userA, userB }),
      });
      invalidateChat();
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete conversation');
    } finally {
      setBusy(null);
    }
  };

  const deleteUserChats = async (userId: string, name: string) => {
    if (!confirm(`Delete every team chat message involving ${name}?`)) return;
    setBusy(`user:${userId}`);
    setError('');
    try {
      await fetcher(`/api/admin/chat/users/${userId}`, { method: 'DELETE' });
      invalidateChat();
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user chats');
    } finally {
      setBusy(null);
    }
  };

  const purgeAll = async () => {
    if (!confirm('Delete ALL team chat messages? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Every direct message will be permanently removed.')) return;
    setBusy('all');
    setError('');
    try {
      await fetcher('/api/admin/chat', {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
      });
      invalidateChat();
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to purge chats');
    } finally {
      setBusy(null);
    }
  };

  const threads = data?.threads || [];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Team Chat Moderation
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Review and delete direct messages between employees. Project chat is not affected.
          </p>
        </div>
        <button
          type="button"
          onClick={purgeAll}
          disabled={busy != null || (data?.totalMessages || 0) === 0}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
        >
          Delete all chats
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total messages</p>
          <p className="text-xl font-semibold text-gray-900">{data?.totalMessages ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Conversations</p>
          <p className="text-xl font-semibold text-gray-900">{data?.threadCount ?? '—'}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading chat overview…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-gray-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> No team chat messages stored.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {threads.map(thread => {
            const key = `${thread.userA}:${thread.userB}`;
            const deleting = busy === key;
            return (
              <div key={key} className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {thread.userAName} ↔ {thread.userBName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {thread.messageCount} messages
                    {thread.lastAt ? ` · last ${new Date(thread.lastAt).toLocaleString()}` : ''}
                  </p>
                  {thread.lastMessage && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">“{thread.lastMessage}”</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title={`Delete all chats involving ${thread.userAName}`}
                    onClick={() => deleteUserChats(thread.userA, thread.userAName)}
                    disabled={busy != null}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete this conversation"
                    onClick={() => deleteThread(thread.userA, thread.userB)}
                    disabled={busy != null}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                  >
                    {deleting ? 'Deleting…' : 'Delete thread'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}