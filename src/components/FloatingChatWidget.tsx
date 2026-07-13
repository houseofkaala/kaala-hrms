import { useState, useEffect } from 'react';
import { MessageSquare, X, Minus } from 'lucide-react';
import { ChatViewWired } from '../views/ChatViewWired';
import type { User } from '../types';
import { cn } from '../utils';

export function FloatingChatWidget({ users, currentUser }: { users: User[]; currentUser: User | null }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3 pointer-events-none safe-bottom" style={{ paddingRight: 'max(0px, env(safe-area-inset-right))' }}>
      {open && !minimized && (
        <div className="pointer-events-auto studio-chat-panel w-[min(420px,calc(100vw-1.5rem))] h-[min(560px,calc(100dvh-5.5rem))] flex flex-col overflow-hidden shadow-2xl">
          <div className="kaala-chat-widget-header flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-gold shrink-0" />
              <span className="font-display text-sm font-semibold truncate">Team Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="p-1.5 rounded-lg text-ivory-muted hover:text-gold-light hover:bg-gold/10 transition-colors"
                aria-label="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setMinimized(false); }}
                className="p-1.5 rounded-lg text-ivory-muted hover:text-gold-light hover:bg-gold/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden bg-marble">
            <ChatViewWired users={users} currentUser={currentUser} compact />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (open && minimized) {
            setMinimized(false);
          } else {
            setOpen(!open);
            setMinimized(false);
          }
        }}
        className={cn(
          'pointer-events-auto studio-chat-fab w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg',
          open && !minimized && 'ring-2 ring-gold/30',
        )}
        aria-label={open ? 'Toggle chat' : 'Open team chat'}
      >
        {open && !minimized ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}