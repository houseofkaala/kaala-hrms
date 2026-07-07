import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send } from 'lucide-react';
import { fetcher } from '../utils';
import type { User } from '../types';

interface Message { id: string; fromId: string; toId: string; content: string; createdAt: string }
interface Conversation { userId: string; name: string; lastMessage?: string }

export function ChatViewWired({ users, currentUser, compact = false }: { users: User[]; currentUser: User | null; compact?: boolean }) {
  const location = useLocation();
  const initialUserId = (location.state as { userId?: string } | null)?.userId;
  const [selectedId, setSelectedId] = useState(initialUserId || users.find(u => u.id !== currentUser?.id)?.id || '');

  useEffect(() => {
    if (initialUserId) setSelectedId(initialUserId);
  }, [initialUserId]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: () => fetcher('/api/chat/conversations'),
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['chat-messages', selectedId],
    queryFn: () => fetcher(`/api/chat/${selectedId}/messages`),
    enabled: !!selectedId,
  });

  const send = async () => {
    if (!message.trim() || !selectedId || sending) return;
    setSending(true);
    setSendError('');
    const text = message.trim();
    try {
      await fetcher(`/api/chat/${selectedId}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) });
      setMessage('');
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedId] });
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const list: Conversation[] = conversations.length ? conversations : users.filter(u => u.id !== currentUser?.id).map(u => ({ userId: u.id, name: u.name, lastMessage: undefined }));
  const filtered = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const partner = users.find(u => u.id === selectedId);

  return (
    <div className={compact ? 'flex h-full overflow-hidden bg-white' : 'bg-white border border-gray-200 rounded-2xl shadow-sm flex h-[700px] overflow-hidden'}>
      <div className={compact ? 'w-36 sm:w-44 border-r border-gray-200 flex flex-col bg-gray-50/30 shrink-0' : 'w-72 border-r border-gray-200 flex flex-col bg-gray-50/30'}>
        {!compact && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search chats..." className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400 shadow-sm" />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.userId} onClick={() => setSelectedId(c.userId)} className={`w-full p-4 border-b border-gray-100 flex items-center gap-3 hover:bg-gray-50 text-left ${selectedId === c.userId ? 'bg-gray-100' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold shrink-0 uppercase">{c.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.lastMessage || 'Start a conversation'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-white">
        {partner ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold uppercase">{partner.name.charAt(0)}</div>
              <div><p className="font-semibold text-gray-900">{partner.name}</p><p className="text-xs text-gray-500">{partner.department}</p></div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-gray-50/30">
              {messages.map(m => (
                <div key={m.id} className={m.fromId === currentUser?.id ? 'self-end bg-gray-900 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[70%]' : 'self-start bg-white border border-gray-200 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[70%]'}>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <span className="text-[10px] opacity-60 mt-2 block">{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-gray-200">
              {sendError && <p className="text-xs text-red-600 mb-2">{sendError}</p>}
              <div className="flex items-center gap-3">
                <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} type="text" placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-gray-400" disabled={sending} />
                <button onClick={send} disabled={sending} className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 shrink-0 disabled:opacity-50"><Send className="w-4 h-4 ml-0.5" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a conversation</div>
        )}
      </div>
    </div>
  );
}