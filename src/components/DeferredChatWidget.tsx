import { Suspense, useEffect, useState } from 'react';
import type { User } from '../types';
import { FloatingChatWidget } from '../lazy-views';

export function DeferredChatWidget({ users, currentUser }: { users: User[]; currentUser: User }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(show, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(show, 2500);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <FloatingChatWidget users={users} currentUser={currentUser} />
    </Suspense>
  );
}