import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { ViewApiError } from '../components/ViewApiError';

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
  const [actionError, setActionError] = useState('');

  const { data: tasks = [], isError, error, refetch } = useQuery<KanbanTask[]>({
    queryKey: ['kanban'],
    queryFn: () => fetcher('/api/kanban'),
  });

  const moveTask = async (id: string, stage: string) => {
    setActionError('');
    try {
      await fetcher(`/api/kanban/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      qc.invalidateQueries({ queryKey: ['kanban'] });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  const createTask = async (e: FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await fetcher('/api/kanban', { method: 'POST', body: JSON.stringify({ title, priority }) });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      setTitle('');
      setShowForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const nextStage = (current: string) => {
    const idx = STAGES.findIndex(s => s.key === current);
    return idx < STAGES.length - 1 ? STAGES[idx + 1].key : current;
  };

  if (isError) {
    return (
      <ViewApiError
        message={error instanceof Error ? error.message : 'Failed to load tasks'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 view-panel-height flex flex-col">
      <div className="studio-card px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-ivory">Task Management</h2>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg">
          {actionError}
        </p>
      )}
      {showForm && (
        <form onSubmit={createTask} className="studio-card p-4 flex flex-wrap gap-3">
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="input-field flex-1 min-w-[200px]" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field w-auto">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">Add</button>
        </form>
      )}
      <div className="flex gap-4 sm:gap-6 flex-1 overflow-x-auto pb-4 table-scroll -mx-1 px-1">
        {STAGES.map(stage => (
          <div key={stage.key} className="bg-marble-light border border-slate rounded-2xl p-4 min-w-[260px] sm:min-w-[320px] flex flex-col gap-4 shrink-0">
            <h3 className="text-sm font-semibold text-ivory">{stage.label}</h3>
            {tasks.filter(t => t.stage === stage.key).map(t => (
              <div key={t.id} className="studio-card p-5">
                <p className="font-semibold text-ivory mb-4">{t.title}</p>
                <div className="flex justify-between items-center pt-3 border-t border-slate">
                  <span className={cn('text-[10px] px-2 py-1 rounded-md font-semibold uppercase tracking-wider', t.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/20' : 'bg-charcoal text-ivory-muted')}>{t.priority}</span>
                  <span className="text-xs text-ivory-muted">{t.id}</span>
                </div>
                {stage.key !== 'done' && (
                  <button onClick={() => moveTask(t.id, nextStage(t.stage))} className="mt-3 text-xs text-gold font-semibold hover:opacity-80">Advance →</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}