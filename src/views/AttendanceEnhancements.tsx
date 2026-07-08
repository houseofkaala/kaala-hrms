import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Settings, Smartphone, MapPin, Calendar, Plus, Trash2 } from 'lucide-react';
import { cn, fetcher } from '../utils';
import { useRBACStore } from '../store';

interface AttendanceRequest {
  id: string;
  type: string;
  date: string;
  hours?: string;
  reason?: string;
  location?: string;
  time?: string;
  status: string;
  employee?: { name: string };
}

interface Shift {
  id: string;
  shiftType: string;
  date: string;
  status: string;
  reason: string;
  employee?: { name: string };
}

interface BiometricDevice {
  id: string;
  name: string;
  location: string;
  status: string;
  lastSync: string;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  status: string;
}

function useAttendanceRequests(type?: string) {
  return useQuery<AttendanceRequest[]>({
    queryKey: ['attendance-requests', type],
    queryFn: async () => {
      const all = await fetcher<AttendanceRequest[]>('/api/attendance/requests');
      return type ? all.filter(r => r.type === type) : all;
    },
  });
}

export function AttendanceRegularization() {
  const [showForm, setShowForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const qc = useQueryClient();
  const [formData, setFormData] = useState({ date: '', time: '', reason: 'Forgot to punch in' });
  const [isLoading, setIsLoading] = useState(false);
  const { data: requests = [] } = useAttendanceRequests('regularization');

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await fetcher('/api/attendance/request', { method: 'POST', body: JSON.stringify({ type: 'regularization', ...formData }) });
      setToastMessage('Regularization request submitted');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['attendance-requests'] });
    } catch {
      setToastMessage('Failed to submit request');
    } finally {
      setIsLoading(false);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4 relative min-w-0 flex-1">
      {toastMessage && <div className="absolute -top-12 left-0 right-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-medium text-center z-10 shadow-lg">{toastMessage}</div>}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Attendance Regularization</h3>
          <p className="text-xs text-gray-500 mt-1">Fix missed punches or attendance gaps.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">{showForm ? 'Cancel' : 'Request Edit'}</button>
      </div>
      {showForm ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Date</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Time</label><input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Reason</label>
            <select value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>Forgot to punch in</option><option>Forgot to punch out</option><option>System error</option><option>Other</option>
            </select>
          </div>
          <button onClick={handleSubmit} disabled={isLoading} className={cn('w-full text-white font-semibold text-sm py-2 rounded-lg transition-colors', isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>{isLoading ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? <p className="text-xs text-gray-400">No regularization requests</p> : requests.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 border border-gray-100 bg-white rounded-xl shadow-sm">
              <div><p className="text-sm font-semibold text-gray-900">{r.reason}</p><p className="text-xs text-gray-500 font-medium">{r.date}{r.time ? `, ${r.time}` : ''}</p></div>
              <span className={cn('px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border', r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : r.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EarlyClockOutApprovals() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const { data: requests = [] } = useAttendanceRequests('early_clock_out');

  const review = async (id: string, status: string) => {
    await fetcher(`/api/attendance/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ['attendance-requests'] });
  };

  if (!isManager) return null;

  const pending = requests.filter(r => r.status === 'Pending');

  return (
    <div className="bg-white p-5 border border-amber-200 rounded-2xl shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Early Clock-Out Requests</h3>
        <p className="text-xs text-gray-500 mt-1">Approve employees leaving before 8 hours (after minimum 4h).</p>
      </div>
      {pending.length === 0 ? (
        <p className="text-xs text-gray-400">No pending early clock-out requests</p>
      ) : (
        <div className="space-y-3">
          {pending.map(r => (
            <div key={r.id} className="p-3 border border-amber-100 bg-amber-50/50 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.employee?.name || 'Employee'}</p>
                <p className="text-xs text-gray-600 mt-0.5">{r.reason}</p>
                <p className="text-[10px] text-gray-500 mt-1">{r.hours}h worked · {r.date}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => review(r.id, 'Approved')} className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg">Approve</button>
                <button onClick={() => review(r.id, 'Rejected')} className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShiftRequests() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shiftType: 'Morning Shift (09:00 - 17:00)', date: '', reason: '' });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: () => fetcher('/api/shifts'),
  });

  const submit = async () => {
    await fetcher('/api/shifts', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['shifts'] });
    setShowForm(false);
    setForm({ shiftType: 'Morning Shift (09:00 - 17:00)', date: '', reason: '' });
  };

  const review = async (id: string, status: string) => {
    await fetcher(`/api/shifts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ['shifts'] });
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Shift Requests</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-emerald-600 text-xs font-semibold hover:text-emerald-700 transition-colors">{showForm ? 'Cancel' : 'New Request'}</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <select value={form.shiftType} onChange={e => setForm({ ...form, shiftType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Morning Shift (09:00 - 17:00)</option><option>Evening Shift (14:00 - 22:00)</option><option>Night Shift (22:00 - 06:00)</option>
          </select>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={submit} className="w-full bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg">Submit</button>
        </div>
      )}
      <div className="space-y-3">
        {shifts.length === 0 ? <p className="text-xs text-gray-400">No shift requests</p> : shifts.slice(0, 4).map(s => (
          <div key={s.id} className="p-3 border border-gray-100 bg-gray-50 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{s.shiftType}</p>
              <p className="text-xs text-gray-500 mt-0.5">{isManager && s.employee ? `${s.employee.name} — ` : ''}Requested for {s.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border', s.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>{s.status}</span>
              {isManager && s.status === 'Pending' && (
                <>
                  <button onClick={() => review(s.id, 'Approved')} className="text-[10px] text-emerald-600 font-semibold">✓</button>
                  <button onClick={() => review(s.id, 'Rejected')} className="text-[10px] text-red-600 font-semibold">✗</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OTDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const qc = useQueryClient();
  const [formData, setFormData] = useState({ date: '', hours: '', reason: '' });
  const [isLoading, setIsLoading] = useState(false);

  const { data: otSummary } = useQuery<{ approvedHours: number; pendingHours: number }>({
    queryKey: ['ot-summary'],
    queryFn: () => fetcher('/api/attendance/ot-summary'),
  });

  const handleSubmit = async () => {
    if (!formData.date || !formData.hours || !formData.reason) {
      setToastMessage('Please fill all fields');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    try {
      setIsLoading(true);
      await fetcher('/api/attendance/request', { method: 'POST', body: JSON.stringify({ type: 'overtime', ...formData }) });
      setToastMessage('OT request submitted');
      setShowForm(false);
      setFormData({ date: '', hours: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['ot-summary', 'attendance-requests'] });
    } catch {
      setToastMessage('Failed to submit OT request');
    } finally {
      setIsLoading(false);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4 flex flex-col relative min-w-0 flex-1">
      {toastMessage && <div className="absolute -top-12 left-0 right-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-medium text-center z-10 shadow-lg">{toastMessage}</div>}
      <h3 className="font-semibold text-gray-900">Overtime Tracker</h3>
      {showForm ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 flex-1">
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Date</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Hours</label><input type="number" step="0.5" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="e.g., 2" /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Reason</label><input type="text" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Project deadline" /></div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={isLoading} className={cn('flex-1 text-white font-semibold text-sm py-2 rounded-lg transition-colors', isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>{isLoading ? '...' : 'Submit'}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-xs text-indigo-600 font-medium mb-1 uppercase tracking-wider">Approved OT</p>
              <p className="text-2xl font-bold text-indigo-900">{otSummary?.approvedHours ?? 0} <span className="text-sm font-normal text-indigo-700">hrs</span></p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{otSummary?.pendingHours ?? 0} <span className="text-sm font-normal text-gray-500">hrs</span></p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="w-full bg-gray-900 text-white font-semibold text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors">Request OT</button>
        </>
      )}
    </div>
  );
}

export function RemoteWorkRequests() {
  const [showForm, setShowForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const qc = useQueryClient();
  const [formData, setFormData] = useState({ date: '', location: '', remoteType: 'Work From Home' });
  const [isLoading, setIsLoading] = useState(false);
  const { data: requests = [] } = useAttendanceRequests('remote');

  const handleSubmit = async () => {
    if (!formData.date || (!formData.location && formData.remoteType !== 'Work From Home')) {
      setToastMessage('Please fill all fields');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    try {
      setIsLoading(true);
      await fetcher('/api/attendance/request', { method: 'POST', body: JSON.stringify({ type: 'remote', ...formData, reason: formData.remoteType }) });
      setToastMessage('Remote work request submitted');
      setShowForm(false);
      setFormData({ date: '', location: '', remoteType: 'Work From Home' });
      qc.invalidateQueries({ queryKey: ['attendance-requests'] });
    } catch {
      setToastMessage('Failed to submit request');
    } finally {
      setIsLoading(false);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4 relative min-w-0 flex-1">
      {toastMessage && <div className="absolute -top-12 left-0 right-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-medium text-center z-10 shadow-lg">{toastMessage}</div>}
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold text-gray-900">Remote / On-Duty</h3><p className="text-xs text-gray-500 mt-1">Log field work or WFH days.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">{showForm ? 'Cancel' : 'Submit'}</button>
      </div>
      {showForm ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Type</label>
            <select value={formData.remoteType} onChange={e => setFormData({ ...formData, remoteType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>Work From Home</option><option>Client Meeting</option><option>On Duty (Field)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Date</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Location</label><input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Downtown Office" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
          </div>
          <button onClick={handleSubmit} disabled={isLoading} className={cn('w-full text-white font-semibold text-sm py-2 rounded-lg transition-colors', isLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700')}>{isLoading ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? <p className="text-xs text-gray-400">No remote work requests</p> : requests.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 border border-gray-100 bg-white rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><MapPin className="w-4 h-4" /></div>
                <div><p className="text-sm font-semibold text-gray-900">{r.reason || 'Remote Work'}</p><p className="text-xs text-gray-500 font-medium">{r.date}{r.location ? `, ${r.location}` : ''}</p></div>
              </div>
              <span className={cn('px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border', r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BiometricDevices() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });

  const { data: devices = [] } = useQuery<BiometricDevice[]>({
    queryKey: ['biometric-devices'],
    queryFn: () => fetcher('/api/biometric-devices'),
    enabled: currentUser?.role === 'manager' || currentUser?.role === 'admin',
  });

  const addDevice = async () => {
    await fetcher('/api/biometric-devices', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['biometric-devices'] });
    setShowForm(false);
    setForm({ name: '', location: '' });
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Smartphone className="w-4 h-4 text-gray-400" />Biometric Devices</h3>
        {currentUser?.role === 'admin' && <button onClick={() => setShowForm(!showForm)} className="text-emerald-600 text-xs font-semibold hover:text-emerald-700 transition-colors">{showForm ? 'Cancel' : 'Add Device'}</button>}
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
          <input placeholder="Device name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={addDevice} className="w-full bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg">Add</button>
        </div>
      )}
      <div className="space-y-3">
        {devices.length === 0 ? <p className="text-xs text-gray-400">No devices registered</p> : devices.map(d => (
          <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-xl shadow-sm">
            <div>
              <p className="text-sm font-semibold text-gray-900">{d.name}</p>
              <p className="text-xs text-gray-500">{d.location}</p>
              <p className={cn('text-xs font-medium flex items-center gap-1 mt-0.5', d.status === 'Online' ? 'text-emerald-600' : 'text-red-600')}><span className={cn('w-1.5 h-1.5 rounded-full', d.status === 'Online' ? 'bg-emerald-500' : 'bg-red-500')} /> {d.status}</p>
            </div>
            <p className="text-xs text-gray-400">Last sync: {timeAgo(d.lastSync)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RosterEntry {
  id: string; userId: string; date: string; shiftType: string; startTime: string; endTime: string; location: string;
  employee?: { name: string };
}

export function ShiftRoster() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', date: '', shiftType: 'Morning', startTime: '09:00', endTime: '18:00', location: 'Office' });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + weekOffset * 7);
  const weekLabel = weekStart.toISOString().slice(0, 7);

  const { data: roster = [] } = useQuery<RosterEntry[]>({
    queryKey: ['shift-roster', weekLabel],
    queryFn: () => fetcher(`/api/shifts/roster?week=${weekLabel}`),
  });

  const { data: users = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['users-roster'],
    queryFn: () => fetcher('/api/users'),
    enabled: isManager,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const assign = async () => {
    await fetcher('/api/shifts/roster', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['shift-roster'] });
    setShowForm(false);
  };

  const remove = async (id: string) => {
    await fetcher(`/api/shifts/roster/${id}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['shift-roster'] });
  };

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4 col-span-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Shift Roster</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="text-xs text-gray-500 hover:text-gray-900">← Prev</button>
          <span className="text-xs font-medium text-gray-700">Week of {weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="text-xs text-gray-500 hover:text-gray-900">Next →</button>
          {isManager && (
            <button onClick={() => setShowForm(!showForm)} className="ml-2 bg-gray-900 text-white px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1">
              <Plus className="w-3 h-3" /> Assign
            </button>
          )}
        </div>
      </div>

      {showForm && isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5">
            <option value="">Employee</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
          <select value={form.shiftType} onChange={e => setForm(f => ({ ...f, shiftType: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5">
            <option>Morning</option><option>Evening</option><option>Night</option><option>WFH</option>
          </select>
          <button onClick={assign} className="bg-emerald-600 text-white text-sm font-semibold rounded-lg">Save</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
              <th className="py-2 pr-3">Employee</th>
              {weekDays.map(d => (
                <th key={d} className="py-2 px-1 text-center min-w-[72px]">{new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(isManager ? users : [{ id: currentUser?.id || '', name: currentUser?.name || 'Me' }]).map(u => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="py-2 pr-3 font-medium text-gray-900">{u.name}</td>
                {weekDays.map(d => {
                  const entry = roster.find(r => r.userId === u.id && r.date === d);
                  return (
                    <td key={d} className="py-2 px-1 text-center">
                      {entry ? (
                        <div className="group relative inline-block">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', entry.shiftType === 'WFH' ? 'bg-blue-50 text-blue-600' : entry.shiftType === 'Night' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}>
                            {entry.shiftType.slice(0, 3)}
                          </span>
                          {isManager && (
                            <button onClick={() => remove(entry.id)} className="absolute -top-1 -right-1 hidden group-hover:block text-red-500"><Trash2 className="w-3 h-3" /></button>
                          )}
                        </div>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AttendancePolicies() {
  const { data: policies = [] } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => fetcher('/api/policies'),
  });

  return (
    <div className="bg-white p-5 border border-gray-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Settings className="w-4 h-4 text-gray-400" />Policies &amp; Alerts</h3>
      </div>
      <div className="space-y-3">
        {policies.length === 0 ? <p className="text-xs text-gray-400">No policies configured</p> : policies.slice(0, 4).map(p => (
          <div key={p.id} className={cn('flex items-center justify-between p-3 border rounded-xl shadow-sm', p.status === 'Active' ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50')}>
            <div className="flex items-center gap-2">
              {p.status !== 'Active' && <AlertCircle className="w-4 h-4 text-red-500" />}
              <div><p className="text-sm font-semibold text-gray-900">{p.name}</p><p className="text-xs text-gray-500 font-medium mt-0.5">{p.description}</p></div>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase tracking-wider rounded-md">{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}