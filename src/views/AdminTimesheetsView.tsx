import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Search, Plus, Pencil, Trash2, RotateCcw, User, AlertTriangle, X, Save,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { ViewApiError } from '../components/ViewApiError';

interface AttendanceLogRow {
  id: string;
  name: string;
  userId: string;
  date: string;
  in: string;
  out: string;
  rawClockIn: string;
  rawClockOut: string | null;
  total: string;
  status: string;
  statusType: string;
}

interface AttendanceSummary {
  total: number;
  todayEntries: number;
  clockedInNow: number;
  employeesToday: number;
}

interface Employee {
  id: string;
  name: string;
  status?: string;
}

const emptyForm = {
  userId: '',
  date: new Date().toISOString().split('T')[0],
  clockInDate: new Date().toISOString().split('T')[0],
  clockInTime: '09:00',
  clockOutDate: new Date().toISOString().split('T')[0],
  clockOutTime: '18:00',
  hasClockOut: true,
  adminNote: '',
};

function toDateInput(iso: string | null) {
  if (!iso) return '';
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
}

function toTimeInput(iso: string | null) {
  if (!iso) return '';
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return '';
  return format(d, 'HH:mm');
}

function statusClass(statusType: string) {
  switch (statusType) {
    case 'working': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'late': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'ontime': return 'text-gray-600 bg-gray-100 border-gray-200';
    case 'absent': return 'text-red-600 bg-red-50 border-red-100';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}

export function AdminTimesheetsView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    clockInDate: '',
    clockInTime: '',
    clockOutDate: '',
    clockOutTime: '',
    clearClockOut: false,
    adminNote: '',
  });
  const [actionError, setActionError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (employeeFilter !== 'all') p.set('userId', employeeFilter);
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    const q = p.toString();
    return q ? `?${q}` : '';
  }, [employeeFilter, fromDate, toDate]);

  const { data: logs = [], error, refetch, isLoading } = useQuery<AttendanceLogRow[]>({
    queryKey: ['attendance-admin-logs', employeeFilter, fromDate, toDate],
    queryFn: () => fetcher(`/api/attendance/logs${queryParams}`),
  });

  const { data: summary } = useQuery<AttendanceSummary>({
    queryKey: ['attendance-admin-summary'],
    queryFn: () => fetcher('/api/attendance/admin/summary'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetcher('/api/employees'),
  });

  const activeEmployees = useMemo(
    () => employees.filter(e => e.status !== 'Inactive'),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(l =>
      [l.name, l.date, l.status, l.total].join(' ').toLowerCase().includes(q),
    );
  }, [logs, search]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['attendance-admin-logs'] });
    qc.invalidateQueries({ queryKey: ['attendance-admin-summary'] });
  };

  const openEdit = (log: AttendanceLogRow) => {
    setEditId(log.id);
    setEditForm({
      clockInDate: toDateInput(log.rawClockIn),
      clockInTime: toTimeInput(log.rawClockIn),
      clockOutDate: log.rawClockOut ? toDateInput(log.rawClockOut) : toDateInput(log.rawClockIn),
      clockOutTime: log.rawClockOut ? toTimeInput(log.rawClockOut) : '18:00',
      clearClockOut: !log.rawClockOut,
      adminNote: '',
    });
    setActionError('');
  };

  const addEntry = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      await fetcher('/api/attendance/logs', {
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId,
          date: form.date,
          clockInDate: form.clockInDate,
          clockInTime: form.clockInTime,
          ...(form.hasClockOut
            ? { clockOutDate: form.clockOutDate, clockOutTime: form.clockOutTime }
            : {}),
          adminNote: form.adminNote,
        }),
      });
      setShowAdd(false);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    setActionError('');
    try {
      await fetcher(`/api/attendance/logs/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          clockInDate: editForm.clockInDate,
          clockInTime: editForm.clockInTime,
          ...(editForm.clearClockOut
            ? { clockOut: null }
            : { clockOutDate: editForm.clockOutDate, clockOutTime: editForm.clockOutTime }),
          adminNote: editForm.adminNote || undefined,
        }),
      });
      setEditId(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    setActionError('');
    try {
      await fetcher(`/api/attendance/logs/${id}`, { method: 'DELETE' });
      if (editId === id) setEditId(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const resetCounts = async () => {
    if (resetConfirm !== 'RESET') {
      setActionError('Type RESET to confirm');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await fetcher('/api/attendance/admin/reset', {
        method: 'POST',
        body: JSON.stringify({
          confirm: true,
          userId: employeeFilter !== 'all' ? employeeFilter : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      });
      setShowReset(false);
      setResetConfirm('');
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const editingLog = editId ? filtered.find(l => l.id === editId) : null;

  return (
    <div className="space-y-6">
      {error && (
        <ViewApiError
          message={error instanceof Error ? error.message : 'Failed to load timesheets'}
          onRetry={() => refetch()}
        />
      )}

      {actionError && (
        <div className="studio-card p-4 flex items-start gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total records', value: summary?.total ?? '—' },
          { label: 'Today entries', value: summary?.todayEntries ?? '—' },
          { label: 'Clocked in now', value: summary?.clockedInNow ?? '—' },
          { label: 'Employees today', value: summary?.employeesToday ?? '—' },
        ].map(s => (
          <div key={s.label} className="studio-card p-4">
            <p className="studio-kicker mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-ivory tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="studio-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, date, status…"
              className="input-field pl-9 text-sm w-full"
            />
          </div>
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className="input-field text-sm w-auto min-w-[160px]"
          >
            <option value="all">All employees</option>
            {activeEmployees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field text-sm w-auto" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field text-sm w-auto" />
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => { setShowAdd(!showAdd); setActionError(''); }} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add entry
          </button>
          {isAdmin && (
            <button type="button" onClick={() => { setShowReset(true); setResetConfirm(''); setActionError(''); }} className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 border-red-200">
              <RotateCcw className="w-4 h-4" /> Reset counts
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addEntry} className="studio-card p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="studio-kicker block mb-1">Employee</label>
            <select required value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} className="input-field text-sm w-full">
              <option value="">Select employee</option>
              {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="studio-kicker block mb-1">Work date</label>
            <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field text-sm w-full" />
          </div>
          <div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <label className="studio-kicker block mb-1">Clock in</label>
              <input type="date" value={form.clockInDate} onChange={e => setForm(f => ({ ...f, clockInDate: e.target.value }))} className="input-field text-sm w-full mb-1" />
              <input type="time" value={form.clockInTime} onChange={e => setForm(f => ({ ...f, clockInTime: e.target.value }))} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="studio-kicker block mb-1">Clock out</label>
              <label className="flex items-center gap-2 text-xs text-ivory-muted mb-1">
                <input type="checkbox" checked={form.hasClockOut} onChange={e => setForm(f => ({ ...f, hasClockOut: e.target.checked }))} />
                Has clock-out
              </label>
              <input type="date" disabled={!form.hasClockOut} value={form.clockOutDate} onChange={e => setForm(f => ({ ...f, clockOutDate: e.target.value }))} className="input-field text-sm w-full mb-1 disabled:opacity-50" />
              <input type="time" disabled={!form.hasClockOut} value={form.clockOutTime} onChange={e => setForm(f => ({ ...f, clockOutTime: e.target.value }))} className="input-field text-sm w-full disabled:opacity-50" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="studio-kicker block mb-1">Admin note (optional)</label>
            <input value={form.adminNote} onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))} className="input-field text-sm w-full" placeholder="Reason for manual entry…" />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Add record'}</button>
          </div>
        </form>
      )}

      <div className="studio-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ivory-muted">Loading attendance records…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ivory-muted">No attendance records match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate text-xs uppercase text-ivory-muted">
                <tr>
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Clock in</th>
                  <th className="text-left px-5 py-3">Clock out</th>
                  <th className="text-right px-5 py-3">Hours</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-charcoal/20">
                    <td className="px-5 py-3 font-medium text-ivory flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-ivory-muted" />
                      {log.name}
                    </td>
                    <td className="px-5 py-3 text-ivory-muted">{log.date}</td>
                    <td className="px-5 py-3 text-ivory">
                      {log.rawClockIn ? format(parseISO(log.rawClockIn), 'h:mm a') : log.in}
                    </td>
                    <td className="px-5 py-3 text-ivory">
                      {log.rawClockOut ? format(parseISO(log.rawClockOut), 'h:mm a') : log.out}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-ivory tabular-nums">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-ivory-muted" />
                        {log.total}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold uppercase border', statusClass(log.statusType))}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" onClick={() => openEdit(log)} className="p-1.5 text-ivory-muted hover:text-gold rounded" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => deleteLog(log.id)} className="p-1.5 text-ivory-muted hover:text-red-500 rounded ml-1" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditId(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative studio-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="studio-kicker">Edit timesheet</p>
                <p className="text-lg font-semibold text-ivory">{editingLog.name}</p>
                <p className="text-xs text-ivory-muted">{editingLog.date}</p>
              </div>
              <button type="button" onClick={() => setEditId(null)} className="p-2 text-ivory-muted hover:text-ivory">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="studio-kicker block mb-1">Clock in date</label>
                  <input type="date" value={editForm.clockInDate} onChange={e => setEditForm(f => ({ ...f, clockInDate: e.target.value }))} className="input-field text-sm w-full" />
                </div>
                <div>
                  <label className="studio-kicker block mb-1">Clock in time</label>
                  <input type="time" value={editForm.clockInTime} onChange={e => setEditForm(f => ({ ...f, clockInTime: e.target.value }))} className="input-field text-sm w-full" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ivory-muted">
                <input
                  type="checkbox"
                  checked={editForm.clearClockOut}
                  onChange={e => setEditForm(f => ({ ...f, clearClockOut: e.target.checked }))}
                />
                Still clocked in (no clock-out)
              </label>
              {!editForm.clearClockOut && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="studio-kicker block mb-1">Clock out date</label>
                    <input type="date" value={editForm.clockOutDate} onChange={e => setEditForm(f => ({ ...f, clockOutDate: e.target.value }))} className="input-field text-sm w-full" />
                  </div>
                  <div>
                    <label className="studio-kicker block mb-1">Clock out time</label>
                    <input type="time" value={editForm.clockOutTime} onChange={e => setEditForm(f => ({ ...f, clockOutTime: e.target.value }))} className="input-field text-sm w-full" />
                  </div>
                </div>
              )}
              <div>
                <label className="studio-kicker block mb-1">Admin note</label>
                <input value={editForm.adminNote} onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))} className="input-field text-sm w-full" placeholder="Reason for edit…" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-sm">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowReset(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative studio-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ivory flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Reset clock-in counts
            </h3>
            <p className="text-sm text-ivory-muted mt-2 leading-relaxed">
              This permanently deletes attendance records
              {employeeFilter !== 'all' ? ` for ${activeEmployees.find(e => e.id === employeeFilter)?.name || 'selected employee'}` : ' for all employees'}
              {fromDate || toDate ? ` from ${fromDate || '…'} to ${toDate || '…'}` : ''}.
              Use filters above to limit scope before resetting.
            </p>
            <p className="text-xs text-ivory-muted mt-3">Type <strong className="text-ivory">RESET</strong> to confirm.</p>
            <input
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              className="input-field text-sm w-full mt-2"
              placeholder="RESET"
              autoComplete="off"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowReset(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button" onClick={resetCounts} disabled={saving || resetConfirm !== 'RESET'} className="btn-primary text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Resetting…' : 'Reset records'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}