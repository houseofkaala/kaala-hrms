import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';

interface KanbanTask { id: string; title: string; stage: string; priority: string }

const STAGES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

export function TasksView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');

  const { data: tasks = [] } = useQuery<KanbanTask[]>({
    queryKey: ['kanban'],
    queryFn: () => fetcher('/api/kanban'),
  });

  const moveTask = async (id: string, stage: string) => {
    await fetcher(`/api/kanban/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
    qc.invalidateQueries({ queryKey: ['kanban'] });
  };

  const createTask = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/kanban', { method: 'POST', body: JSON.stringify({ title, priority }) });
    qc.invalidateQueries({ queryKey: ['kanban'] });
    setTitle('');
    setShowForm(false);
  };

  const nextStage = (current: string) => {
    const idx = STAGES.findIndex(s => s.key === current);
    return idx < STAGES.length - 1 ? STAGES[idx + 1].key : current;
  };

  return (
    <div className="space-y-6 h-[700px] flex flex-col">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Task Management</h2>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>
      {showForm && (
        <form onSubmit={createTask} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Add</button>
        </form>
      )}
      <div className="flex gap-6 flex-1 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage.key} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-4 min-w-[320px] flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
            {tasks.filter(t => t.stage === stage.key).map(t => (
              <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="font-semibold text-gray-900 mb-4">{t.title}</p>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className={cn('text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wider', t.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-600')}>{t.priority}</span>
                  <span className="text-xs text-gray-400">{t.id}</span>
                </div>
                {stage.key !== 'done' && (
                  <button onClick={() => moveTask(t.id, nextStage(t.stage))} className="mt-3 text-xs text-emerald-600 font-semibold hover:underline">Advance →</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}