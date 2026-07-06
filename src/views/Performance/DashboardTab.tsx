import { Trophy, TrendingUp, Target, Award, Star, BookOpen, Clock, Activity } from 'lucide-react';
import { cn } from '../../utils';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useRBACStore } from '../../store';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '../../utils';

export function DashboardTab() {
  const { data } = usePerformanceData();
  const { currentUser } = useRBACStore();
  const { data: rewards } = useQuery<{ rank: number }>({
    queryKey: ['rewards-summary'],
    queryFn: () => fetcher('/api/rewards/summary'),
  });

  const prod = data?.productivity;
  const score = prod ? Math.round((prod.qualityScore + prod.tasksCompleted * 2) / 3) : 0;

  const metrics = [
    { label: 'Overall Performance', value: `${score}%`, trend: 'Live', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Quality Score', value: `${prod?.qualityScore ?? 0}%`, trend: 'From tasks', icon: Star, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'OKR Progress', value: `${data?.goals?.[0]?.progress ?? 0}%`, trend: data?.goals?.[0]?.quarter || 'Q3', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Tasks Completed', value: String(prod?.tasksCompleted ?? 0), trend: 'This period', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Avg Hours/Day', value: `${prod?.avgHours ?? 0}h`, trend: 'Weekly avg', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { label: 'Reward Points', value: (currentUser?.points ?? 0).toLocaleString(), trend: `Rank #${rewards?.rank ?? '-'}`, icon: Award, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Goals Active', value: String(data?.goals?.length ?? 0), trend: 'In progress', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Reviews', value: String(data?.reviews?.length ?? 0), trend: 'On file', icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 bg-gray-900 rounded-2xl p-8 text-white flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-32 h-32" /></div>
          <div className="relative z-10">
            <h3 className="text-gray-400 font-medium tracking-wide uppercase text-sm mb-2">Performance Score</h3>
            <div className="text-6xl font-bold text-white mb-2 tracking-tight">{score}</div>
            <div className="text-emerald-400 font-semibold text-lg">{score >= 90 ? 'Exceptional' : score >= 75 ? 'Strong Performer' : 'Developing'}</div>
            <div className="mt-8 flex items-center justify-center gap-6">
              <div>
                <div className="text-3xl font-bold">#{rewards?.rank ?? '-'}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Company Rank</div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
    </div>
  );
}