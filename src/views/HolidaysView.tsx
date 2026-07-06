import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';
import { fetcher } from '../utils';
import { useRBACStore } from '../store';

interface Holiday { id: string; name: string; date: string; type: string }

export function HolidaysView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'Company' });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => fetcher('/api/holidays'),
  });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/holidays', { method: 'POST', body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ['holidays'] });
    setShowForm(false);
    setForm({ name: '', date: '', type: 'Company' });
  };

  const sorted = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter(h => new Date(h.date) >= new Date());

  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 border border-gray-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Holiday Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">{upcoming.length} upcoming holidays</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-wrap gap-3 shadow-sm">
          <input required placeholder="Holiday name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option>Company</option><option>National</option><option>Optional</option>
          </select>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No holidays configured</p>
          </div>
        ) : sorted.map(h => (
          <div key={h.id} className="p-5 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">{new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                <span className="text-lg font-bold text-gray-900">{new Date(h.date).getDate()}</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{h.name}</h4>
                <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase rounded-md">{h.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}