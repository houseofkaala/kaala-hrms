import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Search, Send } from 'lucide-react';
import { cn, fetcher } from '../utils';
import type { User } from '../types';
import { UserPortrait } from '../components/UserPortrait';

interface Message { id: string; fromId: string; toId: string; content: string; createdAt: string }
interface Conversation { userId: string; name: string; lastMessage?: string }

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatViewWired({ users, currentUser, compact = false }: { users: User[]; currentUser: User | null; compact?: boolean }) {
  const location = useLocation();
  const initialUserId = (location.state as { userId?: string } | null)?.userId;
  const [selectedId, setSelectedId] = useState(initialUserId || users.find(u => u.id !== currentUser?.id)?.id || '');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [mobileShowList, setMobileShowList] = useState(true);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUserId) setSelectedId(initialUserId);
  }, [initialUserId]);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: () => fetcher('/api/chat/conversations'),
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['chat-messages', selectedId],
    queryFn: () => fetcher(`/api/chat/${selectedId}/messages`),
    enabled: !!selectedId,
  });

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedId]);

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

  const list: Conversation[] = conversations.length
    ? conversations
    : users.filter(u => u.id !== currentUser?.id).map(u => ({ userId: u.id, name: u.name, lastMessage: undefined }));

  const filtered = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const partner = users.find(u => u.id === selectedId);

  return (
    <div className={cn('kaala-chat flex overflow-hidden', compact ? 'h-full rounded-none border-0' : 'view-panel-height')}>
      <div
        className={cn(
          'kaala-chat-sidebar flex flex-col shrink-0',
          compact ? 'w-[9.5rem] sm:w-44' : 'w-full md:w-72',
          !compact && (mobileShowList ? 'flex' : 'hidden md:flex'),
          compact && 'flex',
        )}
      >
        <div className={cn('border-b border-[var(--chat-border)]', compact ? 'p-2' : 'p-4')}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gold-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder={compact ? 'Search…' : 'Search teammates…'}
              className={cn('kaala-chat-search w-full pl-9 pr-3', compact ? 'py-1.5 text-xs' : 'py-2 text-sm')}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto premium-scrollbar">
          {filtered.length === 0 ? (
            <p className="kaala-chat-empty text-xs text-center px-3 py-8">No teammates found</p>
          ) : (
            filtered.map(c => {
              const user = users.find(u => u.id === c.userId);
              return (
                <button
                  key={c.userId}
                  type="button"
                  data-active={selectedId === c.userId}
                  onClick={() => { setSelectedId(c.userId); setMobileShowList(false); }}
                  className={cn(
                    'kaala-chat-contact w-full flex items-center gap-2.5 text-left border-b border-[var(--chat-border)] min-h-[44px]',
                    compact ? 'px-2 py-2.5' : 'px-4 py-3 gap-3',
                  )}
                >
                  <UserPortrait
                    userId={c.userId}
                    name={c.name}
                    hasProfileImage={user?.hasProfileImage}
                    size="small"
                    framed={false}
                    className="!w-9 !h-9 !text-xs rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-ivory truncate', compact ? 'text-xs' : 'text-sm')}>{c.name}</p>
                    {!compact && (
                      <p className="text-[11px] text-ivory-muted truncate mt-0.5">{c.lastMessage || 'Start a conversation'}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          !compact && mobileShowList && 'hidden md:flex',
          compact && 'min-w-0',
        )}
      >
        {partner ? (
          <>
            <div className={cn('kaala-chat-header flex items-center gap-3 shrink-0', compact ? 'px-3 py-2.5' : 'px-4 sm:px-6 py-3 sm:py-4 gap-4')}>
              {!compact && (
                <button
                  type="button"
                  onClick={() => setMobileShowList(true)}
                  className="md:hidden shrink-0 flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg text-ivory-muted hover:text-gold-light hover:bg-gold/5 transition-colors"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <UserPortrait
                userId={partner.id}
                name={partner.name}
                hasProfileImage={partner.hasProfileImage}
                size="small"
                framed={false}
                className="!w-10 !h-10 !text-sm rounded-full"
              />
              <div className="min-w-0">
                <p className={cn('font-semibold text-ivory truncate', compact ? 'text-sm' : 'text-base')}>{partner.name}</p>
                <p className="text-[11px] text-ivory-muted truncate">{partner.department || partner.title || 'Team member'}</p>
              </div>
            </div>

            <div
              ref={threadRef}
              className={cn(
                'kaala-chat-thread flex-1 overflow-y-auto premium-scrollbar flex flex-col gap-3',
                compact ? 'p-3' : 'p-4 sm:p-6 gap-4',
              )}
            >
              {messagesLoading && messages.length === 0 ? (
                <p className="kaala-chat-empty text-sm text-center py-10">Loading messages…</p>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5 text-gold" />
                  </div>
                  <p className="text-sm text-ivory font-medium">Say hello to {partner.name.split(' ')[0]}</p>
                  <p className="text-xs text-ivory-muted mt-1">Your conversation is private between the two of you.</p>
                </div>
              ) : (
                messages.map(m => {
                  const mine = m.fromId === currentUser?.id;
                  return (
                    <div key={m.id} className={cn('kaala-chat-bubble', mine ? 'kaala-chat-bubble--sent' : 'kaala-chat-bubble--received')}>
                      <p>{m.content}</p>
                      <time>{formatMessageTime(m.createdAt)}</time>
                    </div>
                  );
                })
              )}
            </div>

            <div className={cn('kaala-chat-compose shrink-0', compact ? 'p-2.5' : 'p-4')}>
              {sendError && <p className="text-xs text-red-300/90 mb-2 px-1">{sendError}</p>}
              <div className="flex items-center gap-2">
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  type="text"
                  placeholder="Type a message…"
                  className="kaala-chat-input"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !message.trim()}
                  className="kaala-chat-send shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center kaala-chat-empty px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-gold" />
            </div>
            <p className="text-sm font-medium text-ivory">Select a teammate</p>
            <p className="text-xs text-ivory-muted mt-1 max-w-xs">Choose someone from the list to start a direct message.</p>
          </div>
        )}
      </div>
    </div>
  );
}