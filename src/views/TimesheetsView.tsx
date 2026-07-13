import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Check, X } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { ViewApiError } from '../components/ViewApiError';

interface Timesheet {
  id: string;
  projectName: string;
  date: string;
  hours: number;
  description: string;
  status: string;
  employee?: { name: string };
}

interface Project { id: string; name: string }

export function TimesheetsView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: '', date: '', hours: '', description: '' });

  const {
    data: timesheets = [],
    error: timesheetsError,
    refetch: refetchTimesheets,
    isLoading: timesheetsLoading,
  } = useQuery<Timesheet[]>({
    queryKey: ['timesheets', isManager],
    queryFn: () => fetcher(`/api/timesheets${isManager ? '?all=1' : ''}`),
  });

  const { data: projects = [], error: projectsError } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/timesheets', { method: 'POST', body: JSON.stringify({ ...form, hours: Number(form.hours) }) });
    qc.invalidateQueries({ queryKey: ['timesheets'] });
    setShowForm(false);
    setForm({ projectId: '', date: '', hours: '', description: '' });
  };

  const review = async (id: string, status: string) => {
    await fetcher(`/api/timesheets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    qc.invalidateQueries({ queryKey: ['timesheets'] });
  };

  const totalHours = timesheets.reduce((s, t) => s + t.hours, 0);

  const loadError = timesheetsError || projectsError;

  return (
    <div className="space-y-6">
      {loadError && (
        <ViewApiError
          message={loadError instanceof Error ? loadError.message : 'Access denied or server error'}
          onRetry={() => refetchTimesheets()}
        />
      )}
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Timesheets</h2>
          <p className="text-sm text-gray-500 mt-1">{totalHours} hours logged</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Log Hours
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
          <select required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="number" step="0.5" placeholder="Hours" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Submit Timesheet</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {timesheetsLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading timesheets…</p>
        ) : timesheets.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No timesheet entries yet. Log your first hours above.</p>
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-6 py-3">Project</th>
              {isManager && <th className="text-left px-6 py-3">Employee</th>}
              <th className="text-left px-6 py-3">Date</th>
              <th className="text-left px-6 py-3">Hours</th>
              <th className="text-left px-6 py-3">Status</th>
              {isManager && <th className="text-right px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timesheets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{t.projectName}</p>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                </td>
                {isManager && <td className="px-6 py-4 text-gray-600">{t.employee?.name || '—'}</td>}
                <td className="px-6 py-4 text-gray-600">{t.date}</td>
                <td className="px-6 py-4 font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{t.hours}h</td>
                <td className="px-6 py-4">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', t.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : t.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>{t.status}</span>
                </td>
                {isManager && t.status === 'Pending' && (
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => review(t.id, 'Approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => review(t.id, 'Rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1"><X className="w-4 h-4" /></button>
                  </td>
                )}
                {isManager && t.status !== 'Pending' && <td className="px-6 py-4" />}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}