import { Clock, CheckSquare, Star } from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';

export function ProductivityTab() {
  const { data, isLoading } = usePerformanceData();
  const prod = data?.productivity;

  if (isLoading) return <p className="text-sm text-gray-500">Loading productivity data...</p>;

  const prodStats = [
    { label: 'Tasks Completed', value: String(prod?.tasksCompleted ?? 0), subtitle: 'Approved tasks' },
    { label: 'Avg Hours/Day', value: `${prod?.avgHours ?? 0}h`, subtitle: 'Weekly average' },
    { label: 'Quality Score', value: `${prod?.qualityScore ?? 0}%`, subtitle: 'From reviews' },
    { label: 'Completion Rate', value: prod?.tasksCompleted ? `${Math.min(100, prod.tasksCompleted * 5)}%` : '0%', subtitle: 'This period' },
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
          <h3 className="text-base font-semibold text-gray-900 mb-6">Quality Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Quality Score: {prod?.qualityScore ?? 0}%</p>
                <p className="text-xs text-gray-500">Based on completed task reviews</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{prod?.tasksCompleted ?? 0} tasks completed</p>
                <p className="text-xs text-gray-500">Marketplace & assigned tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{prod?.avgHours ?? 0}h average daily</p>
                <p className="text-xs text-gray-500">From attendance logs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}