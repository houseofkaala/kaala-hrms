import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, clearToken, isAuthenticated } from '../auth';
import { fetcher } from '../utils';
import type { User } from '../types';
import { useRBACStore } from '../store';
import { getPortal, PORTAL_META, portalForRole, roleMatchesPortal, getPortalLoginUrl, setStoredPortal, type Portal } from '../portal';
import { PasswordInput } from '../components/PasswordInput';


export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = getPortal();
  const meta = PORTAL_META[portal];
  const { setCurrentUser } = useRBACStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const oauthHandled = useRef(false);

  const mismatch = location.state as { portalMismatch?: boolean; correctPortal?: Portal; message?: string } | null;

  useEffect(() => {
    if (mismatch?.message) setError(mismatch.message);
  }, [mismatch?.message]);

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(r => r.json())
      .then((body: { configured?: boolean }) => setGoogleAvailable(Boolean(body.configured)))
      .catch(() => setGoogleAvailable(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(oauthError);
      navigate('/login', { replace: true });
      return;
    }

    const authCode = params.get('auth_code');
    const legacyToken = params.get('token');
    if (!authCode && !legacyToken) {
      if (isAuthenticated()) navigate('/dashboard', { replace: true });
      return;
    }
    if (oauthHandled.current) return;
    oauthHandled.current = true;

    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        let token = legacyToken;
        if (authCode) {
          const exchanged = await fetcher<{ token: string }>('/api/auth/exchange', {
            method: 'POST',
            body: JSON.stringify({ code: authCode }),
          });
          token = exchanged.token;
        }
        if (!token) throw new Error('Sign-in failed');
        setToken(token);
        const user = await fetcher<User>('/api/me');
        if (cancelled) return;
        if (!roleMatchesPortal(user.role, portal)) {
          clearToken();
          const correct = portalForRole(user.role);
          window.location.href = getPortalLoginUrl(correct);
          return;
        }
        setStoredPortal(portalForRole(user.role));
        setCurrentUser(user);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (cancelled) return;
        clearToken();
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
        navigate('/login', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [location.search, navigate, portal, setCurrentUser]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/google?portal=${portal}`, {
        headers: { 'X-Portal': portal },
      });
      const body = await res.json() as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error || 'Google sign-in is not available');
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Portal': portal },
        body: JSON.stringify({ email, password, portal }),
      });
      let body: { error?: string; correctPortal?: string; token?: string; user?: User } = {};
      try {
        body = await res.json();
      } catch {
        throw new Error(res.ok ? 'Login failed' : `Login failed (${res.status})`);
      }
      if (!res.ok) {
        if (body.correctPortal === 'admin' || body.correctPortal === 'employee') {
          window.location.href = getPortalLoginUrl(body.correctPortal);
          return;
        }
        throw new Error(body.error || 'Login failed');
      }
      const user = body.user as User;
      if (!roleMatchesPortal(user.role, portal)) {
        const correct = portalForRole(user.role);
        window.location.href = getPortalLoginUrl(correct);
        return;
      }
      setToken(body.token!);
      setStoredPortal(portalForRole(user.role));
      setCurrentUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col items-center text-center mb-8">
            <img src="/logo.svg" alt="House of Kaala" className="w-16 h-16 rounded-[18px] mb-4 shadow-sm" />
            <h1 className="text-[22px] font-semibold text-ivory tracking-tight">House of Kaala</h1>
            <p className="text-[15px] text-ivory-muted mt-1">{meta.title}</p>
          </div>

          <div className="studio-login-card p-8">
            <div className="mb-6">
              <h2 className="text-[22px] font-semibold text-ivory tracking-tight">Sign In</h2>
              <p className="text-[15px] text-ivory-muted mt-1">Use your company credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-ivory mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ivory mb-1.5">Password</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  className="input-field"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 mt-2 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {googleAvailable && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate" />
                  <span className="text-[13px] text-ivory-muted">or</span>
                  <div className="flex-1 h-px bg-slate" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg border border-slate text-[15px] text-ivory hover:bg-marble-light transition-colors disabled:opacity-50"
                >
                  Continue with Google
                </button>
              </>
            )}

            <p className="text-[13px] text-ivory-muted text-center mt-6">
              Contact HR if you need access to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}