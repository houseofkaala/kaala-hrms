import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetcher } from '../utils';
import { clearToken, isAuthenticated } from '../auth';
import type { User } from '../types';
import { useRBACStore } from '../store';
import { getPortal, getPortalLoginUrl, portalForRole, roleMatchesPortal, PORTAL_META } from '../portal';

export function PortalGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const portal = getPortal();
  const { setCurrentUser } = useRBACStore();
  const [checking, setChecking] = useState(isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated()) return;

    let cancelled = false;
    (async () => {
      try {
        const user = await fetcher<User>('/api/me');
        if (cancelled) return;

        if (!roleMatchesPortal(user.role, portal)) {
          clearToken();
          setCurrentUser(null);
          const correct = portalForRole(user.role);
          navigate('/login', {
            replace: true,
            state: {
              portalMismatch: true,
              correctPortal: correct,
              message: `${PORTAL_META[portal].roleLabel} only. Your account uses the ${PORTAL_META[correct].title}.`,
            },
          });
          return;
        }

        setCurrentUser(user);
        setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [portal, navigate, setCurrentUser]);

  if (checking) {
    return (
      <div className="min-h-screen kaala-mesh flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-maroon-200 border-t-maroon-700 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}