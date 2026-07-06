import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Target, Plus } from 'lucide-react';
import { cn, fetcher } from '../../utils';
import { usePerformanceData } from '../../hooks/usePerformanceData';

export function ObjectivesTab() {
  const { data, isLoading } = usePerformanceData();
  const qc = useQueryClient();
  const goals = data?.goals ?? [];
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const addGoal = async () => {
    if (!title) return;
    await fetcher('/api/performance/goals', { method: 'POST', body: JSON.stringify({ title }) });
    qc.invalidateQueries({ queryKey: ['performance'] });
    setTitle('');
    setShowForm(false);
  };

  const updateProgress = async (id: string) => {
    await fetcher(`/api/performance/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ progress }) });
    qc.invalidateQueries({ queryKey: ['performance'] });
    setEditingId(null);
  };

  if (isLoading) return <p className="text-sm text-gray-500">Loading goals...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900">Goals & OKRs</h3>
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Goal</button>
        </div>
        {showForm && (
          <div className="flex gap-2 mb-4">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button onClick={addGoal} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
          </div>
        )}
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400">No goals set yet. Add your first goal above.</p>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const pct = goal.target ? Math.round((goal.progress / goal.target) * 100) : goal.progress;
              return (
                <div key={goal.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Target className="w-4 h-4 text-gray-500" /></div>
                      <div><p className="font-semibold text-gray-900">{goal.title}</p><p className="text-xs text-gray-500">{goal.quarter}</p></div>
                    </div>
                    {editingId === goal.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1 text-sm" />
                        <button onClick={() => updateProgress(goal.id)} className="text-xs text-emerald-600 font-semibold">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(goal.id); setProgress(pct); }} className="text-sm font-bold text-gray-900 hover:underline">{pct}%</button>
                    )}
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full bg-gray-900')} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}