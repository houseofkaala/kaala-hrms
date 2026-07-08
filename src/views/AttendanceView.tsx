import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { useRBACStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AttendanceRegularization, ShiftRequests, OTDashboard, RemoteWorkRequests, BiometricDevices, AttendancePolicies, EarlyClockOutApprovals } from './AttendanceEnhancements';

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

function AttendanceClock({ checkedIn, onToggle, isLoading }: { checkedIn: boolean, onToggle: () => void, isLoading?: boolean }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl flex flex-col items-center justify-center shadow-sm text-center relative overflow-hidden">
      {/* Animated background when checked in */}
      {checkedIn && (
        <div className="absolute inset-0 bg-emerald-50 opacity-50 z-0"></div>
      )}
      
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className={cn(
          "w-24 h-24 rounded-full border-4 shadow-sm flex items-center justify-center mb-4 transition-colors duration-500",
          checkedIn ? "border-emerald-100 bg-emerald-50" : "border-gray-50 bg-white"
        )}>
          <Clock className={cn(
            "w-8 h-8 transition-colors duration-500",
            checkedIn ? "text-emerald-500" : "text-gray-300"
          )} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight tabular-nums">{formatTime(time)}</h2>
        <p className="text-xs text-gray-500 font-medium mb-2">{formatDate(time)}</p>
        
        <div className="mb-6 flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            checkedIn ? "bg-emerald-500" : "bg-gray-300"
          )}></span>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {checkedIn ? "Working" : "Off Duty"}
          </span>
        </div>

        <button 
          onClick={onToggle}
          disabled={isLoading}
          className={cn(
            "w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm",
            checkedIn ? "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50" : "bg-gray-900 text-white hover:bg-gray-800",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? 'Processing...' : (checkedIn ? 'Check Out' : 'Check In')}
        </button>
      </div>
    </div>
  );
}

export function AttendanceView() {
  const { viewMode, currentUser, setCurrentUser } = useRBACStore();
  const [checkedIn, setCheckedIn] = useState(currentUser?.status === 'Active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEarlyRequest, setShowEarlyRequest] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');

  useEffect(() => {
    if (currentUser) {
      setCheckedIn(currentUser.status === 'Active');
    }
  }, [currentUser]);

  const handleToggleAttendance = async () => {
    try {
      if (currentUser) {
        setIsLoading(true);
        const res = await fetcher<{ success: boolean; checkedIn: boolean; user: any }>('/api/attendance/toggle', {
          method: 'POST',
        });
        
        if (res.success) {
          setCheckedIn(res.checkedIn);
          setCurrentUser(res.user);
          setToastMessage(res.checkedIn ? 'Successfully clocked in!' : 'Successfully clocked out!');
        } else {
          setToastMessage('Failed to update attendance status.');
        }
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update attendance status.';
      setToastMessage(msg);
      if (msg.includes('admin approval') || msg.includes('early clock-out')) {
        setShowEarlyRequest(true);
      }
      setTimeout(() => setToastMessage(null), 8000);
    } finally {
      setIsLoading(false);
    }
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
          <AttendanceClock checkedIn={checkedIn} onToggle={handleToggleAttendance} isLoading={isLoading} />
          <AttendanceSummary />
          <LeaveQuickView />
        </div>
        
        <div className="xl:col-span-2 lg:col-span-1 space-y-4 min-w-0 flex-1">
          <AttendanceLogs viewMode={viewMode} checkedIn={checkedIn} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <OTDashboard />
            <EarlyClockOutApprovals />
            <ShiftRequests />
            <AttendanceRegularization />
            <RemoteWorkRequests />
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
