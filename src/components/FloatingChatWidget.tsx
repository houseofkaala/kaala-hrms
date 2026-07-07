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
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      {open && !minimized && (
        <div className="pointer-events-auto w-[min(420px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-maroon-900 to-ink text-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold">Team Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setMinimized(false); }}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
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
          'pointer-events-auto w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95',
          open ? 'bg-gray-800 text-white' : 'bg-gradient-to-br from-maroon-800 to-maroon-950 text-white',
        )}
        aria-label={open ? 'Toggle chat' : 'Open team chat'}
      >
        {open && !minimized ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}