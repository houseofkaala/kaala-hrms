import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Project { id: string; name: string; progress: number; teamSize: number }

export function ProjectsView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/projects', { method: 'POST', body: JSON.stringify({ name }) });
    qc.invalidateQueries({ queryKey: ['projects'] });
    setName('');
    setShowForm(false);
  };

  const updateProgress = async (id: string) => {
    await fetcher(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ progress }) });
    qc.invalidateQueries({ queryKey: ['projects'] });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>
      {showForm && isManager && (
        <form onSubmit={create} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Project name" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Create</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-8">
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100"><Users className="w-3.5 h-3.5" /> {p.teamSize}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-2">
                <span className="text-gray-500">Progress</span>
                {editingId === p.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1 text-xs" />
                    <button onClick={() => updateProgress(p.id)} className="text-emerald-600 font-semibold">Save</button>
                  </div>
                ) : (
                  <span className="text-gray-900">{p.progress}%</span>
                )}
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-gray-900 h-full rounded-full" style={{ width: `${p.progress}%` }} />
              </div>
              {isManager && editingId !== p.id && (
                <button onClick={() => { setEditingId(p.id); setProgress(p.progress); }} className="mt-3 text-xs text-gray-500 font-semibold hover:underline">Update progress</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}