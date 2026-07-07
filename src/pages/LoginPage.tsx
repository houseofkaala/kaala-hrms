import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, isAuthenticated } from '../auth';
import type { User } from '../types';
import { useRBACStore } from '../store';
import { getPortal, PORTAL_META, portalForRole, roleMatchesPortal, type Portal } from '../portal';
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

  const mismatch = location.state as { portalMismatch?: boolean; correctPortal?: Portal; message?: string } | null;

  useEffect(() => {
    if (mismatch?.message) setError(mismatch.message);
  }, [mismatch?.message]);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

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
      const body = await res.json();
      if (!res.ok) {
        if (body.correctPortal) {
          throw new Error(body.error || 'Login failed');
        }
        throw new Error(body.error || 'Login failed');
      }
      const user = body.user as User;
      if (!roleMatchesPortal(user.role, portal)) {
        const correct = portalForRole(user.role);
        throw new Error(`This account belongs on the ${PORTAL_META[correct].title}.`);
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
    <div className="min-h-screen relative overflow-hidden bg-ink kaala-grain">
      <div className="login-blob w-[50vw] h-[50vw] -top-[10%] -left-[10%] bg-maroon-700/40" style={{ animationDelay: '0s' }} />
      <div className="login-blob w-[40vw] h-[40vw] bottom-[-15%] right-[-5%] bg-maroon-900/50" style={{ animationDelay: '-5s' }} />
      <div className="absolute inset-0 studio-grid opacity-[0.04] pointer-events-none" />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Editorial left panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative">
          <div className="studio-reveal">
            <img src="/logo.svg" alt="" className="w-12 h-12 rounded-xl mb-8 opacity-90" />
            <p className="login-editorial-sub mb-6">{meta.title}</p>
            <h1 className="login-editorial-type">
              House<br />of<br />Kaala
            </h1>
            <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/40">
              A creative studio workspace for your team — attendance, tasks, culture, and everything in between.
            </p>
          </div>
          <p className="login-editorial-sub studio-reveal studio-reveal-d2">
            Human Resource Management
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px] studio-reveal studio-reveal-d1">
            <div className="lg:hidden flex flex-col items-center text-center mb-8">
              <img src="/logo.svg" alt="House of Kaala" className="w-14 h-14 rounded-2xl shadow-lg mb-3" />
              <p className="login-editorial-sub text-maroon-400">{meta.title}</p>
            </div>

            <div className="studio-login-card relative p-8 sm:p-10">
              <div className="absolute -top-px left-8 right-8 h-[3px] bg-gradient-to-r from-ink via-maroon-600 to-transparent rounded-full" />

              <div className="mb-8">
                <p className="studio-kicker mb-2">Welcome back</p>
                <h2 className="font-display text-3xl font-semibold text-maroon-950">Sign in</h2>
                <p className="text-sm text-maroon-600/70 mt-1">Use your company credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="studio-kicker block mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-cream/50 border-0 border-b-2 border-maroon-200 rounded-none px-0 py-3 text-sm text-ink outline-none focus:border-maroon-600 transition-colors placeholder:text-maroon-300"
                    placeholder="you@bymarketingonly.com"
                    required
                  />
                </div>
                <div>
                  <label className="studio-kicker block mb-2">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    className="w-full bg-cream/50 border-0 border-b-2 border-maroon-200 rounded-none px-0 py-3 text-sm text-ink outline-none focus:border-maroon-600 transition-colors"
                    required
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-maroon-800 bg-maroon-50 px-3 py-2 rounded-lg border-l-2 border-maroon-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 mt-2 disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="text-xs text-maroon-500/70 text-center mt-6">
                Contact HR if you need access to your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}