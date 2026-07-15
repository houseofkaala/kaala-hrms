import { Trophy, TrendingUp, Target, Award, Star, BookOpen, Clock, Activity, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useRBACStore } from '../../store';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '../../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

export function DashboardTab() {
  const { data } = usePerformanceData();
  const { currentUser } = useRBACStore();
  const { data: rewards } = useQuery<{ rank: number }>({
    queryKey: ['rewards-summary'],
    queryFn: () => fetcher('/api/rewards/summary'),
  });

  const prod = data?.productivity;
  const score = prod?.performanceScore ?? 0;
  const grade = prod?.grade ?? 'Developing';
  const breakdown = prod?.breakdown;
  const trend = data?.trend ?? [];

  const breakdownChart = breakdown ? [
    { name: 'Attendance', value: breakdown.attendance },
    { name: 'Tasks', value: breakdown.taskDelivery },
    { name: 'On-time', value: breakdown.onTimeDelivery },
    { name: 'Goals', value: breakdown.goals },
    { name: 'Reviews', value: breakdown.reviews },
  ] : [];

  const metrics = [
    { label: 'Overall Performance', value: `${score}`, trend: grade, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Kanban Tasks Done', value: String(prod?.kanbanCompleted ?? 0), trend: `${prod?.kanbanOverdue ?? 0} overdue`, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'On-Time Rate', value: `${Math.round((prod?.onTimeRate ?? 0) * 100)}%`, trend: 'Task delivery', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'OKR Progress', value: `${data?.metrics?.counts.goalsAvgProgress ?? data?.goals?.[0]?.progress ?? 0}%`, trend: data?.goals?.[0]?.quarter || 'Current', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Avg Hours/Day', value: `${prod?.avgHours ?? 0}h`, trend: 'From attendance', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { label: 'Reward Points', value: (currentUser?.points ?? 0).toLocaleString(), trend: `Rank #${rewards?.rank ?? '-'}`, icon: Award, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Goals Active', value: String(data?.goals?.length ?? 0), trend: 'In progress', icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Reviews', value: String(data?.reviews?.length ?? 0), trend: `Avg ${data?.metrics?.counts.avgReviewRating ?? '—'}/5`, icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 bg-gray-900 rounded-2xl p-8 text-white flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-32 h-32" /></div>
          <div className="relative z-10">
            <h3 className="text-gray-400 font-medium tracking-wide uppercase text-sm mb-2">Performance Score</h3>
            <div className="text-6xl font-bold text-white mb-2 tracking-tight">{score}</div>
            <div className="text-emerald-400 font-semibold text-lg">{grade}</div>
            {breakdown && breakdown.overduePenalty > 0 && (
              <p className="text-amber-400 text-xs mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> -{breakdown.overduePenalty} overdue penalty
              </p>
            )}
            <div className="mt-8 flex items-center justify-center gap-6">
              <div>
                <div className="text-3xl font-bold">#{rewards?.rank ?? '-'}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Company Rank</div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow min-w-0 flex flex-col">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0', m.bg)}>
                  <Icon className={cn('w-5 h-5', m.color)} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1 truncate">{m.value}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 truncate" title={m.label}>{m.label}</div>
                <div className="mt-auto text-xs font-medium text-emerald-600 bg-emerald-50 inline-flex px-2 py-1 rounded-md truncate max-w-full">{m.trend}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {breakdownChart.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Score Breakdown (90 days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={breakdownChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#651a2c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {trend.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#651a2c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {breakdownChart.length === 0 && trend.length === 0 && (
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-sm">
            Complete tasks, mark attendance, and set goals to build your performance profile. Monthly snapshots track your trend over time.
          </div>
        )}
      </div>
    </div>
  );
}