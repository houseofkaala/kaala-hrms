import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Candidate { id: string; name: string; role: string; stage: string }

export function RecruitView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: () => fetcher('/api/recruit/candidates'),
  });

  const addCandidate = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/recruit/candidates', { method: 'POST', body: JSON.stringify({ name, role }) });
    qc.invalidateQueries({ queryKey: ['candidates'] });
    setName(''); setRole(''); setShowForm(false);
  };

  const moveStage = async (id: string, stage: string) => {
    if (stage === 'Hired') {
      const userId = prompt('Enter new employee user ID for onboarding (or leave blank):') || 'pending';
      await fetcher(`/api/recruit/candidates/${id}/hire`, { method: 'POST', body: JSON.stringify({ userId }) });
    } else {
      await fetcher(`/api/recruit/candidates/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
    }
    qc.invalidateQueries({ queryKey: ['candidates'] });
  };

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  return (
    <div className="space-y-6 h-[700px] flex flex-col">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Recruitment</h2>
        {isManager && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-sm">
            <Plus className="w-4 h-4" /> Add Candidate
          </button>
        )}
      </div>
      {showForm && (
        <form onSubmit={addCandidate} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-3 shadow-sm">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required value={role} onChange={e => setRole(e.target.value)} placeholder="Role" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Add</button>
        </form>
      )}
      <div className="flex gap-6 flex-1 overflow-x-auto pb-4">
        {['Applied', 'Interview', 'Offer', 'Hired'].map(stage => (
          <div key={stage} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-4 min-w-[320px] flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-700">{stage}</h3>
            {candidates.filter(c => c.stage === stage).map(c => (
              <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500 font-medium mt-2 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {c.role}</p>
                {isManager && stage !== 'Hired' && (
                  <button onClick={() => moveStage(c.id, stage === 'Applied' ? 'Interview' : stage === 'Interview' ? 'Offer' : 'Hired')} className="mt-3 text-xs text-emerald-600 font-semibold hover:underline">
                    Move forward →
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}