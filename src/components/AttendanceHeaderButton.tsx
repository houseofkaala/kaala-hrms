import { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { getPortal } from '../portal';

type AttendanceStatus = {
  checkedIn: boolean;
  clockIn: string | null;
  hoursWorked: number;
  canClockOut: boolean;
  needsAdminApproval: boolean;
  minHours: number;
  fullDayHours: number;
  hoursUntilMin: number;
  hoursUntilFullDay: number;
  earlyClockOutApproved: boolean;
  message?: string;
};

export function AttendanceHeaderButton({ onStatusChange }: { onStatusChange?: () => void }) {
  const { currentUser, setCurrentUser } = useRBACStore();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [reason, setReason] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetcher<AttendanceStatus>('/api/attendance/status');
      setStatus(res);
      setError('');
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 30_000);
    return () => clearInterval(id);
  }, [loadStatus, currentUser?.id]);

  const handleToggle = async () => {
    if (!status) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetcher<{ success: boolean; checkedIn: boolean; user: typeof currentUser; error?: string; code?: string }>(
        '/api/attendance/toggle',
        { method: 'POST' },
      );
      if (res.user) setCurrentUser(res.user);
      await loadStatus();
      onStatusChange?.();
      setShowRequest(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not update attendance';
      setError(msg);
      if (msg.includes('admin approval') || msg.includes('early clock-out')) {
        setShowRequest(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestEarlyClockOut = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for early clock-out.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await fetcher('/api/attendance/request-early-clockout', {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setReason('');
      setShowRequest(false);
      setError('');
      alert('Early clock-out request sent to admin. You will be notified once approved.');
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || (currentUser.role === 'admin' && getPortal() === 'admin')) return null;

  const checkedIn = status?.checkedIn ?? currentUser.status === 'Active';
  const progress = status
    ? Math.min(100, (status.hoursWorked / status.fullDayHours) * 100)
    : 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || (checkedIn && status && !status.canClockOut && !status.needsAdminApproval)}
        title={
          checkedIn && status
            ? status.canClockOut
              ? 'Clock out'
              : status.hoursWorked < status.minHours
                ? `Minimum ${status.minHours}h required (${status.hoursUntilMin.toFixed(1)}h left)`
                : `Request admin approval or wait ${status.hoursUntilFullDay.toFixed(1)}h for full day`
            : 'Clock in'
        }
        className={cn(
          'studio-chip gap-2 py-1.5 px-3 text-[10px] transition-all',
          checkedIn
            ? status?.canClockOut
              ? 'bg-maroon-50 text-maroon-800 border-maroon-200 hover:bg-maroon-100'
              : 'bg-amber-50 text-amber-800 border-amber-200'
            : 'studio-chip-live',
          loading && 'opacity-60 cursor-wait',
        )}
      >
        {checkedIn ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{loading ? '…' : checkedIn ? 'Clock Out' : 'Clock In'}</span>
        {checkedIn && status && (
          <span className="tabular-nums opacity-80">{status.hoursWorked.toFixed(1)}h</span>
        )}
      </button>

      {checkedIn && status && (
        <div className="hidden lg:block absolute top-full right-0 mt-2 w-52 p-3 studio-card text-[10px] text-maroon-700 z-50">
          <div className="flex items-center gap-1 mb-2 studio-kicker normal-case tracking-normal">
            <Clock className="w-3 h-3" />
            <span>{status.hoursWorked.toFixed(1)}h / {status.fullDayHours}h today</span>
          </div>
          <div className="h-1.5 bg-maroon-100 rounded-full overflow-hidden">
            <div className="h-full bg-maroon-600 transition-all rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {(error || showRequest) && (
        <div className="absolute top-full right-0 mt-2 w-72 p-4 studio-card z-50 text-left">
          {error && (
            <p className="text-xs text-red-600 flex items-start gap-1.5 mb-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}
          {showRequest && status?.needsAdminApproval && (
            <div className="space-y-2">
              <p className="text-xs text-maroon-700">
                You need admin approval to clock out before {status.fullDayHours} hours (min {status.minHours}h worked).
              </p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for early clock-out…"
                className="input-field text-xs min-h-[60px] resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestEarlyClockOut}
                  disabled={loading}
                  className="btn-primary flex-1 text-xs py-1.5"
                >
                  Request approval
                </button>
                <button type="button" onClick={() => setShowRequest(false)} className="btn-ghost text-xs px-2">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}