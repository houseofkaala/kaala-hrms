import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Calendar, Clock, Timer, FolderKanban, CheckSquare,
  TrendingUp, Briefcase, ArrowRight, ListTodo, ClipboardList, ShieldAlert,
  CheckCircle2, XCircle, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, fetcher } from '../utils';
import { AtelierPageHeader } from '../components/AtelierChrome';
import { UserPortrait } from '../components/UserPortrait';
import { useRBACStore } from '../store';
import type { Task, User } from '../types';

type Period = 'daily' | 'weekly' | 'monthly';

interface DashboardData {
  period: Period;
  greeting: string;
  stats: {
    totalEmployees: number;
    onLeave: number;
    newJoinees: number;
    upcomingHoliday: { name: string; date: string; type: string } | null;
  };
  timesheets: {
    total: number;
    pending: number;
    approved: number;
    totalHours: number;
    recent: { id: string; projectName: string; hours: number; status: string; date: string; employee?: string }[];
    mine: { id: string; projectName: string; hours: number; status: string; date: string }[];
  };
  latestMembers: { id: string; name: string; title?: string; department: string; joinDate?: string; status: string; hasProfileImage?: boolean }[];
  attendance: {
    presentToday: number;
    teamSize: number;
    avgClockIn: string;
    avgClockOut: string;
    avgWorkingHours: number;
    chart: { date: string; label: string; present: number; hours: number }[];
  };
  memberLeaves: { id: string; employee: string; type: string; startDate: string; endDate: string; status: string; days: number }[];
  leaves: {
    pending: number;
    approved: number;
    rejected: number;
    annualRemaining: number;
    sickRemaining: number;
    recent: { id: string; type: string; status: string; days: number; startDate: string }[];
  };
  payPeriod: {
    start: string;
    end: string;
    dayOfMonth: number;
    daysInPeriod: number;
    daysRemaining: number;
    resetDate: string;
    netPay: number | null;
    status: string;
  };
  projects: {
    taken: number;
    completed: number;
    inProgress: number;
    efficiency: number;
    items: { id: string; name: string; status: string; progress: number }[];
  };
  team: { id: string; name: string; title?: string; department: string; status: string; joinDate?: string; hasProfileImage?: boolean }[];
  todos: { id: string; title: string; type: string; status: string; dueDate: string | null; priority: string }[];
}

interface DashboardViewProps {
  tasks: Task[];
  reviewTasks: Task[];
  isManager: boolean;
  allUsers: User[];
  onComplete: (id: string) => void;
  onReview: (id: string, action: 'approve' | 'reject') => void;
  onRefresh: () => void;
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon?: typeof Users }) {
  return (
    <div className="premium-stat group">
      <div className="flex items-start justify-between gap-2">
        <p className="premium-stat-label">{label}</p>
        {Icon && <Icon className="w-4 h-4 premium-stat-icon shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="premium-stat-value">{value}</p>
      {sub && <p className="text-xs text-ivory-muted mt-1.5">{sub}</p>}
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];
  return (
    <div className="period-toggle">
      {opts.map(o => (
        <button
          key={o.key}
          type="button"
          data-active={value === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardView({ isManager, reviewTasks, allUsers, onReview, onRefresh }: DashboardViewProps) {
  const userName = (id: string) => allUsers.find(u => u.id === id)?.name || id;
  const { currentUser } = useRBACStore();
  const [tab, setTab] = useState<'team' | 'todo'>('team');
  const [period, setPeriod] = useState<Period>('monthly');

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', period],
    queryFn: () => fetcher(`/api/dashboard?period=${period}`),
    refetchInterval: 60_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const payProgress = data
    ? Math.round((data.payPeriod.dayOfMonth / data.payPeriod.daysInPeriod) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <AtelierPageHeader activeTab="dashboard" />

      {/* Executive profile */}
      <div className="flex flex-col gap-5 studio-reveal">
        <div className="executive-profile p-6 sm:p-10 relative z-[1]">
          <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end gap-8 lg:gap-12">
            <div className="relative shrink-0">
              <div className="absolute -inset-3 rounded-[1.75rem] border border-gold/20 pointer-events-none" />
              <UserPortrait
                userId={currentUser?.id || ''}
                name={currentUser?.name || 'User'}
                hasProfileImage={currentUser?.hasProfileImage}
                size="hero"
              />
              <Link
                to="/profile"
                className="absolute -bottom-2 -right-2 bg-charcoal/90 border border-gold/30 text-gold-light text-[9px] font-medium uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md hover:border-gold/50 transition-colors"
              >
                Edit portrait
              </Link>
            </div>
            <div className="flex-1 text-center lg:text-left pb-1 min-w-0">
              <p className="studio-kicker">{greeting()}</p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-medium mt-3 text-ivory tracking-tight leading-[1.05]">
                {currentUser?.name || data?.greeting || 'there'}
              </h2>
              <div className="executive-profile-divider my-5 max-w-md mx-auto lg:mx-0" />
              <p className="text-sm text-gold-muted tracking-wide">
                {currentUser?.title || currentUser?.role}
                <span className="text-gold/40 mx-2">·</span>
                {currentUser?.department}
              </p>
              <p className="text-sm text-ivory-muted mt-4 max-w-xl leading-relaxed mx-auto lg:mx-0">
                Executive overview — team performance, attendance, projects, and priorities at a glance.
              </p>
            </div>
            <div className="shrink-0 pb-1">
              <PeriodToggle value={period} onChange={setPeriod} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 premium-tabs studio-reveal studio-reveal-d1">
        {([
          { key: 'team' as const, label: 'My Team', icon: Users },
          { key: 'todo' as const, label: 'To Do', icon: ListTodo },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            data-active={tab === t.key}
            onClick={() => setTab(t.key)}
            className="premium-tab"
          >
            <t.icon className="w-4 h-4 opacity-70" />
            {t.label}
            {t.key === 'todo' && data?.todos.length ? (
              <span className="studio-chip text-[9px] py-0.5 px-2">{data.todos.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isManager && reviewTasks.length > 0 && (
        <div className="studio-card overflow-hidden studio-reveal studio-reveal-d1">
          <div className="premium-panel-header flex justify-between items-center">
            <h3 className="font-display text-base font-medium text-ivory flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-gold" /> Pending Approvals
            </h3>
            <span className="studio-chip studio-chip-live">{reviewTasks.length}</span>
          </div>
          <div className="p-6 space-y-3">
            {reviewTasks.map(task => (
              <div key={task.id} className="studio-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-maroon-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-maroon-900">{task.title}</p>
                    <p className="text-[10px] text-maroon-500">
                      By {userName(task.claimedById!)} · +10 KP
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => onReview(task.id, 'reject')} className="btn-secondary text-xs py-1.5 px-3">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button type="button" onClick={() => onReview(task.id, 'approve')} className="btn-primary text-xs py-1.5 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading || !data ? (
        <div className="py-20 text-center text-ivory-muted text-sm">Loading dashboard…</div>
      ) : tab === 'team' ? (
        <div className="space-y-6 studio-reveal studio-reveal-d2">
          {/* Row 1: Headline stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Employees" value={data.stats.totalEmployees} sub="In your team" icon={Users} />
            <StatCard label="Kaala Points" value={currentUser?.points ?? 0} sub="Your balance" icon={TrendingUp} />
            <StatCard label="On Leave" value={data.stats.onLeave} sub="Team members away" icon={Calendar} />
            <StatCard label="New Joinees" value={data.stats.newJoinees} sub="Last 30 days" icon={UserPlus} />
            <StatCard
              label="Upcoming Holiday"
              value={data.stats.upcomingHoliday?.name || '—'}
              sub={data.stats.upcomingHoliday
                ? format(new Date(data.stats.upcomingHoliday.date), 'MMM d, yyyy')
                : 'No holidays scheduled'}
              icon={Calendar}
            />
          </div>

          {/* Row 2: Attendance metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Avg Clock In" value={data.attendance.avgClockIn} sub={`${period} average`} icon={Clock} />
            <StatCard label="Avg Clock Out" value={data.attendance.avgClockOut} sub={`${period} average`} icon={Clock} />
            <StatCard label="Avg Working Hours" value={`${data.attendance.avgWorkingHours}h`} sub="Per day" icon={Timer} />
            <StatCard
              label="Present Today"
              value={`${data.attendance.presentToday}/${data.attendance.teamSize}`}
              sub="Team checked in"
              icon={TrendingUp}
            />
          </div>

          {/* Row 3: Pay period + Projects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="studio-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-maroon-950">Pay Period</h3>
                <span className="studio-chip">{data.payPeriod.status}</span>
              </div>
              <p className="text-xs text-maroon-500 mb-3">
                {format(new Date(data.payPeriod.start), 'MMM d')} – {format(new Date(data.payPeriod.end), 'MMM d, yyyy')}
                · Resets {format(new Date(data.payPeriod.resetDate), 'MMM d')}
              </p>
              <div className="flex items-end justify-between mb-2">
                <span className="font-display text-3xl font-semibold text-maroon-950">
                  {data.payPeriod.netPay != null ? `₹${data.payPeriod.netPay.toLocaleString('en-IN')}` : '—'}
                </span>
                <span className="text-xs text-maroon-500">
                  Day {data.payPeriod.dayOfMonth} of {data.payPeriod.daysInPeriod}
                </span>
              </div>
              <div className="w-full h-1 bg-charcoal rounded-full overflow-hidden border border-gold/10">
                <div className="h-full bg-gradient-to-r from-gold-muted to-gold rounded-full transition-all" style={{ width: `${payProgress}%` }} />
              </div>
              <p className="text-xs text-maroon-500 mt-2">{data.payPeriod.daysRemaining} days until reset</p>
            </div>

            <div className="studio-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-maroon-950">Project Status</h3>
                <span className="studio-chip studio-chip-live">{data.projects.efficiency}% efficiency</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-xl bg-maroon-50 border border-maroon-100">
                  <p className="font-display text-2xl font-semibold text-maroon-900">{data.projects.taken}</p>
                  <p className="text-[10px] uppercase tracking-wider text-maroon-500 mt-1">Taken</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="font-display text-2xl font-semibold text-emerald-800">{data.projects.completed}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 mt-1">Completed</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="font-display text-2xl font-semibold text-amber-800">{data.projects.inProgress}</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 mt-1">In Progress</p>
                </div>
              </div>
              {data.projects.items.length > 0 && (
                <div className="space-y-2">
                  {data.projects.items.map(p => (
                    <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-maroon-50 transition-colors group">
                      <span className="text-sm font-medium text-maroon-900 truncate">{p.name}</span>
                      <span className="text-xs text-maroon-500 capitalize">{p.status.replace('_', ' ')} · {p.progress}%</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 mt-3 hover:underline">
                View all projects <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Row 4: Timesheets, Latest members, Attendance chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="studio-card overflow-hidden">
              <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50 flex justify-between items-center">
                <h3 className="font-display text-sm font-semibold text-maroon-950">Timesheets</h3>
                <Link to="/timesheets" className="text-[10px] font-semibold text-maroon-600 hover:underline">View all</Link>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex gap-4 text-xs">
                  <span><strong className="text-maroon-900">{data.timesheets.total}</strong> entries</span>
                  <span className="text-amber-600">{data.timesheets.pending} pending</span>
                  <span className="text-emerald-600">{data.timesheets.approved} approved</span>
                  <span className="text-maroon-500">{data.timesheets.totalHours}h total</span>
                </div>
                {data.timesheets.recent.length === 0 ? (
                  <p className="text-xs text-maroon-400 py-4 text-center">No timesheets this period</p>
                ) : (
                  data.timesheets.recent.map(ts => (
                    <div key={ts.id} className="flex justify-between items-center py-2 border-b border-maroon-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-maroon-900">{ts.projectName}</p>
                        <p className="text-[10px] text-maroon-500">{ts.employee || 'You'} · {ts.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{ts.hours}h</p>
                        <p className="text-[10px] text-maroon-500 capitalize">{ts.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="studio-card overflow-hidden">
              <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50 flex justify-between items-center">
                <h3 className="font-display text-sm font-semibold text-maroon-950">Latest Members</h3>
                <Link to="/people" className="text-[10px] font-semibold text-maroon-600 hover:underline">Directory</Link>
              </div>
              <div className="p-5 space-y-3">
                {data.latestMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <UserPortrait userId={m.id} name={m.name} hasProfileImage={m.hasProfileImage} size="small" framed={false} className="rounded-full !w-9 !h-9" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-maroon-900 truncate">{m.name}</p>
                      <p className="text-[10px] text-maroon-500 truncate">{m.title || m.department}</p>
                    </div>
                    <span className={cn(
                      'text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0',
                      m.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                    )}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="studio-card overflow-hidden">
              <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50">
                <h3 className="font-display text-sm font-semibold text-maroon-950">Attendance</h3>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-1 h-28">
                  {data.attendance.chart.map(d => {
                    const maxH = Math.max(...data.attendance.chart.map(c => c.present), 1);
                    const h = Math.max(8, (d.present / maxH) * 100);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-gold-muted to-gold rounded-t min-h-[4px] transition-all opacity-80 hover:opacity-100"
                          style={{ height: `${h}%` }}
                          title={`${d.present} present, ${d.hours}h`}
                        />
                        <span className="text-[8px] text-maroon-400 truncate w-full text-center">{period === 'daily' ? 'Today' : d.label}</span>
                      </div>
                    );
                  })}
                </div>
                <Link to="/attendance" className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 mt-4 hover:underline">
                  Open attendance <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Row 5: Leaves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="studio-card overflow-hidden">
              <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50 flex justify-between items-center">
                <h3 className="font-display text-sm font-semibold text-maroon-950">Member&apos;s Leave</h3>
                {isManager && <Link to="/leave" className="text-[10px] font-semibold text-maroon-600 hover:underline">Manage</Link>}
              </div>
              <div className="p-5 space-y-2">
                {data.memberLeaves.length === 0 ? (
                  <p className="text-xs text-maroon-400 py-4 text-center">No team leave requests</p>
                ) : (
                  data.memberLeaves.map(l => (
                    <div key={l.id} className="flex justify-between items-center py-2 border-b border-maroon-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-maroon-900">{l.employee}</p>
                        <p className="text-[10px] text-maroon-500">{l.type} · {l.days}d · {l.startDate} → {l.endDate}</p>
                      </div>
                      <span className={cn(
                        'text-[9px] font-bold uppercase px-2 py-0.5 rounded-full',
                        l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700'
                          : l.status === 'Pending' ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700',
                      )}>
                        {l.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="studio-card overflow-hidden">
              <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50 flex justify-between items-center">
                <h3 className="font-display text-sm font-semibold text-maroon-950">My Leaves</h3>
                <Link to="/leave" className="text-[10px] font-semibold text-maroon-600 hover:underline">Apply</Link>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-amber-50">
                    <p className="font-display text-xl font-semibold text-amber-800">{data.leaves.pending}</p>
                    <p className="text-[9px] uppercase text-amber-600">Pending</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-50">
                    <p className="font-display text-xl font-semibold text-emerald-800">{data.leaves.approved}</p>
                    <p className="text-[9px] uppercase text-emerald-600">Approved</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-maroon-50">
                    <p className="font-display text-xl font-semibold text-maroon-800">{data.leaves.annualRemaining}</p>
                    <p className="text-[9px] uppercase text-maroon-600">Annual left</p>
                  </div>
                </div>
                {data.leaves.recent.map(l => (
                  <div key={l.id} className="flex justify-between py-2 border-b border-maroon-50 last:border-0 text-sm">
                    <span className="text-maroon-900">{l.type} · {l.days}d</span>
                    <span className="text-xs text-maroon-500 capitalize">{l.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team roster */}
          <div className="studio-card overflow-hidden">
            <div className="px-5 py-4 border-b border-maroon-100 bg-maroon-50/50">
              <h3 className="font-display text-sm font-semibold text-maroon-950">My Team ({data.team.length})</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.team.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-maroon-100 hover:border-maroon-200 transition-colors">
                  <UserPortrait userId={m.id} name={m.name} hasProfileImage={m.hasProfileImage} size="medium" framed={false} className="rounded-xl !w-10 !h-12" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-maroon-900 truncate">{m.name}</p>
                    <p className="text-[10px] text-maroon-500 truncate">{m.title || m.department}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* To Do tab */
        <div className="space-y-6 studio-reveal studio-reveal-d2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total To Do" value={data.todos.length} sub="Across all modules" icon={ListTodo} />
            <StatCard
              label="Marketplace"
              value={data.todos.filter(t => t.type === 'marketplace').length}
              icon={Briefcase}
            />
            <StatCard
              label="Projects"
              value={data.todos.filter(t => t.type === 'project').length}
              icon={FolderKanban}
            />
            <StatCard
              label="Onboarding"
              value={data.todos.filter(t => t.type === 'onboarding').length}
              icon={ClipboardList}
            />
          </div>

          <div className="studio-card overflow-hidden">
            <div className="px-6 py-4 border-b border-maroon-100 bg-maroon-50/50 flex justify-between items-center">
              <h3 className="font-display text-base font-semibold text-maroon-950 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> To Do List
              </h3>
              <button type="button" onClick={onRefresh} className="text-xs font-semibold text-maroon-600 hover:underline">
                Refresh
              </button>
            </div>
            <div className="p-6">
              {data.todos.length === 0 ? (
                <div className="py-16 text-center text-maroon-400">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">All caught up — no pending items.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.todos.map(todo => (
                    <div key={`${todo.type}-${todo.id}`} className="studio-card p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          'text-[9px] font-bold uppercase px-2 py-1 rounded-full shrink-0',
                          todo.type === 'marketplace' ? 'bg-maroon-100 text-maroon-700'
                            : todo.type === 'project' ? 'bg-blue-50 text-blue-700'
                              : todo.type === 'onboarding' ? 'bg-purple-50 text-purple-700'
                                : 'bg-gray-100 text-gray-700',
                        )}>
                          {todo.type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-maroon-900 truncate">{todo.title}</p>
                          <p className="text-[10px] text-maroon-500 capitalize">
                            {todo.status.replace(/_/g, ' ')}
                            {todo.dueDate ? ` · Due ${format(new Date(todo.dueDate), 'MMM d')}` : ''}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={todo.type === 'project' ? '/projects' : todo.type === 'onboarding' ? '/onboarding' : todo.type === 'kanban' ? '/tasks' : '/marketplace'}
                        className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}