import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { useRBACStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AttendanceRegularization, ShiftRequests, ShiftRoster, OTDashboard, RemoteWorkRequests, BiometricDevices, AttendancePolicies, EarlyClockOutApprovals } from './AttendanceEnhancements';

function AttendanceLogs({ viewMode, checkedIn }: { viewMode: string, checkedIn?: boolean }) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'date' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 5;
  const { currentUser } = useRBACStore();

  const { data: rawData = [] } = useQuery<any[]>({
    queryKey: ['attendance-logs', viewMode, currentUser?.id, checkedIn],
    queryFn: () => {
      const url = viewMode === 'manager' ? '/api/attendance/logs' : `/api/attendance/logs/${currentUser!.id}`;
      return fetcher<any[]>(url);
    },
    enabled: !!currentUser,
  });
  
  const sortedData = [...rawData].sort((a, b) => {
    if (sortField === 'date') {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
    } else {
      const cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const currentData = sortedData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'late': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'ontime': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'absent': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const handleSort = (field: 'date' | 'status') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {viewMode === 'manager' ? 'Team Attendance Logs' : 'My Recent Logs'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
          <thead className="bg-gray-50 text-[10px] uppercase font-semibold tracking-wider text-gray-400">
            <tr>
              {viewMode === 'manager' && <th className="px-5 py-3">Employee</th>}
              <th className="px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('date')}>
                Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-5 py-3">Clock In</th>
              <th className="px-5 py-3">Clock Out</th>
              <th className="px-5 py-3 text-right">Total Hours</th>
              <th className="px-5 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                {viewMode === 'manager' && (
                  <td className="px-5 py-3 font-medium text-gray-900">{log.name}</td>
                )}
                <td className="px-5 py-3">{log.date}</td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {log.rawClockIn ? new Date(log.rawClockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : log.in}
                </td>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {log.rawClockOut ? new Date(log.rawClockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : log.out}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{log.total}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold min-w-[70px] text-center border", getStatusColor(log.statusType))}>
                      {log.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <span className="text-xs font-medium text-gray-500">
          Showing {sortedData.length === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, sortedData.length)} of {sortedData.length} logs
        </span>
        <div className="flex gap-1">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors bg-white shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors bg-white shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AttendanceSummary() {
  const { data: summary } = useQuery<{ chart: { day: string; hours: number }[]; onTime: number; late: number }>({
    queryKey: ['attendance-summary'],
    queryFn: () => fetcher('/api/attendance/summary'),
  });

  const chartData = summary?.chart ?? [];

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Weekly Trends</h3>
      
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            />
            <Bar dataKey="hours" name="Hours Worked" fill="#111827" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">On Time</p>
          <p className="text-xl font-semibold text-gray-900">{summary?.onTime ?? 0} <span className="text-sm font-normal text-gray-400">days</span></p>
        </div>
        <div className="flex-1 bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs text-amber-600 font-medium mb-1">Late</p>
          <p className="text-xl font-semibold text-amber-900">{summary?.late ?? 0} <span className="text-sm font-normal text-amber-600/70">days</span></p>
        </div>
      </div>
    </div>
  );
}

function LeaveQuickView() {
  const { data: balance } = useQuery<{ annual: number; sick: number; used: number; pending: number }>({
    queryKey: ['leave-balance'],
    queryFn: () => fetcher('/api/leave-balance'),
  });

  const { data: requests = [] } = useQuery<{ id: string; type: string; days: number; startDate: string; endDate: string; status: string }[]>({
    queryKey: ['leave-requests'],
    queryFn: () => fetcher('/api/leave-requests'),
  });

  const remaining = (balance?.annual ?? 0) - (balance?.used ?? 0);

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Leave Balance</h3>
        <Link to="/leave" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase">Remaining</p>
          <p className="text-lg font-bold text-gray-900">{remaining} <span className="text-xs font-normal text-gray-400">days</span></p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-[10px] text-amber-600 uppercase">Pending</p>
          <p className="text-lg font-bold text-amber-900">{balance?.pending ?? 0}</p>
        </div>
      </div>
      <div className="space-y-2">
        {requests.slice(0, 3).map(req => (
          <div key={req.id} className="flex items-center justify-between p-2 border border-gray-100 bg-white rounded-lg text-xs">
            <span className="font-medium text-gray-900">{req.type} ({req.days}d)</span>
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase', req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>{req.status}</span>
          </div>
        ))}
        {requests.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No leave requests</p>}
      </div>
    </div>
  );
}

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

function AttendanceClock({
  status,
  onClockIn,
  onClockOut,
  isLoading,
}: {
  status: AttendanceStatus | null;
  onClockIn: () => void;
  onClockOut: () => void;
  isLoading?: boolean;
}) {
  const [time, setTime] = useState(new Date());
  const checkedIn = status?.checkedIn ?? false;
  const progress = status ? Math.min(100, (status.hoursWorked / status.fullDayHours) * 100) : 0;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="studio-card p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
      {checkedIn && <div className="absolute inset-0 bg-gold/5 z-0" />}

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className={cn(
          'w-24 h-24 rounded-full border-4 shadow-sm flex items-center justify-center mb-4 transition-colors duration-500',
          checkedIn ? 'border-gold/30 bg-gold/10' : 'border-gray-200/40 bg-marble-light',
        )}>
          <Clock className={cn('w-8 h-8 transition-colors duration-500', checkedIn ? 'text-gold' : 'text-ivory-muted')} />
        </div>
        <h2 className="text-2xl font-semibold text-ivory mb-1 tracking-tight tabular-nums">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </h2>
        <p className="text-xs text-ivory-muted font-medium mb-2">
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>

        <div className="mb-4 flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', checkedIn ? 'bg-gold' : 'bg-ivory-muted/40')} />
          <span className="text-xs font-semibold text-ivory-muted uppercase tracking-wider">
            {checkedIn ? 'Clocked In' : 'Not Clocked In'}
          </span>
        </div>

        {checkedIn && status && (
          <div className="w-full mb-4 text-left">
            <div className="flex items-center justify-between text-[11px] text-ivory-muted mb-1.5">
              <span>{status.hoursWorked.toFixed(1)}h worked</span>
              <span>{status.fullDayHours}h full day</span>
            </div>
            <div className="h-2 bg-marble-light rounded-full overflow-hidden border border-gold/10">
              <div className="h-full bg-gold transition-all rounded-full" style={{ width: `${progress}%` }} />
            </div>
            {status.clockIn && (
              <p className="text-[10px] text-ivory-muted mt-2">
                Since {new Date(status.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        <div className="w-full grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClockIn}
            disabled={isLoading || checkedIn}
            className={cn(
              'py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5',
              checkedIn ? 'bg-marble-light text-ivory-muted cursor-not-allowed' : 'btn-primary',
              isLoading && 'opacity-50 cursor-wait',
            )}
          >
            <LogIn className="w-4 h-4" />
            Clock In
          </button>
          <button
            type="button"
            onClick={onClockOut}
            disabled={isLoading || !checkedIn || (status != null && !status.canClockOut && !status.needsAdminApproval)}
            className={cn(
              'py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 border',
              !checkedIn
                ? 'bg-marble-light text-ivory-muted border-transparent cursor-not-allowed'
                : status?.canClockOut
                  ? 'bg-marble text-ivory border-gold/25 hover:bg-gold/10'
                  : 'bg-amber-500/10 text-amber-200 border-amber-400/20',
              isLoading && 'opacity-50 cursor-wait',
            )}
          >
            <LogOut className="w-4 h-4" />
            Clock Out
          </button>
        </div>

        {status?.message && checkedIn && (
          <p className="text-[11px] text-ivory-muted mt-3 leading-relaxed">{status.message}</p>
        )}
      </div>
    </div>
  );
}

export function AttendanceView() {
  const { viewMode } = useRBACStore();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEarlyRequest, setShowEarlyRequest] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const showEmployeeClock = viewMode === 'employee';

  const loadStatus = async () => {
    try {
      const res = await fetcher<AttendanceStatus>('/api/attendance/status');
      setStatus(res);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    if (!showEmployeeClock) return;
    loadStatus();
    const id = setInterval(loadStatus, 60_000);
    return () => clearInterval(id);
  }, [showEmployeeClock]);

  const getGeo = (): Promise<{ lat?: number; lng?: number }> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 8000, enableHighAccuracy: true },
      );
    });

  const runAttendanceToggle = async (geo: { lat?: number; lng?: number } = {}) => {
    setIsLoading(true);
    try {
      const res = await fetcher<{ success: boolean; checkedIn: boolean; status?: AttendanceStatus }>(
        '/api/attendance/toggle',
        { method: 'POST', body: JSON.stringify(geo) },
      );
      if (res.status) setStatus(res.status);
      else await loadStatus();
      setToastMessage(res.checkedIn ? 'Clocked in successfully.' : 'Clocked out successfully.');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update attendance.';
      setToastMessage(msg);
      if (msg.includes('admin approval') || msg.includes('early clock-out')) {
        setShowEarlyRequest(true);
      }
      setTimeout(() => setToastMessage(null), 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (status?.checkedIn) return;
    const geo = await getGeo();
    await runAttendanceToggle(geo);
  };

  const handleClockOut = async () => {
    if (!status?.checkedIn) return;
    if (status.needsAdminApproval && !status.canClockOut) {
      setShowEarlyRequest(true);
      return;
    }
    await runAttendanceToggle();
  };

  const requestEarlyClockOut = async () => {
    if (!earlyReason.trim()) {
      setToastMessage('Please provide a reason for early clock-out.');
      return;
    }
    setIsLoading(true);
    try {
      await fetcher('/api/attendance/request-early-clockout', {
        method: 'POST',
        body: JSON.stringify({ reason: earlyReason.trim() }),
      });
      setShowEarlyRequest(false);
      setEarlyReason('');
      setToastMessage('Early clock-out request sent to admin.');
      await loadStatus();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : 'Request failed');
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      {showEarlyRequest && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="studio-card w-full max-w-md p-6">
            <h3 className="font-display text-lg font-semibold text-maroon-950 mb-2">Request early clock-out</h3>
            <p className="text-sm text-maroon-600 mb-4">You need admin approval to clock out before completing a full day.</p>
            <textarea
              value={earlyReason}
              onChange={e => setEarlyReason(e.target.value)}
              className="input-field min-h-[80px] resize-none mb-4"
              placeholder="Reason for leaving early…"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowEarlyRequest(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={requestEarlyClockOut} disabled={isLoading} className="btn-primary">Send request</button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 z-50 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 items-start">
        <div className="xl:col-span-1 lg:col-span-1 space-y-4 min-w-0">
          {showEmployeeClock && (
            <AttendanceClock
              status={status}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              isLoading={isLoading}
            />
          )}
          {showEmployeeClock && status?.needsAdminApproval && !status.canClockOut && (
            <div className="studio-card p-4 text-left">
              <p className="text-xs text-ivory-muted flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-gold" />
                Early clock-out needs admin approval, or wait {status.hoursUntilFullDay.toFixed(1)} more hour(s) for a full day.
              </p>
              <button
                type="button"
                onClick={() => setShowEarlyRequest(true)}
                className="btn-secondary mt-3 w-full text-xs py-2"
              >
                Request early clock-out
              </button>
            </div>
          )}
          <AttendanceSummary />
          <LeaveQuickView />
        </div>
        
        <div className="xl:col-span-2 lg:col-span-1 space-y-4 min-w-0 flex-1">
          <AttendanceLogs viewMode={viewMode} checkedIn={status?.checkedIn} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <OTDashboard />
            <EarlyClockOutApprovals />
            <ShiftRequests />
            <AttendanceRegularization />
            <RemoteWorkRequests />
            <ShiftRoster />
            {viewMode === 'manager' && (
              <>
                <BiometricDevices />
                <AttendancePolicies />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
