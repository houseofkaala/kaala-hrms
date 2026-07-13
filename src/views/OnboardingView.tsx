import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';

interface OnboardingTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  category: string;
}

export function OnboardingView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', title: '', description: '', dueDate: '', category: 'HR' });

  const { data: tasks = [], isLoading } = useQuery<OnboardingTask[]>({
    queryKey: ['onboarding'],
    queryFn: () => fetcher('/api/onboarding'),
  });

  const { data: employees = [] } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ['employees-onboarding'],
    queryFn: () => fetcher('/api/employees'),
    enabled: isManager,
  });

  const complete = async (id: string) => {
    await fetcher(`/api/onboarding/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Completed' }) });
    qc.invalidateQueries({ queryKey: ['onboarding'] });
  };

  const assign = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/onboarding', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['onboarding'] });
    setShowForm(false);
    setForm({ userId: '', title: '', description: '', dueDate: '', category: 'HR' });
  };

  const pending = tasks.filter(t => t.status !== 'Completed');
  const done = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Onboarding</h2>
          <p className="text-sm text-gray-500 mt-1">Track onboarding tasks and new hire checklists</p>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form onSubmit={assign} className="bg-white border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
          <select required value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select employee</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
            ))}
          </select>
          <input required placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="date" required value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>HR</option><option>IT</option><option>Learning</option><option>Compliance</option>
          </select>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} />
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">Assign</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pending.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Completed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{done.length}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading onboarding tasks...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">No onboarding tasks assigned</p>
            </div>
          ) : tasks.map(task => (
            <div key={task.id} className="p-5 flex items-center justify-between hover:bg-gray-50">
              <div>
                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{task.category} &bull; Due {task.dueDate}</p>
                {task.description && <p className="text-sm text-gray-600 mt-2">{task.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase', task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>{task.status}</span>
                {task.status !== 'Completed' && (
                  <button onClick={() => complete(task.id)} className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}