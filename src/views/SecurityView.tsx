import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Key, Monitor, LogOut, AlertTriangle, Clock, Users, RefreshCw,
} from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { getPortal } from '../portal';

interface SessionInfo {
  token: string;
  createdAt: string;
  expiresAt: string;
  ip?: string;
  userAgent?: string;
  current?: boolean;
}

interface AuditEntry {
  id: string;
  event: string;
  label: string;
  ip?: string;
  detail?: string;
  createdAt: string;
}

interface SecurityOverview {
  twoFactorRequired: boolean;
  sessions: SessionInfo[];
  activity: AuditEntry[];
}

interface AdminSessionUser {
  userId: string;
  user: { id: string; name: string; email: string; role: string } | null;
  sessionCount: number;
  lastLogin?: string;
  sessions: SessionInfo[];
}

interface AdminSecurityOverview {
  twoFactorRequired: boolean;
  activeSessionCount: number;
  usersWithSessions: number;
  activeSessions: AdminSessionUser[];
  auditLog: (AuditEntry & { userName?: string; actorName?: string })[];
}

function parseUserAgent(ua?: string): string {
  if (!ua) return 'Unknown device';
  if (ua.includes('Mobile')) return 'Mobile browser';
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Linux')) return 'Linux';
  return ua.slice(0, 48);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SecurityView() {
  const queryClient = useQueryClient();
  const { currentUser } = useRBACStore();
  const isAdminPortal = getPortal() === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const showAdminPanel = isAdminPortal && (currentUser?.role === 'admin' || currentUser?.role === 'manager');

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: overview, isLoading } = useQuery<SecurityOverview>({
    queryKey: ['security-overview'],
    queryFn: () => fetcher('/api/security/overview'),
  });

  const { data: adminOverview, isLoading: adminLoading } = useQuery<AdminSecurityOverview>({
    queryKey: ['admin-security-overview'],
    queryFn: () => fetcher('/api/admin/security/overview'),
    enabled: showAdminPanel,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['security-overview'] });
    queryClient.invalidateQueries({ queryKey: ['admin-security-overview'] });
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await fetcher('/api/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPasswordSuccess(true);
      refresh();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const revokeOthers = async () => {
    if (!confirm('Sign out all other devices? Your current session will stay active.')) return;
    setRevoking('others');
    try {
      await fetcher('/api/security/sessions/revoke-others', { method: 'POST' });
      refresh();
    } finally {
      setRevoking(null);
    }
  };

  const revokeSession = async (token: string) => {
    if (!confirm('End this session?')) return;
    setRevoking(token);
    try {
      await fetcher(`/api/security/sessions/${token}`, { method: 'DELETE' });
      refresh();
    } finally {
      setRevoking(null);
    }
  };

  const adminRevokeUser = async (userId: string, name: string) => {
    if (!confirm(`Sign out all sessions for ${name}?`)) return;
    setRevoking(userId);
    try {
      await fetcher(`/api/admin/security/sessions/${userId}`, { method: 'DELETE' });
      refresh();
    } finally {
      setRevoking(null);
    }
  };

  if (isLoading || !overview) {
    return <p className="text-gray-500 text-sm">Loading security settings...</p>;
  }

  const otherSessions = overview.sessions.filter(s => !s.current);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="studio-card px-8 py-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-maroon-600 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-maroon-950">Account Security</h2>
            <p className="text-sm text-maroon-500 mt-1">
              Manage your password, active sessions, and recent sign-in activity.
            </p>
            {overview.twoFactorRequired && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 inline-flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Your organisation requires two-factor authentication (enforcement coming soon).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="studio-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-maroon-950 flex items-center gap-2">
          <Key className="w-4 h-4" /> Change password
        </h3>
        <form onSubmit={handlePasswordChange} className="grid gap-3 max-w-md">
          <input
            type="password"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            value={passwordForm.newPassword}
            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
            minLength={8}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm text-green-700">Password updated. Other sessions were signed out.</p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-maroon-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-maroon-800 disabled:opacity-50 w-fit"
          >
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="studio-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-maroon-950 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Active sessions
          </h3>
          {otherSessions.length > 0 && (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={revoking === 'others'}
              className="text-xs font-semibold text-maroon-700 hover:text-maroon-900 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              {revoking === 'others' ? 'Signing out...' : 'Sign out other devices'}
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {overview.sessions.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No active sessions</p>
          ) : (
            overview.sessions.map(s => (
              <div key={s.token} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {parseUserAgent(s.userAgent)}
                    {s.current && (
                      <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Signed in {formatWhen(s.createdAt)}
                    {s.ip ? ` · ${s.ip}` : ''}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revokeSession(s.token)}
                    disabled={revoking === s.token}
                    className="text-xs text-red-600 hover:text-red-800 shrink-0"
                  >
                    End
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="studio-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-maroon-950 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent activity
        </h3>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {overview.activity.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No security events yet</p>
          ) : (
            overview.activity.map(entry => (
              <div key={entry.id} className="px-4 py-3 bg-white">
                <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatWhen(entry.createdAt)}
                  {entry.ip ? ` · ${entry.ip}` : ''}
                  {entry.detail ? ` · ${entry.detail}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdminPanel && (
        <div className="studio-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-maroon-950 flex items-center gap-2">
                <Users className="w-4 h-4" /> Organisation security
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {adminLoading
                  ? 'Loading...'
                  : `${adminOverview?.activeSessionCount ?? 0} active sessions across ${adminOverview?.usersWithSessions ?? 0} users`}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {adminOverview && adminOverview.activeSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Signed-in users</p>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {adminOverview.activeSessions.map(row => (
                  <div
                    key={row.userId}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-3 bg-white',
                      row.userId === currentUser?.id && 'bg-maroon-50/30',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {row.user?.name || 'Unknown'}
                        <span className="text-gray-400 font-normal ml-2">{row.user?.email}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {row.sessionCount} session{row.sessionCount !== 1 ? 's' : ''}
                        {row.lastLogin ? ` · Last login ${formatWhen(row.lastLogin)}` : ''}
                      </p>
                    </div>
                    {isAdmin && row.userId !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => adminRevokeUser(row.userId, row.user?.name || 'user')}
                        disabled={revoking === row.userId}
                        className="text-xs text-red-600 hover:text-red-800 shrink-0"
                      >
                        Sign out all
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminOverview && adminOverview.auditLog.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Audit log</p>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {adminOverview.auditLog.map(entry => (
                  <div key={entry.id} className="px-4 py-3 bg-white">
                    <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entry.userName || entry.actorName || 'System'}
                      {entry.actorName && entry.userName && entry.actorName !== entry.userName
                        ? ` · by ${entry.actorName}`
                        : ''}
                      {' · '}
                      {formatWhen(entry.createdAt)}
                      {entry.ip ? ` · ${entry.ip}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}