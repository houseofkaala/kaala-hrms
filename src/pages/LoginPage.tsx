import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, isAuthenticated } from '../auth';
import type { User } from '../types';
import { useRBACStore } from '../store';
import { getPortal, getPortalLoginUrl, PORTAL_META, portalForRole, roleMatchesPortal, type Portal } from '../portal';
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
          throw new Error(`${body.error} Sign in at ${getPortalLoginUrl(body.correctPortal)}`);
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
      {/* Animated mesh blobs */}
      <div className="login-blob w-[50vw] h-[50vw] -top-[10%] -left-[10%] bg-maroon-700/40" style={{ animationDelay: '0s' }} />
      <div className="login-blob w-[40vw] h-[40vw] bottom-[-15%] right-[-5%] bg-maroon-900/50" style={{ animationDelay: '-5s' }} />
      <div className="login-blob w-[25vw] h-[25vw] top-[40%] left-[30%] bg-maroon-500/20" style={{ animationDelay: '-8s' }} />

      {/* Giant outline typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="login-giant-type">KAALA</span>
      </div>

      {/* Diagonal light sweep */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(-55deg, white 0px, white 1px, transparent 1px, transparent 48px)',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] atelier-reveal">
          {/* Floating glass card — asymmetric corner */}
          <div
            className="relative bg-white/95 backdrop-blur-xl p-8 sm:p-10 shadow-2xl"
            style={{
              borderRadius: '2rem 2rem 2rem 0.5rem',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            <div className="absolute -top-px left-8 right-8 h-[3px] bg-gradient-to-r from-ink via-maroon-600 to-transparent rounded-full" />

            <div className="flex items-start justify-between mb-10">
              <div>
                <p className="font-accent text-[10px] uppercase tracking-[0.45em] text-maroon-500 mb-2">{meta.title}</p>
                <h1 className="font-display text-4xl font-semibold text-maroon-950 leading-none">
                  House of<br /><span className="italic font-normal text-maroon-700">Kaala</span>
                </h1>
                <p className="text-xs text-maroon-500/80 mt-2">{meta.subtitle}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-maroon-800 to-ink flex items-center justify-center font-display text-xl text-white font-bold shadow-lg">K</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-accent text-[10px] uppercase tracking-[0.3em] text-maroon-700/80 mb-2">Email</label>
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
                <label className="block font-accent text-[10px] uppercase tracking-[0.3em] text-maroon-700/80 mb-2">Password</label>
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
                className="group w-full relative overflow-hidden bg-ink text-white py-4 rounded-2xl text-sm font-accent font-semibold uppercase tracking-[0.15em] hover:bg-maroon-950 transition-all disabled:opacity-50 mt-2"
              >
                <span className="relative z-10">{loading ? 'Entering...' : 'Enter the Atelier'}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-maroon-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </form>
          </div>

          <div className="mt-6 px-2 text-[11px] text-white/40 space-y-2 font-light">
            <p className="font-accent uppercase tracking-widest text-white/25 text-[9px]">Other portals</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(['employee', 'admin'] as Portal[]).filter(p => p !== portal).map(p => (
                <a key={p} href={getPortalLoginUrl(p)} className="text-white/50 hover:text-white underline-offset-2 hover:underline">
                  {PORTAL_META[p].title}
                </a>
              ))}
            </div>
            <p className="text-white/35 text-[10px] pt-1">
              Use your company email and password. Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}