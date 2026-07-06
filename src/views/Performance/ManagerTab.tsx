import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, AlertTriangle, Star } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { fetcher } from '../../utils';

export function ManagerTab() {
  const { data, isLoading } = usePerformanceData();
  const qc = useQueryClient();
  const stats = data?.teamStats;
  const [form, setForm] = useState({ userId: '', rating: 4, feedback: '', period: 'Q3 2026' });
  const [submitting, setSubmitting] = useState(false);

  const { data: users = [] } = useQuery<{ id: string; name: string; role: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => fetcher('/api/users'),
  });

  const submitReview = async () => {
    if (!form.userId || !form.feedback) return;
    setSubmitting(true);
    try {
      await fetcher('/api/performance/reviews', { method: 'POST', body: JSON.stringify(form) });
      qc.invalidateQueries({ queryKey: ['performance'] });
      setForm({ userId: '', rating: 4, feedback: '', period: 'Q3 2026' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-sm text-gray-500">Loading team data...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><Users className="w-5 h-5 text-gray-500" /><h3 className="font-semibold text-gray-900">Direct Reports</h3></div>
          <p className="text-3xl font-bold text-gray-900">{stats?.directReports ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">In your department</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-gray-900">Pending Reviews</h3></div>
          <p className="text-3xl font-bold text-amber-600">{stats?.pendingReviews ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Tasks awaiting approval</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Submit Performance Review</h3>
        <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Select employee</option>
          {users.filter(u => u.role === 'employee').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Rating:</label>
          <input type="range" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="flex-1" />
          <span className="text-sm font-bold text-gray-900">{form.rating}/5</span>
        </div>
        <textarea value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} placeholder="Feedback and notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} />
        <button onClick={submitReview} disabled={submitting || !form.userId} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Submit Review</button>
      </div>
    </div>
  );
}