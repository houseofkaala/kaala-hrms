import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, clearToken, isAuthenticated } from '../auth';
import { fetcher } from '../utils';
import type { User } from '../types';
import { useRBACStore } from '../store';
import { getPortal, PORTAL_META, portalForRole, roleMatchesPortal, getPortalLoginUrl, type Portal } from '../portal';
import { PasswordInput } from '../components/PasswordInput';
import { ThemeToggle } from '../components/ThemeToggle';

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
      setToken(body.token);
      setCurrentUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-obsidian kaala-grain kaala-jaali kaala-marble">
      <div className="absolute top-4 right-4 z-20 safe-top">
        <ThemeToggle />
      </div>
      <div className="kaala-ambient" aria-hidden />
      <div className="login-blob w-[45vw] h-[45vw] -top-[15%] -left-[10%] bg-gold/20" />
      <div className="login-blob w-[35vw] h-[35vw] bottom-[-10%] right-[-5%] bg-gold-muted/15" />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative">
          <div className="studio-reveal">
            <img src="/logo.svg" alt="" className="w-12 h-12 rounded-xl mb-10 opacity-90 ring-1 ring-gold/20" />
            <p className="login-editorial-sub mb-8">{meta.title}</p>
            <h1 className="login-editorial-type">
              House<br />of<br />Kaala
            </h1>
            <div className="executive-profile-divider my-10 max-w-xs" />
            <p className="max-w-sm text-sm leading-relaxed text-ivory-muted">
              A luxury operating environment for your creative studio — attendance, culture, projects, and everything in between.
            </p>
          </div>
          <p className="login-editorial-sub studio-reveal studio-reveal-d2">
            Human Resource Management
          </p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px] studio-reveal studio-reveal-d1">
            <div className="lg:hidden flex flex-col items-center text-center mb-8">
              <img src="/logo.svg" alt="House of Kaala" className="w-14 h-14 rounded-2xl mb-3 ring-1 ring-gold/25" />
              <p className="login-editorial-sub">{meta.title}</p>
            </div>

            <div className="studio-login-card relative p-8 sm:p-10">
              <div className="gold-corners" aria-hidden><span /></div>
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />

              <div className="mb-8">
                <p className="studio-kicker mb-2">Welcome back</p>
                <h2 className="font-display text-3xl font-medium text-ivory">Sign in</h2>
                <p className="text-sm text-ivory-muted mt-2">Use your company credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="studio-kicker block mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field bg-transparent border-0 border-b border-gold/20 rounded-none px-0 focus:border-gold/50"
                    placeholder="you@bymarketingonly.com"
                    required
                  />
                </div>
                <div>
                  <label className="studio-kicker block mb-2">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    className="w-full bg-transparent border-0 border-b border-gold/20 rounded-none px-0 py-3 text-sm text-ivory outline-none focus:border-gold/50 transition-colors"
                    required
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-300/90 bg-red-950/30 px-3 py-2 rounded-lg border-l border-red-400/40">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 mt-2 disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {googleAvailable && (
                <>
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gold/15" />
                    <span className="text-[10px] uppercase tracking-widest text-ivory-muted">or</span>
                    <div className="flex-1 h-px bg-gold/15" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 rounded-lg border border-gold/25 text-sm text-ivory hover:bg-gold/5 transition-colors disabled:opacity-50"
                  >
                    Continue with Google
                  </button>
                </>
              )}

              <p className="text-xs text-ivory-muted text-center mt-8">
                Contact HR if you need access to your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}