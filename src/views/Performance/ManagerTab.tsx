import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, AlertTriangle, Star, Download, BarChart3 } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { fetcher, cn } from '../../utils';

type TeamRanking = {
  id: string;
  name: string;
  department: string;
  score: number;
  grade: string;
  counts: { kanbanCompleted: number; kanbanOverdue: number; onTimeRate: number };
};

export function ManagerTab() {
  const { data, isLoading } = usePerformanceData();
  const qc = useQueryClient();
  const stats = data?.teamStats;
  const [form, setForm] = useState({ userId: '', rating: 4, feedback: '', period: 'Q3 2026' });
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState('90d');
  const [department, setDepartment] = useState('');

  const { data: teamData, isLoading: teamLoading } = useQuery<{
    rankings: TeamRanking[];
  }>({
    queryKey: ['performance-team', period, department],
    queryFn: () => fetcher(`/api/performance/team?period=${period}${department ? `&department=${encodeURIComponent(department)}` : ''}`),
  });

  const { data: users = [] } = useQuery<{ id: string; name: string; role: string; department: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => fetcher('/api/users'),
  });

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  const submitReview = async () => {
    if (!form.userId || !form.feedback) return;
    setSubmitting(true);
    try {
      await fetcher('/api/performance/reviews', { method: 'POST', body: JSON.stringify(form) });
      qc.invalidateQueries({ queryKey: ['performance'] });
      qc.invalidateQueries({ queryKey: ['performance-team'] });
      setForm({ userId: '', rating: 4, feedback: '', period: 'Q3 2026' });
    } finally {
      setSubmitting(false);
    }
  };

  const recordSnapshots = async () => {
    await fetcher('/api/performance/snapshots', { method: 'POST' });
    qc.invalidateQueries({ queryKey: ['performance'] });
  };

  const downloadTeamReport = () => {
    const rankings = teamData?.rankings ?? [];
    let csv = 'name,department,score,grade,kanban_done,overdue,on_time_rate\n';
    rankings.forEach(r => {
      csv += `${r.name},${r.department},${r.score},${r.grade},${r.counts.kanbanCompleted},${r.counts.kanbanOverdue},${Math.round(r.counts.onTimeRate * 100)}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-performance-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p className="text-sm text-gray-500">Loading team data...</p>;

  const rankings = teamData?.rankings ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><Users className="w-5 h-5 text-gray-500" /><h3 className="font-semibold text-gray-900">Direct Reports</h3></div>
          <p className="text-3xl font-bold text-gray-900">{stats?.directReports ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">In your department</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-gray-900">Pending Reviews</h3></div>
          <p className="text-3xl font-bold text-amber-600">{stats?.pendingReviews ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Performance reviews pending</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><BarChart3 className="w-5 h-5 text-red-500" /><h3 className="font-semibold text-gray-900">Low Performers</h3></div>
          <p className="text-3xl font-bold text-red-600">{stats?.lowPerformers ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Score below 50%</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Team Performance Rankings</h3>
          <div className="flex flex-wrap gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="quarter">This quarter</option>
              <option value="ytd">Year to date</option>
              <option value="all">All time</option>
            </select>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={downloadTeamReport} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={recordSnapshots} className="flex items-center gap-1.5 bg-gray-900 text-white rounded-lg px-3 py-1.5 text-sm">
              Record Snapshot
            </button>
          </div>
        </div>
        {teamLoading ? (
          <p className="text-sm text-gray-500">Loading rankings…</p>
        ) : rankings.length === 0 ? (
          <p className="text-sm text-gray-500">No team members to rank.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Tasks</th>
                  <th className="pb-2">On-time</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, i) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{r.department}</td>
                    <td className="py-3 pr-4">
                      <span className={cn('font-bold', r.score >= 75 ? 'text-emerald-600' : r.score < 50 ? 'text-red-600' : 'text-amber-600')}>
                        {r.score}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{r.grade}</td>
                    <td className="py-3 pr-4 text-gray-600">{r.counts.kanbanCompleted} done · {r.counts.kanbanOverdue} late</td>
                    <td className="py-3 text-gray-600">{Math.round(r.counts.onTimeRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Submit Performance Review</h3>
        <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Select employee</option>
          {users.filter(u => u.role === 'employee' || u.role === 'sales').map(u => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}
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