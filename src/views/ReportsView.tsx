import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, PieChart as PieChartIcon, FileText, Download, Filter, TrendingDown, Calendar, Activity } from 'lucide-react';
import { cn, fetcher } from '../utils';

const REPORTS = [
  { id: 'attendance', title: 'Attendance Report', icon: Calendar, description: 'Insights into attendance patterns, present days, absentees, and trends.', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'leave', title: 'Leave Report', icon: FileText, description: 'Accurate leave tracking to improve planning and reduce absenteeism.', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'performance', title: 'Performance Report', icon: Activity, description: 'Detailed insights into team achievements and KPIs.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'attrition', title: 'Attrition Report', icon: TrendingDown, description: 'Understand employee turnover to retain your best talent.', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'custom', title: 'Custom Report', icon: PieChartIcon, description: 'Generate specific reports tailored to your analytics dashboard.', color: 'text-purple-600', bg: 'bg-purple-50' },
];

export function ReportsView() {
  const [activeReport, setActiveReport] = useState('attendance');

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', activeReport],
    queryFn: () => fetcher<{ type: string; generatedAt: string; data: Record<string, unknown> }>(`/api/reports/${activeReport}`),
  });

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPreview = () => {
    if (isLoading) return <p className="text-sm text-gray-400">Loading report data...</p>;
    if (!report) return null;

    const d = report.data;

    if (activeReport === 'attendance') {
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase">Total Log Entries</p>
              <p className="text-2xl font-bold text-gray-900">{String(d.logs ?? 0)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 uppercase">Active Today</p>
              <p className="text-2xl font-bold text-emerald-900">{String(d.activeToday ?? 0)}</p>
            </div>
          </div>
        </div>
      );
    }

    if (activeReport === 'leave') {
      return (
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs text-amber-600 uppercase">Pending Requests</p>
            <p className="text-2xl font-bold text-amber-900">{String(d.pending ?? 0)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-600 uppercase">Approved</p>
            <p className="text-2xl font-bold text-emerald-900">{String(d.approved ?? 0)}</p>
          </div>
        </div>
      );
    }

    if (activeReport === 'performance') {
      const goals = (d.goals as unknown[]) ?? [];
      const reviews = (d.reviews as unknown[]) ?? [];
      return (
        <div className="grid grid-cols-3 gap-4 w-full">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 uppercase">Goals</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 uppercase">Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
            <p className="text-xs text-emerald-600 uppercase">Avg Rating</p>
            <p className="text-2xl font-bold text-emerald-900">{String(d.avgRating ?? '—')}</p>
          </div>
        </div>
      );
    }

    if (activeReport === 'attrition') {
      return (
        <div className="grid grid-cols-3 gap-4 w-full">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 uppercase">Headcount</p>
            <p className="text-2xl font-bold text-gray-900">{String(d.headcount ?? 0)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
            <p className="text-xs text-amber-600 uppercase">On Leave</p>
            <p className="text-2xl font-bold text-amber-900">{String(d.onLeave ?? 0)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
            <p className="text-xs text-red-600 uppercase">Departures (YTD)</p>
            <p className="text-2xl font-bold text-red-900">{String(d.departures ?? 0)}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className="text-sm text-gray-600">{String(d.message ?? 'Report generated')}</p>
        {Array.isArray(d.modules) && (
          <p className="text-xs text-gray-400 mt-2">Modules: {(d.modules as string[]).join(', ')}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">HR Analytics & Reports</h2>
          <p className="text-gray-500 mt-1">One-click report generation to simplify your HR tasks.</p>
        </div>
        <button onClick={downloadCsv} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          {REPORTS.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-2xl transition-all border text-left',
                activeReport === r.id ? 'bg-white border-gray-200 shadow-sm ring-1 ring-gray-900/5' : 'bg-transparent border-transparent hover:bg-gray-50',
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', r.bg)}>
                <r.icon className={cn('w-5 h-5', r.color)} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{REPORTS.find(r => r.id === activeReport)?.title}</h3>
              <p className="text-sm text-gray-500">
                {report ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : 'Loading...'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm">
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={downloadCsv} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {report ? renderPreview() : (
              <div className="text-center">
                <BarChart className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Select a report to view live data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}