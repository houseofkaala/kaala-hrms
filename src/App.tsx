/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, Link as LinkIcon, Edit2 } from 'lucide-react';
import { 
  Briefcase, LayoutDashboard, Store, Medal, LogOut, Bell, Settings, CheckCircle2, Clock,
  AlertCircle, ArrowRight, Users, Calendar, DollarSign, Monitor, FolderKanban, 
  CheckSquare, Activity, GraduationCap, MessageSquare, FileText, Map, PieChart, Gift, 
  Sparkles, ShieldAlert, XCircle, FolderOpen, Shield,
  ClipboardList, Network, Timer, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, fetcher } from './utils';
import { clearToken, isAuthenticated } from './auth';
import type { User, Task, Transaction } from './types';
import { 
  RecruitView, PeopleView, AttendanceView, PayrollView, 
  AssetsView, ProjectsView, TasksView, PerformanceView, 
  LearningView, ChatView, SurveyView, FieldView, 
  FinanceView, AIView, LeaderboardView 
} from './views';
import { CommunityView } from './views/CommunityView';
import { HelpDeskView } from './views/HelpDeskView';
import { ReportsView } from './views/ReportsView';
import { RewardsView } from './views/RewardsView';
import { EmployeeManagementView } from './views/EmployeeManagementView';
import { LeaveManagementView } from './views/LeaveManagementView';
import { DocumentsView } from './views/DocumentsView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { RolesView } from './views/RolesView';
import { NotificationsView } from './views/NotificationsView';
import { OnboardingView } from './views/OnboardingView';
import { ExpensesView } from './views/ExpensesView';
import { OrgChartView } from './views/OrgChartView';
import { HolidaysView } from './views/HolidaysView';
import { TimesheetsView } from './views/TimesheetsView';
import { PoliciesView } from './views/PoliciesView';
import { NotificationsPanel } from './components/NotificationsPanel';
import { AttendanceHeaderButton } from './components/AttendanceHeaderButton';
import { FloatingChatWidget } from './components/FloatingChatWidget';
import { AtelierPageHeader, RailNavItem, RailSection, getPageMeta } from './components/AtelierChrome';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { useRBACStore, useTimerStore } from './store';
import { getPortal, PORTAL_META } from './portal';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><HRMSApp /></ProtectedRoute>} />
    </Routes>
  );
}

function HRMSApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const [notifOpen, setNotifOpen] = useState(false);

  const { currentUser, setCurrentUser } = useRBACStore();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<{ status: string; uptime: number } | null>(null);

  const loadData = async (silent = false) => {
    try {
      const [user, allTasks, allUsersRes] = await Promise.all([
        fetcher<User>('/api/me'),
        fetcher<Task[]>('/api/tasks'),
        fetcher<User[]>('/api/users'),
      ]);
      const tx = await fetcher<Transaction[]>(`/api/transactions/${user.id}`);
      setCurrentUser(user);
      setTasks(allTasks);
      setTransactions(tx);
      setAllUsers(allUsersRes);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    loadData(false);
    fetcher<{ status: string; uptime: number }>('/api/health').then(setHealth).catch(() => setHealth(null));

    const refresh = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    const interval = setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const handleLogout = async () => {
    try {
      await fetcher('/api/auth/logout', { method: 'POST' });
    } catch {}
    clearToken();
    setCurrentUser(null);
    navigate('/login');
  };

  const triggerFridayCron = async () => {
    await fetcher('/api/admin/trigger-friday', { method: 'POST' });
    loadData();
  };

  const triggerSundayCron = async () => {
    await fetcher('/api/admin/trigger-sunday', { method: 'POST' });
    loadData();
  };

  const claimTask = async (taskId: string) => {
    if (!currentUser) return;
    try {
      await fetcher('/api/marketplace/claim', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      loadData();
    } catch {
      alert('Failed to claim task.');
    }
  };

  const completeTask = async (taskId: string) => {
    if (!currentUser) return;
    try {
      await fetcher('/api/tasks/complete', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      loadData();
    } catch {
      alert('Failed to complete task.');
    }
  };

  const reviewTask = async (taskId: string, action: 'approve' | 'reject') => {
    if (!currentUser) return;
    try {
      await fetcher(`/api/tasks/${action}`, {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      loadData();
    } catch {
      alert(`Failed to ${action} task.`);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen kaala-mesh kaala-grain studio-grid flex flex-col items-center justify-center gap-8">
        <div className="relative studio-reveal">
          <div
            className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-maroon-700 to-ink flex items-center justify-center font-display text-4xl text-white font-bold shadow-2xl shadow-maroon-950/40"
            style={{ animation: 'float-slow 4s ease-in-out infinite' }}
          >
            K
          </div>
          <div className="absolute -inset-5 rounded-[2.25rem] border border-maroon-300/25 animate-pulse" />
        </div>
        <div className="text-center studio-reveal studio-reveal-d1">
          <p className="studio-kicker text-maroon-500">House of Kaala</p>
          <p className="font-display text-xl text-maroon-900 mt-2">Preparing your studio</p>
        </div>
      </div>
    );
  }

  const pageMeta = getPageMeta(activeTab);

  const myTasks = tasks.filter(t => t.ownerId === currentUser.id || t.claimedById === currentUser.id);
  const marketplaceTasks = tasks.filter(t => t.status === 'marketplace');
  const reviewTasks = tasks.filter(t => t.status === 'under_review');
  const portal = getPortal();
  const portalMeta = PORTAL_META[portal];
  const isManagerView = portal !== 'employee';
  const showAdminSection = portal === 'admin';
  const showAdminCrons = portal === 'admin' && currentUser.role === 'admin';

  return (
    <div className="flex h-screen kaala-mesh kaala-grain studio-grid text-ink overflow-hidden relative">
      <div className="studio-watermark" aria-hidden>K</div>

      {/* Sidebar navigation */}
      <aside className="studio-sidebar w-64 shrink-0 flex flex-col items-stretch py-5 px-2 gap-0.5 relative z-20 overflow-y-auto hide-scrollbar">
        <Link to="/dashboard" className="studio-brand mb-4 mx-1 px-3 py-3 flex items-center gap-3 hover:bg-white/12 transition-colors">
          <img src="/logo.svg" alt="" className="w-10 h-10 shrink-0 rounded-xl" />
          <span className="min-w-0">
            <span className="font-display text-sm font-semibold text-white leading-tight block truncate">House of Kaala</span>
            <span className="text-[10px] uppercase tracking-wider text-white/45 block truncate">{portalMeta.title}</span>
          </span>
        </Link>

        <RailNavItem icon={LayoutDashboard} label="Dashboard" to="/dashboard" active={activeTab === 'dashboard'} />

        {showAdminSection && (
          <>
            <RailSection label={portal === 'admin' ? 'Admin & HR' : 'Team Management'} />
            <RailNavItem icon={Users} label="Recruit" to="/recruit" active={activeTab === 'recruit'} />
            <RailNavItem icon={Users} label="Employees" to="/employees" active={activeTab === 'employees'} />
            <RailNavItem icon={ClipboardList} label="Onboarding" to="/onboarding" active={activeTab === 'onboarding'} />
            <RailNavItem icon={Network} label="Org Chart" to="/orgchart" active={activeTab === 'orgchart'} />
            <RailNavItem icon={DollarSign} label="Payroll" to="/payroll" active={activeTab === 'payroll'} />
            <RailNavItem icon={Receipt} label="Expenses" to="/expenses" active={activeTab === 'expenses'} />
            <RailNavItem icon={FolderKanban} label="Projects" to="/projects" active={activeTab === 'projects'} />
            <RailNavItem icon={CheckSquare} label="Tasks" to="/tasks" active={activeTab === 'tasks'} />
            <RailNavItem icon={Map} label="Field Ops" to="/field" active={activeTab === 'field'} />
            <RailNavItem icon={PieChart} label="Finance" to="/finance" active={activeTab === 'finance'} />
            <RailNavItem icon={FileText} label="Reports" to="/reports" active={activeTab === 'reports'} />
            {portal === 'admin' && currentUser.role === 'admin' && (
              <RailNavItem icon={Shield} label="Roles & Permissions" to="/roles" active={activeTab === 'roles'} />
            )}
          </>
        )}

        <RailSection label="My Work" />
        <RailNavItem icon={Users} label="People Directory" to="/people" active={activeTab === 'people'} />
        <RailNavItem icon={Calendar} label="Leave Management" to="/leave" active={activeTab === 'leave'} />
        <RailNavItem icon={Calendar} label="Holidays" to="/holidays" active={activeTab === 'holidays'} />
        <RailNavItem icon={Calendar} label="Attendance" to="/attendance" active={activeTab === 'attendance'} />
        <RailNavItem icon={Timer} label="Timesheets" to="/timesheets" active={activeTab === 'timesheets'} />
        <RailNavItem icon={FolderOpen} label="Documents" to="/documents" active={activeTab === 'documents'} />
        <RailNavItem icon={Monitor} label="Assets" to="/assets" active={activeTab === 'assets'} />
        <RailNavItem icon={Activity} label="Performance" to="/performance" active={activeTab === 'performance'} />
        <RailNavItem icon={GraduationCap} label="Learning" to="/learning" active={activeTab === 'learning'} />
        <RailNavItem icon={FileText} label="Surveys" to="/survey" active={activeTab === 'survey'} />

        <RailSection label="Culture" />
        <RailNavItem icon={Users} label="Community" to="/community" active={activeTab === 'community'} />
        <RailNavItem icon={MessageSquare} label="Help Desk" to="/helpdesk" active={activeTab === 'helpdesk'} />
        <RailNavItem icon={Store} label="Marketplace" to="/marketplace" active={activeTab === 'marketplace'} badge={marketplaceTasks.length} />
        <RailNavItem icon={Gift} label="Rewards" to="/rewards" active={activeTab === 'rewards'} />
        <RailNavItem icon={Medal} label="Leaderboard" to="/leaderboard" active={activeTab === 'leaderboard'} />
        <RailNavItem icon={MessageSquare} label="Chat" to="/chat" active={activeTab === 'chat'} />
        <RailNavItem icon={Sparkles} label="HR Assistant" to="/ai" active={activeTab === 'ai'} />
        <RailNavItem icon={FileText} label="Policies" to="/policies" active={activeTab === 'policies'} />

        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <RailNavItem icon={Bell} label="Notifications" to="/notifications" active={activeTab === 'notifications'} />
          <RailNavItem icon={Settings} label="Settings" to="/settings" active={activeTab === 'settings'} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="shrink-0 flex items-center justify-center w-8 h-8">
              <LogOut className="w-[18px] h-[18px]" />
            </span>
            <span className="text-[13px] font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Floating workspace panel */}
      <div className="flex-1 flex flex-col min-w-0 p-3 pl-2 pb-3 relative z-10">
        <div className="studio-canvas flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="studio-header shrink-0 flex items-center justify-between gap-4 px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {pageMeta.index && (
                <span className="hidden sm:inline studio-kicker text-maroon-400 tabular-nums">{pageMeta.index}</span>
              )}
              <div className="min-w-0">
                <p className="hidden sm:block studio-kicker text-maroon-500 truncate">{portalMeta.title}</p>
                {activeTab !== 'dashboard' && (
                  <p className="hidden md:block font-display text-lg text-maroon-950 truncate leading-tight">{pageMeta.title}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AttendanceHeaderButton onStatusChange={loadData} />
              <div className="hidden md:flex studio-chip">
                <span className="w-1.5 h-1.5 rounded-full bg-maroon-500 animate-pulse" />
                Live
              </div>
              <div className="studio-points flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 opacity-80" />
                <span className="tabular-nums">{currentUser.points}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60">KP</span>
              </div>
              <NotificationsPanel open={notifOpen} onToggle={() => setNotifOpen(!notifOpen)} onClose={() => setNotifOpen(false)} />
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-maroon-600 to-maroon-950 text-white flex items-center justify-center text-xs font-bold uppercase ring-2 ring-white shadow-md group-hover:scale-105 transition-transform">
                  {currentUser.name.charAt(0)}
                </div>
              </Link>
            </div>
          </div>

          <main className="flex-1 overflow-auto px-6 lg:px-10 py-6 lg:py-8 relative">
            <div className="max-w-6xl mx-auto pb-10 kaala-content">
              {activeTab !== 'dashboard' && <AtelierPageHeader activeTab={activeTab} />}
              
              {/* VIEWS */}
              {activeTab === 'dashboard' && (
                <DashboardView 
                  tasks={myTasks} 
                  reviewTasks={reviewTasks}
                  transactions={transactions}
                  allUsers={allUsers}
                  onRefresh={loadData}
                  onComplete={completeTask} 
                  onReview={reviewTask}
                  isManager={isManagerView}
                />
              )}
              
              {activeTab === 'marketplace' && (
                <MarketplaceView 
                  tasks={marketplaceTasks} 
                  onClaim={claimTask} 
                  userId={currentUser.id} 
                  users={allUsers}
                />
              )}
              
              {activeTab === 'leaderboard' && <LeaderboardView users={allUsers.length ? allUsers : [currentUser]} />}
              {activeTab === 'recruit' && <RecruitView />}
              {activeTab === 'employees' && <EmployeeManagementView />}
              {activeTab === 'people' && <PeopleView />}
              {activeTab === 'leave' && <LeaveManagementView />}
              {activeTab === 'documents' && <DocumentsView />}
              {activeTab === 'attendance' && <AttendanceView />}
              {activeTab === 'payroll' && <PayrollView />}
              {activeTab === 'assets' && <AssetsView />}
              {activeTab === 'projects' && <ProjectsView />}
              {activeTab === 'tasks' && <TasksView />}
              {activeTab === 'performance' && <PerformanceView />}
              {activeTab === 'learning' && <LearningView />}
              {activeTab === 'chat' && <ChatView users={allUsers.length ? allUsers : [currentUser]} currentUser={currentUser} />}
              {activeTab === 'survey' && <SurveyView />}
              {activeTab === 'field' && <FieldView />}
              {activeTab === 'finance' && <FinanceView />}
              {activeTab === 'ai' && <AIView />}
              {activeTab === 'community' && <CommunityView />}
              {activeTab === 'helpdesk' && <HelpDeskView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'rewards' && <RewardsView />}
              {activeTab === 'profile' && <ProfileView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'roles' && <RolesView />}
              {activeTab === 'notifications' && <NotificationsView />}
              {activeTab === 'onboarding' && <OnboardingView />}
              {activeTab === 'expenses' && <ExpensesView />}
              {activeTab === 'orgchart' && <OrgChartView />}
              {activeTab === 'holidays' && <HolidaysView />}
              {activeTab === 'timesheets' && <TimesheetsView />}
              {activeTab === 'policies' && <PoliciesView />}
              {!['dashboard','marketplace','leaderboard','recruit','employees','onboarding','orgchart','people','leave','holidays','documents','attendance','timesheets','payroll','expenses','assets','projects','tasks','performance','learning','chat','survey','field','finance','ai','community','helpdesk','reports','rewards','profile','settings','roles','notifications','policies'].includes(activeTab) && (
                <Navigate to="/dashboard" replace />
              )}

            </div>
          </main>

          <footer className="shrink-0 flex items-center justify-between px-6 lg:px-8 py-2.5 border-t border-maroon-100/50 text-[9px] studio-kicker text-maroon-500/60">
            <div className="flex items-center gap-4">
              <span>Connected</span>
              <span className="text-maroon-300">·</span>
              <span>Active</span>
              {showAdminCrons && (
                <>
                  <span className="text-maroon-300">·</span>
                  <button onClick={triggerFridayCron} className="hover:text-maroon-800 transition-colors">Fri cron</button>
                  <button onClick={triggerSundayCron} className="hover:text-maroon-800 transition-colors">Sun cron</button>
                </>
              )}
            </div>
            <span>{import.meta.env.MODE} · {health ? formatUptime(health.uptime) : '—'}</span>
          </footer>
        </div>
      </div>

      <FloatingChatWidget users={allUsers.length ? allUsers : [currentUser]} currentUser={currentUser} />
    </div>
  );
}

// --- COMPONENTS ---


function TaskItem({ task, activeTimers, handleStartTimer, handleStopTimer, onComplete, onRefresh }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const isLate = new Date(task.deadline) < new Date() && task.status !== 'completed';

  const saveTitle = async () => {
    setIsEditing(false);
    if (title !== task.title) {
      try {
        await fetcher('/api/tasks/' + task.id, {
          method: 'PUT',
          body: JSON.stringify({ title }),
        });
        if (onRefresh) onRefresh();
      } catch (err) {}
    }
  };

  return (
    <div className={cn("studio-card p-5 flex items-center justify-between group transition-all", isLate ? "border-red-300 bg-red-50/10" : "")}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          task.status === 'claimed' ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500 border border-gray-100"
        )}>
          {task.status === 'claimed' ? <Medal className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input 
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                className="font-semibold text-gray-900 text-sm border-b border-gray-300 outline-none bg-transparent"
              />
            ) : (
              <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                {task.title}
                <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </h4>
            )}
            {isLate && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Late</span>}
            {task.category && <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{task.category}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due {format(new Date(task.deadline), 'MMM d, h:mm a')}</span>
            {task.status === 'claimed' && (
              <>
                <span className="text-gray-300">&bull;</span>
                <span className="text-gray-900 font-semibold">Bounty: +{task.value || 10} KP</span>
              </>
            )}
            {task.status === 'in_progress' && (
              <>
                <span className="text-gray-300">&bull;</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Timer Active
                </span>
              </>
            )}
            {task.timeSpent > 0 && (
              <>
                <span className="text-gray-300">&bull;</span>
                <span className="text-gray-600 font-medium flex items-center gap-1">
                  Spent: {Math.round(task.timeSpent / 60000)}m
                </span>
              </>
            )}
            {task.referenceLink && (
              <>
                <span className="text-gray-300">&bull;</span>
                <a href={task.referenceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" /> Reference
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {activeTimers[task.id] || task.status === 'in_progress' ? (
          <button 
            onClick={() => handleStopTimer(task.id)}
            className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" /> Stop Timer
          </button>
        ) : (
          <button 
            onClick={() => handleStartTimer(task.id)}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" /> Start Timer
          </button>
        )}
        <button 
          onClick={() => { if (activeTimers[task.id]) handleStopTimer(task.id); onComplete(task.id); }}
          className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          Submit <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function NewTaskModal({ isOpen, onClose, onRefresh }: any) {
  const [title, setTitle] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [category, setCategory] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const currentUser = useRBACStore.getState().currentUser;
    await fetcher('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, value: 10, referenceLink, category }),
    });
    if (onRefresh) onRefresh();
    setTitle('');
    setReferenceLink('');
    setCategory('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="studio-card w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-maroon-100 flex justify-between items-center bg-maroon-50/50">
          <h3 className="font-display text-lg font-semibold text-maroon-950">New Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title</label>
            <input required autoFocus value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="e.g. Update user documentation" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
              <option value="">Select a category</option>
              <option value="Development">Development</option>
              <option value="Design">Design</option>
              <option value="Admin">Admin</option>
              <option value="Support">Support</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reference Link (Optional)</label>
            <input type="url" value={referenceLink} onChange={e => setReferenceLink(e.target.value)} className="input-field" placeholder="https://..." />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" className="btn-primary">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardView({ tasks, reviewTasks, transactions, allUsers, onComplete, onReview, isManager, onRefresh }: any) {
  const userName = (id: string) => allUsers.find((u: User) => u.id === id)?.name || id;
  const { startTimer, stopTimer, activeTimers } = useTimerStore();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('dueDate');

  const handleStartTimer = async (taskId: string) => {
    startTimer(taskId);
    try {
      await fetcher('/api/tasks/timer', {
        method: 'POST',
        body: JSON.stringify({ taskId, action: 'start' }),
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopTimer = async (taskId: string) => {
    const durationMs = stopTimer(taskId);
    if (durationMs !== null) {
      try {
        await fetcher('/api/tasks/timer', {
          method: 'POST',
          body: JSON.stringify({ taskId, action: 'stop', durationMs }),
        });
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  let pending = tasks.filter((t: Task) => t.status === 'pending' || t.status === 'in_progress' || (t.status === 'claimed' && t.claimedById));
  pending.sort((a, b) => {
    if (sortOrder === 'dueDate') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (sortOrder === 'priority') return b.value - a.value;
    if (sortOrder === 'createdDate') {
      const aTime = parseInt(a.id.replace('t', '')) || 0;
      const bTime = parseInt(b.id.replace('t', '')) || 0;
      return bTime - aTime;
    }
    return 0;
  });
  const underReview = tasks.filter((t: Task) => t.status === 'under_review' && t.claimedById);
  
  const pendingCount = pending.length + underReview.length;

  const currentUser = useRBACStore.getState().currentUser;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      <AtelierPageHeader activeTab="dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 studio-reveal studio-reveal-d1">
        <div className="lg:col-span-2 studio-hero p-7 sm:p-8 relative z-[1]">
          <p className="studio-kicker text-white/50">{greeting()}</p>
          <p className="font-display text-3xl sm:text-4xl font-semibold mt-2 text-white">{currentUser?.name?.split(' ')[0] || 'there'}</p>
          <p className="text-sm text-white/55 mt-3 max-w-md leading-relaxed">
            Your studio overview — tasks, points, and team activity at a glance.
          </p>
        </div>
        <div className="studio-stat">
          <p className="studio-stat-label">My Tasks</p>
          <p className="studio-stat-value">{pendingCount}</p>
          <p className="text-xs text-maroon-600/70 mt-1">Pending and in progress</p>
        </div>
        <div className="studio-stat">
          <p className="studio-stat-label">Kaala Points</p>
          <p className="studio-stat-value">{currentUser?.points ?? 0}</p>
          <p className="text-xs text-maroon-600/70 mt-1">Reward balance</p>
        </div>
        {isManager && (
          <div className="studio-stat">
            <p className="studio-stat-label">Pending Approvals</p>
            <p className="studio-stat-value">{reviewTasks.length}</p>
            <p className="text-xs text-maroon-600/70 mt-1">Awaiting your review</p>
          </div>
        )}
        <div className={`studio-card p-5 flex items-center justify-between gap-4 ${isManager ? '' : 'lg:col-span-1'}`}>
          <div>
            <p className="font-display text-base font-semibold text-maroon-950">Quick action</p>
            <p className="text-xs text-maroon-600/70 mt-1">Create a task for yourself or your team</p>
          </div>
          <button onClick={() => setIsNewTaskModalOpen(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 studio-reveal studio-reveal-d2">
      
      {/* Main Content Area */}
      <div className="xl:col-span-2 flex flex-col gap-8">
        
        {/* Manager Review Queue */}
        {isManager && reviewTasks.length > 0 && (
          <div className="studio-card flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-maroon-100 flex justify-between items-center bg-maroon-50/50">
              <h3 className="font-display text-base font-semibold text-maroon-950 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-maroon-500" /> Pending Approvals
              </h3>
              <span className="studio-chip studio-chip-live">{reviewTasks.length} Pending</span>
            </div>
            <div className="p-6 space-y-4 bg-maroon-50/30">
              {reviewTasks.map((task: Task) => (
                <div key={task.id} className="studio-card p-5 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                        <span>Submitted by <strong className="text-gray-900">{userName(task.claimedById!)}</strong></span>
                        <span className="text-gray-400">&bull;</span>
                        <span className="text-gray-700">Reward: +10 KP</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onReview(task.id, 'reject')}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button 
                      onClick={() => onReview(task.id, 'approve')}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Tasks */}
        <div className="studio-card flex flex-col overflow-hidden flex-1">
          <div className="px-6 py-4 border-b border-maroon-100 flex justify-between items-center bg-maroon-50/50">
            <div className="flex items-center gap-4">
              <h3 className="font-display text-base font-semibold text-maroon-950">My Active Tasks</h3>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="input-field text-xs py-1.5 px-2 w-auto">
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="createdDate">Sort by Created Date</option>
              </select>
            </div>
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Plus className="w-3 h-3" /> New Task
            </button>
          </div>
          <div className="p-6">
            {pending.length === 0 && underReview.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                <CheckCircle2 className="w-10 h-10 mb-4 text-gray-300" />
                <p className="text-sm font-medium">You have no pending tasks. Well done!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {underReview.map((task: Task) => (
                  <div key={task.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm line-through decoration-gray-400">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                          <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Pending Manager Review</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {pending.map((task: Task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    activeTimers={activeTimers} 
                    handleStartTimer={handleStartTimer} 
                    handleStopTimer={handleStopTimer} 
                    onComplete={onComplete} 
                    onRefresh={onRefresh} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewTaskModal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} onRefresh={onRefresh} />
      {/* Transaction Ledger */}
      <div className="flex flex-col gap-6">
        <div className="studio-card flex flex-col overflow-hidden flex-1 max-h-[700px]">
          <div className="px-6 py-4 border-b border-maroon-100 bg-maroon-50/50">
            <h3 className="font-display text-base font-semibold text-maroon-950">Recent Activity</h3>
          </div>
          <div className="p-6 font-mono text-xs space-y-4 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-gray-400 font-sans text-sm">No recent activity to show.</p>
            ) : (
              transactions.map((tx: Transaction) => (
                <div key={tx.id} className="flex flex-col pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className={cn(
                    "mb-1 font-medium",
                    tx.amount > 0 ? "text-gray-900" : "text-gray-500"
                  )}>
                    <span className="text-gray-400 font-normal mr-2">[{format(new Date(tx.timestamp), 'HH:mm')}]</span> 
                    {tx.amount > 0 ? 'CREDIT:' : 'DEBIT:'} {tx.amount > 0 ? '+' : ''}{tx.amount} pts 
                  </p>
                  <p className="text-gray-500 pl-14 leading-relaxed">{tx.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}

function MarketplaceView({ tasks, onClaim, userId, users }: { tasks: Task[], onClaim: (id: string) => void, userId: string, users: User[] }) {
  return (
    <div className="space-y-6">
      <div className="studio-card px-8 py-6 flex flex-col">
        <h2 className="font-display text-2xl font-semibold text-maroon-950">Reward Marketplace</h2>
        <p className="text-sm text-gray-500 mt-2">Claim abandoned tasks to earn Kaala Points. Strict Deadline is Sunday 11:59 PM. Incomplete claimed tasks incur a 50 pt penalty.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-16 studio-card flex flex-col items-center justify-center text-maroon-400">
          <Store className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-base font-medium text-gray-600">The marketplace is currently empty.</p>
          <p className="text-sm mt-2">New tasks will appear here if SLA is breached (Friday 6:30 PM).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="studio-card p-6 flex flex-col transition-all relative">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-gray-100 text-gray-900 text-xs font-semibold rounded-full">
                  +{task.value} KP
                </span>
                <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1 bg-red-50 px-2 py-1 rounded uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3" /> SLA Breached
                </span>
              </div>
              
              <h3 className="text-base font-semibold text-gray-900 mb-2">{task.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                {task.category && <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{task.category}</span>}
                {task.referenceLink && (
                  <a href={task.referenceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                    <LinkIcon className="w-3 h-3" /> Ref
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mb-6">Originally assigned to: <span className="text-gray-700">{users?.find(u => u.id === task.ownerId)?.name || task.ownerId}</span></p>
              
              <div className="mt-auto pt-6 border-t border-gray-100">
                <button 
                  onClick={() => onClaim(task.id)}
                  disabled={task.ownerId === userId}
                  className="btn-primary w-full py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {task.ownerId === userId ? 'Cannot claim own task' : 'Claim Bounty & Accept Risk'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">-50 KP Penalty if not approved by Sunday</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


