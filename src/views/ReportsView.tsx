import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart as BarChartIcon, PieChart as PieChartIcon, FileText, Download, Filter,
  TrendingDown, Calendar, Activity, User, FolderKanban, IndianRupee,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { cn, fetcher } from '../utils';
import { CHART, chartTooltipStyle } from '../theme/charts';

const REPORTS = [
  { id: 'attendance', title: 'Attendance Report', icon: Calendar, description: 'Attendance patterns, present days, and late trends.', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'leave', title: 'Leave Report', icon: FileText, description: 'Leave tracking by type and approval status.', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'performance', title: 'Performance Report', icon: Activity, description: 'Team rankings, goals, and review insights.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'attrition', title: 'Attrition Report', icon: TrendingDown, description: 'Headcount, departures, and new hires.', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'employee', title: 'Employee Report', icon: User, description: 'Detailed report for a single employee.', color: 'text-indigo-600', bg: 'bg-indigo-50', needsEmployee: true },
  { id: 'projects', title: 'Projects Overview', icon: FolderKanban, description: 'All projects with health scores and open tasks.', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'project', title: 'Project Report', icon: FolderKanban, description: 'Deep dive into a single project.', color: 'text-violet-600', bg: 'bg-violet-50', needsProject: true },
  { id: 'finance', title: 'Finance Report', icon: IndianRupee, description: 'Payroll and expense breakdown by department.', color: 'text-teal-600', bg: 'bg-teal-50' },
];

const PIE_COLORS = CHART.series;

type Employee = { id: string; name: string; department: string };
type Project = { id: string; name: string };

export function ReportsView() {
  const [activeReport, setActiveReport] = useState('attendance');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const reportMeta = REPORTS.find(r => r.id === activeReport);
  const needsEmployee = reportMeta?.needsEmployee;
  const needsProject = reportMeta?.needsProject;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetcher('/api/employees'),
    enabled: needsEmployee,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
    enabled: needsProject,
  });

  const queryParams = new URLSearchParams();
  if (needsEmployee && selectedEmployee) queryParams.set('userId', selectedEmployee);
  if (needsProject && selectedProject) queryParams.set('projectId', selectedProject);
  const qs = queryParams.toString();

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', activeReport, selectedEmployee, selectedProject],
    queryFn: () => fetcher<{ type: string; generatedAt: string; data: Record<string, unknown> }>(
      `/api/reports/${activeReport}${qs ? `?${qs}` : ''}`,
    ),
    enabled: (!needsEmployee || !!selectedEmployee) && (!needsProject || !!selectedProject),
  });

  const downloadCsv = () => {
    if (!report) return;
    const d = report.data;
    let csv = '';
    if (activeReport === 'attendance') {
      csv = `metric,value\nTotal Log Entries,${d.logs ?? 0}\nActive Today,${d.activeToday ?? 0}\nLate This Month,${d.lateThisMonth ?? 0}\n`;
      const chart = (d.chart as { date: string; count: number }[]) || [];
      chart.forEach(row => { csv += `${row.date},${row.count}\n`; });
    } else if (activeReport === 'performance') {
      csv = 'name,department,score\n';
      const rankings = (d.rankings as { name: string; department: string; score: number }[]) || [];
      rankings.forEach(r => { csv += `${r.name},${r.department},${r.score}\n`; });
    } else if (activeReport === 'employee') {
      const emp = d.employee as { name: string; email: string; department: string } | undefined;
      csv = `Employee,${emp?.name ?? ''}\nEmail,${emp?.email ?? ''}\nDepartment,${emp?.department ?? ''}\nPerformance Score,${d.performanceScore ?? ''}\n`;
    } else if (activeReport === 'projects') {
      csv = 'name,status,progress,health,openTasks\n';
      const list = (d.projects as { name: string; status: string; progress: number; health: number; openTasks: number }[]) || [];
      list.forEach(p => { csv += `${p.name},${p.status},${p.progress},${p.health},${p.openTasks}\n`; });
    } else {
      csv = `key,value\n${Object.entries(d).map(([k, v]) => `${k},"${String(v).replace(/"/g, '""')}"`).join('\n')}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPreview = () => {
    if (needsEmployee && !selectedEmployee) {
      return <p className="text-sm text-gray-500">Select an employee to generate this report.</p>;
    }
    if (needsProject && !selectedProject) {
      return <p className="text-sm text-gray-500">Select a project to generate this report.</p>;
    }
    if (isLoading) return <p className="text-sm text-gray-400">Loading report data…</p>;
    if (!report) return null;

    const d = report.data;

    if (activeReport === 'attendance') {
      const chart = (d.chart as { date: string; count: number }[]) || [];
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Log Entries" value={String(d.logs ?? 0)} />
            <StatCard label="Active Employees" value={String(d.activeToday ?? 0)} accent="emerald" />
            <StatCard label="Late This Month" value={String(d.lateThisMonth ?? 0)} accent="amber" />
          </div>
          {chart.length > 0 && (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke={CHART.gold} strokeWidth={2} dot={{ r: 2, fill: CHART.gold }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    if (activeReport === 'leave') {
      const byType = (d.byType as { type: string; count: number }[]) || [];
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Pending" value={String(d.pending ?? 0)} accent="amber" />
            <StatCard label="Approved" value={String(d.approved ?? 0)} accent="emerald" />
            <StatCard label="Rejected" value={String(d.rejected ?? 0)} accent="red" />
          </div>
          {byType.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill={CHART.gold} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    if (activeReport === 'performance') {
      const rankings = (d.rankings as { name: string; department: string; score: number }[]) || [];
      const top = (d.topPerformers as { name: string; score: number }[]) || [];
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Avg Rating" value={String(d.avgRating ?? '—')} accent="emerald" />
            <StatCard label="Employees Ranked" value={String(rankings.length)} />
          </div>
          {rankings.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankings.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="score" fill={CHART.gold} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {top.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top.map((p, i) => (
                <div key={p.name} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                  <p className="text-xs text-emerald-600 uppercase">#{i + 1}</p>
                  <p className="font-semibold text-gray-900 mt-1">{p.name}</p>
                  <p className="text-2xl font-bold text-emerald-800">{p.score}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeReport === 'attrition') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          <StatCard label="Headcount" value={String(d.headcount ?? 0)} />
          <StatCard label="On Leave" value={String(d.onLeave ?? 0)} accent="amber" />
          <StatCard label="Departures" value={String(d.departures ?? 0)} accent="red" />
          <StatCard label="New Hires (30d)" value={String(d.newHires30d ?? 0)} accent="emerald" />
        </div>
      );
    }

    if (activeReport === 'employee') {
      const emp = d.employee as { name: string; email: string; department: string; title: string } | undefined;
      const att = d.attendance as { totalDays: number; avgHours: number; lateCount: number } | undefined;
      const leaves = d.leaves as { total: number; approved: number; pending: number } | undefined;
      return (
        <div className="w-full space-y-6">
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <h4 className="font-semibold text-gray-900 text-lg">{emp?.name}</h4>
            <p className="text-sm text-gray-600">{emp?.title} · {emp?.department}</p>
            <p className="text-sm text-gray-500">{emp?.email}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Performance Score" value={String(d.performanceScore ?? 0)} accent="emerald" />
            <StatCard label="Days Present" value={String(att?.totalDays ?? 0)} />
            <StatCard label="Avg Hours" value={String(att?.avgHours ?? 0)} />
            <StatCard label="Tasks Done" value={String(d.tasksCompleted ?? 0)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Leave Requests" value={String(leaves?.total ?? 0)} />
            <StatCard label="Approved" value={String(leaves?.approved ?? 0)} accent="emerald" />
            <StatCard label="Pending" value={String(leaves?.pending ?? 0)} accent="amber" />
          </div>
        </div>
      );
    }

    if (activeReport === 'projects') {
      const list = (d.projects as { name: string; status: string; progress: number; health: number; openTasks: number; client: string }[]) || [];
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Projects" value={String(d.total ?? 0)} />
            <StatCard label="Active" value={String(d.active ?? 0)} accent="emerald" />
            <StatCard label="Completed" value={String(d.completed ?? 0)} />
          </div>
          {list.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={list}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="health" name="Health" fill={CHART.gold} radius={[6, 6, 0, 0]} />
                <Bar dataKey="progress" name="Progress" fill={CHART.goldLight} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {list.map(p => (
              <div key={p.name} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-700">{p.name} {p.client && <span className="text-gray-400">({p.client})</span>}</span>
                <span className="font-medium text-gray-900">Health {p.health}% · {p.openTasks} open</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeReport === 'project') {
      const proj = d.project as { name: string; status: string; progress: number; client: string } | undefined;
      const tasks = d.tasks as { total: number; done: number; byStage: { stage: string; count: number }[] } | undefined;
      const timesheets = d.timesheets as { hours: number; entries: number } | undefined;
      return (
        <div className="w-full space-y-6">
          <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
            <h4 className="font-semibold text-gray-900 text-lg">{proj?.name}</h4>
            <p className="text-sm text-gray-600 capitalize">{proj?.status?.replace('_', ' ')} · {proj?.client}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Health Score" value={String(d.health ?? 0)} accent="emerald" />
            <StatCard label="Progress" value={`${proj?.progress ?? 0}%`} />
            <StatCard label="Tasks Done" value={`${tasks?.done ?? 0}/${tasks?.total ?? 0}`} />
            <StatCard label="Hours Logged" value={String(timesheets?.hours ?? 0)} />
          </div>
          {tasks?.byStage && tasks.byStage.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tasks.byStage.filter(s => s.count > 0)} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={80}>
                  {tasks.byStage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    if (activeReport === 'finance') {
      const byDept = (d.byDepartment as { department: string; payroll: number; headcount: number }[]) || [];
      return (
        <div className="w-full space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Payroll" value={`₹${Number(d.totalPayroll ?? 0).toLocaleString('en-IN')}`} />
            <StatCard label="Approved Expenses" value={`₹${Number(d.approvedExpenses ?? 0).toLocaleString('en-IN')}`} accent="emerald" />
            <StatCard label="Pending Expenses" value={`₹${Number(d.pendingExpenses ?? 0).toLocaleString('en-IN')}`} accent="amber" />
          </div>
          {byDept.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDept}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: CHART.ivoryMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.ivoryMuted }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} contentStyle={chartTooltipStyle} />
                <Bar dataKey="payroll" fill={CHART.goldMuted} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className="text-sm text-gray-600">{String(d.message ?? 'Report generated')}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex items-center justify-between">
        <div>
          <p className="studio-kicker mb-1">Intelligence</p>
          <h2 className="font-display text-2xl font-medium text-ivory tracking-tight">HR Analytics & Reports</h2>
          <p className="text-ivory-muted text-sm mt-1">Attendance, performance, projects, finance, and per-employee insights.</p>
        </div>
        <button onClick={downloadCsv} disabled={!report} className="btn-primary text-sm disabled:opacity-50">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {REPORTS.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-xl transition-all border text-left',
                activeReport === r.id
                  ? 'studio-card border-gold/20 ring-1 ring-gold/10'
                  : 'border-transparent hover:bg-gold/5 hover:border-gold/10',
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', r.bg)}>
                <r.icon className={cn('w-5 h-5', r.color)} />
              </div>
              <div>
                <h3 className="font-medium text-ivory text-sm">{r.title}</h3>
                <p className="text-xs text-ivory-muted mt-1 line-clamp-2">{r.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 studio-card p-6 flex flex-col min-h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gold/10">
            <div>
              <h3 className="font-display text-lg font-medium text-ivory">{reportMeta?.title}</h3>
              <p className="text-sm text-ivory-muted">
                {report ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : 'Configure filters below'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {needsEmployee && (
                <select
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  <option value="">Select employee…</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
                  ))}
                </select>
              )}
              {needsProject && (
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  <option value="">Select project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm">
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={downloadCsv} disabled={!report} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {report || (needsEmployee && !selectedEmployee) || (needsProject && !selectedProject) ? renderPreview() : (
              <div className="text-center">
                <BarChartIcon className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Select a report to view live data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' | 'red' }) {
  return (
    <div className={cn('premium-stat', accent === 'emerald' && 'border-gold/20')}>
      <p className="premium-stat-label">{label}</p>
      <p className={cn('premium-stat-value text-2xl mt-1', accent === 'red' && 'text-red-300/90')}>{value}</p>
    </div>
  );
}