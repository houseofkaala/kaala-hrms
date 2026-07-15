import { Clock, CheckSquare, Star, Target, AlertCircle, TrendingUp } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';

export function ProductivityTab() {
  const { data, isLoading } = usePerformanceData();
  const prod = data?.productivity;
  const counts = data?.metrics?.counts;

  if (isLoading) return <p className="text-sm text-gray-500">Loading productivity data...</p>;

  const prodStats = [
    { label: 'Total Tasks Done', value: String(prod?.tasksCompleted ?? 0), subtitle: 'All sources' },
    { label: 'Kanban Completed', value: String(prod?.kanbanCompleted ?? 0), subtitle: `${prod?.kanbanOverdue ?? 0} overdue` },
    { label: 'Marketplace Tasks', value: String(prod?.marketplaceCompleted ?? 0), subtitle: 'Approved & completed' },
    { label: 'Project Tasks', value: String(prod?.projectCompleted ?? 0), subtitle: 'Project board' },
    { label: 'On-Time Rate', value: `${Math.round((prod?.onTimeRate ?? 0) * 100)}%`, subtitle: 'Before due date' },
    { label: 'Avg Hours/Day', value: `${prod?.avgHours ?? 0}h`, subtitle: `${counts?.daysPresent ?? 0} days present` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Productivity Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {prodStats.map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-w-0">
                <div className="text-2xl font-bold text-gray-900 mb-1 truncate">{stat.value}</div>
                <div className="text-sm font-medium text-gray-900 truncate">{stat.label}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.subtitle}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Quality & Delivery</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Performance Score: {prod?.performanceScore ?? 0}/100</p>
                <p className="text-xs text-gray-500">Grade: {prod?.grade ?? 'Developing'} · Reviews avg {counts?.avgReviewRating ?? '—'}/5</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{prod?.kanbanCompleted ?? 0} kanban tasks completed</p>
                <p className="text-xs text-gray-500">{counts?.kanbanOpen ?? 0} still open · {counts?.kanbanOnTime ?? 0} on time</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{Math.round((prod?.onTimeRate ?? 0) * 100)}% on-time delivery</p>
                <p className="text-xs text-gray-500">Tasks finished before due date</p>
              </div>
            </div>
            {(prod?.kanbanOverdue ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{prod?.kanbanOverdue} overdue tasks</p>
                  <p className="text-xs text-gray-500">Impacts on-time delivery score</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{counts?.goalsAvgProgress ?? 0}% goal progress</p>
                <p className="text-xs text-gray-500">{counts?.goalsTotal ?? 0} active goals</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-cyan-50 rounded-xl border border-cyan-100">
              <Clock className="w-5 h-5 text-cyan-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{prod?.avgHours ?? 0}h average daily</p>
                <p className="text-xs text-gray-500">{counts?.lateArrivals ?? 0} late arrivals recorded</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}