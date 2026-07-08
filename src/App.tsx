/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, Link as LinkIcon, Edit2 } from 'lucide-react';
import { 
  Briefcase, LayoutDashboard, Store, Medal, LogOut, Bell, Settings, CheckCircle2, Clock,
  AlertCircle, ArrowRight, Users, Calendar, DollarSign, Monitor, FolderKanban, 
  CheckSquare, Activity, GraduationCap, MessageSquare, FileText, Map, PieChart, Gift, 
  Sparkles, ShieldAlert, XCircle, FolderOpen, Shield,
  ClipboardList, Network, Timer, Receipt, Target
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, fetcher } from './utils';
import { clearToken, isAuthenticated } from './auth';
import type { User, Task, Transaction } from './types';
import {
  DashboardView, RecruitView, PeopleView, AttendanceView, PayrollView,
  AssetsView, ProjectsView, TasksView, PerformanceView,
  LearningView, ChatView, SurveyView, FieldView,
  FinanceView, AIView, LeaderboardView,
  CommunityView, HelpDeskView, ReportsView, RewardsView,
  EmployeeManagementView, LeaveManagementView, DocumentsView,
  ProfileView, SettingsView, RolesView, NotificationsView,
  OnboardingView, ExpensesView, OrgChartView, HolidaysView,
  TimesheetsView, PoliciesView, CRMView,
} from './lazy-views';
import { NotificationsPanel } from './components/NotificationsPanel';
import { AttendanceHeaderButton } from './components/AttendanceHeaderButton';
import { DeferredChatWidget } from './components/DeferredChatWidget';
import { ViewFallback } from './components/ViewFallback';
import { AtelierPageHeader, RailNavItem, RailSection, getPageMeta } from './components/AtelierChrome';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { useRBACStore, useTimerStore } from './store';
import { getPortal, PORTAL_META } from './portal';
import { hasSalesToolkit } from './sales-access';
import { canAccessModule } from './rbac';
import { ModuleGuard } from './components/ModuleGuard';
import type { LucideIcon } from 'lucide-react';

function VisibleNavItem({
  route,
  icon,
  label,
  to,
  active,
  badge,
}: {
  route: string;
  icon: LucideIcon;
  label: string;
  to: string;
  active: boolean;
  badge?: number;
}) {
  const { currentUser } = useRBACStore();
  if (!canAccessModule(currentUser, route)) return null;
  return <RailNavItem icon={icon} label={label} to={to} active={active} badge={badge} />;
}

function GuardedView({ module, children }: { module: string; children: React.ReactNode }) {
  return <ModuleGuard module={module}>{children}</ModuleGuard>;
}

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

  const loadUser = useCallback(async () => {
    const user = await fetcher<User>('/api/me');
    setCurrentUser(user);
    return user;
  }, [setCurrentUser]);

  const loadTasks = useCallback(async () => {
    const allTasks = await fetcher<Task[]>('/api/tasks');
    setTasks(allTasks);
    return allTasks;
  }, []);

  const loadUsers = useCallback(async () => {
    const allUsersRes = await fetcher<User[]>('/api/users');
    setAllUsers(allUsersRes);
    return allUsersRes;
  }, []);

  const loadTransactions = useCallback(async (userId: string) => {
    const tx = await fetcher<Transaction[]>(`/api/transactions/${userId}`);
    setTransactions(tx);
    return tx;
  }, []);

  const loadData = useCallback(async (silent = false, scope: 'user' | 'all' = 'all') => {
    try {
      const user = await loadUser();
      if (scope === 'all') {
        await Promise.all([
          loadTasks(),
          loadUsers(),
          loadTransactions(user.id),
        ]);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadUser, loadTasks, loadUsers, loadTransactions]);

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
    loadData(false, 'user');

    const idle = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: 3000 });
      } else {
        setTimeout(cb, 1200);
      }
    };
    idle(() => {
      loadTasks().catch(() => {});
      loadUsers().catch(() => {});
    });

    const healthTimer = setTimeout(() => {
      fetcher<{ status: string; uptime: number }>('/api/health').then(setHealth).catch(() => setHealth(null));
    }, 5000);

    const refresh = () => {
      if (document.visibilityState === 'visible') loadData(true, 'user');
    };
    const interval = setInterval(refresh, 300_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData(true, 'user');
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(healthTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadData, loadTasks, loadUsers]);

  useEffect(() => {
    if (!currentUser || loading) return;
    if (activeTab === 'dashboard' && transactions.length === 0) {
      loadTransactions(currentUser.id).catch(() => {});
    }
    if (['marketplace', 'tasks'].includes(activeTab) && tasks.length === 0) {
      loadTasks().catch(() => {});
    }
    if (['leaderboard', 'chat', 'marketplace'].includes(activeTab) && allUsers.length === 0) {
      loadUsers().catch(() => {});
    }
  }, [activeTab, currentUser, loading, transactions.length, tasks.length, allUsers.length, loadTransactions, loadTasks, loadUsers]);

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
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-8">
        <div className="relative studio-reveal">
          <div
            className="w-24 h-24 rounded-2xl border border-gold/25 bg-charcoal flex items-center justify-center font-display text-4xl text-gold-light font-medium shadow-2xl"
            style={{ animation: 'float-slow 4s ease-in-out infinite' }}
          >
            K
          </div>
          <div className="absolute -inset-5 rounded-3xl border border-gold/15" style={{ animation: 'pulse-gold 3s ease-in-out infinite' }} />
        </div>
        <div className="text-center studio-reveal studio-reveal-d1">
          <p className="studio-kicker">House of Kaala</p>
          <p className="font-display text-xl text-ivory mt-2">Preparing your workspace</p>
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
  const isAdminPortal = portal === 'admin';
  const isEmployeePortal = portal === 'employee';
  const showSalesTools = isEmployeePortal && hasSalesToolkit(currentUser);
  const isManagerView = isAdminPortal;
  const showAdminSection = isAdminPortal;
  const showAdminCrons = isAdminPortal && currentUser.role === 'admin';

  return (
    <div className="flex h-screen kaala-mesh kaala-grain text-ivory overflow-hidden relative">
      <div className="kaala-ambient perf-optional" aria-hidden />
      <div className="studio-watermark" aria-hidden>K</div>

      {/* Sidebar navigation */}
      <aside className="studio-sidebar w-64 shrink-0 flex flex-col items-stretch py-5 px-2 gap-0.5 relative z-20 overflow-y-auto hide-scrollbar">
        <Link to="/dashboard" className="studio-brand mb-4 mx-1 px-3 py-3 flex items-center gap-3 transition-colors">
          <img src="/logo.svg" alt="" className="w-10 h-10 shrink-0 rounded-xl ring-1 ring-gold/25" />
          <span className="min-w-0">
            <span className="font-display text-sm font-medium text-ivory leading-tight block truncate">House of Kaala</span>
            <span className="text-[10px] uppercase tracking-wider text-gold-muted block truncate">{portalMeta.title}</span>
          </span>
        </Link>

        <VisibleNavItem route="dashboard" icon={LayoutDashboard} label="Dashboard" to="/dashboard" active={activeTab === 'dashboard'} />

        {showAdminSection && (
          <>
            <RailSection label="Admin & HR" />
            <VisibleNavItem route="recruit" icon={Users} label="Recruit" to="/recruit" active={activeTab === 'recruit'} />
            <VisibleNavItem route="employees" icon={Users} label="Employees" to="/employees" active={activeTab === 'employees'} />
            <VisibleNavItem route="onboarding" icon={ClipboardList} label="Onboarding" to="/onboarding" active={activeTab === 'onboarding'} />
            <VisibleNavItem route="orgchart" icon={Network} label="Org Chart" to="/orgchart" active={activeTab === 'orgchart'} />
            <VisibleNavItem route="payroll" icon={DollarSign} label="Payroll" to="/payroll" active={activeTab === 'payroll'} />
            <VisibleNavItem route="expenses" icon={Receipt} label="Expenses" to="/expenses" active={activeTab === 'expenses'} />
            <VisibleNavItem route="tasks" icon={CheckSquare} label="Tasks" to="/tasks" active={activeTab === 'tasks'} />
            <VisibleNavItem route="finance" icon={PieChart} label="Finance" to="/finance" active={activeTab === 'finance'} />
            <VisibleNavItem route="reports" icon={FileText} label="Reports" to="/reports" active={activeTab === 'reports'} />
            <RailSection label="Sales & CRM" />
            <VisibleNavItem route="crm" icon={Target} label="CRM & Leads" to="/crm" active={activeTab === 'crm'} />
            <VisibleNavItem route="field" icon={Map} label="Field Ops" to="/field" active={activeTab === 'field'} />
            <VisibleNavItem route="projects" icon={FolderKanban} label="Deals & Projects" to="/projects" active={activeTab === 'projects'} />
            {portal === 'admin' && currentUser.role === 'admin' && (
              <VisibleNavItem route="roles" icon={Shield} label="Roles & Permissions" to="/roles" active={activeTab === 'roles'} />
            )}
          </>
        )}

        {isEmployeePortal && (
          <>
            {showSalesTools && (
              <>
                <RailSection label={currentUser.role === 'executive_assistant' ? 'Executive Tools' : 'Sales Tools'} />
                <VisibleNavItem route="crm" icon={Target} label="CRM & Leads" to="/crm" active={activeTab === 'crm'} />
                <VisibleNavItem route="field" icon={Map} label="Field Visits" to="/field" active={activeTab === 'field'} />
                <VisibleNavItem route="expenses" icon={Receipt} label="Sales Expenses" to="/expenses" active={activeTab === 'expenses'} />
              </>
            )}
            <RailSection label="My Work" />
            <VisibleNavItem route="projects" icon={FolderKanban} label="Projects" to="/projects" active={activeTab === 'projects'} />
            <VisibleNavItem route="people" icon={Users} label="People Directory" to="/people" active={activeTab === 'people'} />
            <VisibleNavItem route="leave" icon={Calendar} label="Leave Management" to="/leave" active={activeTab === 'leave'} />
            <VisibleNavItem route="holidays" icon={Calendar} label="Holidays" to="/holidays" active={activeTab === 'holidays'} />
            <VisibleNavItem route="attendance" icon={Calendar} label="Attendance" to="/attendance" active={activeTab === 'attendance'} />
            <VisibleNavItem route="timesheets" icon={Timer} label="Timesheets" to="/timesheets" active={activeTab === 'timesheets'} />
            <VisibleNavItem route="documents" icon={FolderOpen} label="Documents" to="/documents" active={activeTab === 'documents'} />
            <VisibleNavItem route="assets" icon={Monitor} label="Assets" to="/assets" active={activeTab === 'assets'} />
            <VisibleNavItem route="performance" icon={Activity} label="Performance" to="/performance" active={activeTab === 'performance'} />
            <VisibleNavItem route="learning" icon={GraduationCap} label="Learning" to="/learning" active={activeTab === 'learning'} />
            <VisibleNavItem route="survey" icon={FileText} label="Surveys" to="/survey" active={activeTab === 'survey'} />

            <RailSection label="Culture" />
            <VisibleNavItem route="community" icon={Users} label="Community" to="/community" active={activeTab === 'community'} />
            <VisibleNavItem route="helpdesk" icon={MessageSquare} label="Help Desk" to="/helpdesk" active={activeTab === 'helpdesk'} />
            <VisibleNavItem route="marketplace" icon={Store} label="Marketplace" to="/marketplace" active={activeTab === 'marketplace'} badge={marketplaceTasks.length} />
            <VisibleNavItem route="rewards" icon={Gift} label="Rewards" to="/rewards" active={activeTab === 'rewards'} />
            <VisibleNavItem route="leaderboard" icon={Medal} label="Leaderboard" to="/leaderboard" active={activeTab === 'leaderboard'} />
            <VisibleNavItem route="chat" icon={MessageSquare} label="Chat" to="/chat" active={activeTab === 'chat'} />
            <VisibleNavItem route="ai" icon={Sparkles} label="HR Assistant" to="/ai" active={activeTab === 'ai'} />
            <VisibleNavItem route="policies" icon={FileText} label="Policies" to="/policies" active={activeTab === 'policies'} />
          </>
        )}

        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <VisibleNavItem route="notifications" icon={Bell} label="Notifications" to="/notifications" active={activeTab === 'notifications'} />
          <VisibleNavItem route="settings" icon={Settings} label="Settings" to="/settings" active={activeTab === 'settings'} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-ivory-muted hover:text-gold-light hover:bg-gold/5 transition-colors"
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
                <span className="hidden sm:inline studio-kicker text-gold-muted tabular-nums">{pageMeta.index}</span>
              )}
              <div className="min-w-0">
                <p className="hidden sm:block studio-kicker truncate">{portalMeta.title}</p>
                {activeTab !== 'dashboard' && (
                  <p className="hidden md:block font-display text-lg text-ivory truncate leading-tight">{pageMeta.title}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AttendanceHeaderButton onStatusChange={() => loadData(true, 'user')} />
              <div className="hidden md:flex studio-chip">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" style={{ animation: 'pulse-gold 2s ease-in-out infinite' }} />
                Live
              </div>
              <div className="studio-points flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 opacity-80" />
                <span className="tabular-nums">{currentUser.points}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60">KP</span>
              </div>
              <NotificationsPanel open={notifOpen} onToggle={() => setNotifOpen(!notifOpen)} onClose={() => setNotifOpen(false)} />
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-charcoal text-gold-light flex items-center justify-center text-xs font-medium uppercase ring-1 ring-gold/30 shadow-md group-hover:scale-105 transition-transform">
                  {currentUser.name.charAt(0)}
                </div>
              </Link>
            </div>
          </div>

          <main className="flex-1 overflow-auto premium-scrollbar px-6 lg:px-10 py-6 lg:py-8 relative z-[1]">
            <div className="max-w-7xl mx-auto pb-12 kaala-content">
              {activeTab !== 'dashboard' && !location.pathname.match(/^\/projects\/[^/]+/) && (
                <AtelierPageHeader activeTab={activeTab} />
              )}
              
              <Suspense fallback={<ViewFallback />}>
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
                <GuardedView module="marketplace">
                  <MarketplaceView tasks={marketplaceTasks} onClaim={claimTask} userId={currentUser.id} users={allUsers} />
                </GuardedView>
              )}
              
              {activeTab === 'leaderboard' && <GuardedView module="leaderboard"><LeaderboardView users={allUsers.length ? allUsers : [currentUser]} /></GuardedView>}
              {activeTab === 'recruit' && <GuardedView module="recruit"><RecruitView /></GuardedView>}
              {activeTab === 'employees' && <GuardedView module="employees"><EmployeeManagementView /></GuardedView>}
              {activeTab === 'people' && <GuardedView module="people"><PeopleView /></GuardedView>}
              {activeTab === 'leave' && <GuardedView module="leave"><LeaveManagementView /></GuardedView>}
              {activeTab === 'documents' && <GuardedView module="documents"><DocumentsView /></GuardedView>}
              {activeTab === 'attendance' && <GuardedView module="attendance"><AttendanceView /></GuardedView>}
              {activeTab === 'payroll' && <GuardedView module="payroll"><PayrollView /></GuardedView>}
              {activeTab === 'assets' && <GuardedView module="assets"><AssetsView /></GuardedView>}
              {(activeTab === 'projects' || location.pathname.startsWith('/projects/')) && <GuardedView module="projects"><ProjectsView /></GuardedView>}
              {activeTab === 'tasks' && <GuardedView module="tasks"><TasksView /></GuardedView>}
              {activeTab === 'performance' && <GuardedView module="performance"><PerformanceView /></GuardedView>}
              {activeTab === 'learning' && <GuardedView module="learning"><LearningView /></GuardedView>}
              {activeTab === 'chat' && <GuardedView module="chat"><ChatView users={allUsers.length ? allUsers : [currentUser]} currentUser={currentUser} /></GuardedView>}
              {activeTab === 'survey' && <GuardedView module="survey"><SurveyView /></GuardedView>}
              {activeTab === 'field' && <GuardedView module="field"><FieldView /></GuardedView>}
              {activeTab === 'crm' && <GuardedView module="crm"><CRMView /></GuardedView>}
              {activeTab === 'finance' && <GuardedView module="finance"><FinanceView /></GuardedView>}
              {activeTab === 'ai' && <GuardedView module="ai"><AIView /></GuardedView>}
              {activeTab === 'community' && <GuardedView module="community"><CommunityView /></GuardedView>}
              {activeTab === 'helpdesk' && <GuardedView module="helpdesk"><HelpDeskView /></GuardedView>}
              {activeTab === 'reports' && <GuardedView module="reports"><ReportsView /></GuardedView>}
              {activeTab === 'rewards' && <GuardedView module="rewards"><RewardsView /></GuardedView>}
              {activeTab === 'profile' && <GuardedView module="profile"><ProfileView /></GuardedView>}
              {activeTab === 'settings' && <GuardedView module="settings"><SettingsView /></GuardedView>}
              {activeTab === 'roles' && <GuardedView module="roles"><RolesView /></GuardedView>}
              {activeTab === 'notifications' && <GuardedView module="notifications"><NotificationsView /></GuardedView>}
              {activeTab === 'onboarding' && <GuardedView module="onboarding"><OnboardingView /></GuardedView>}
              {activeTab === 'expenses' && <GuardedView module="expenses"><ExpensesView /></GuardedView>}
              {activeTab === 'orgchart' && <GuardedView module="orgchart"><OrgChartView /></GuardedView>}
              {activeTab === 'holidays' && <GuardedView module="holidays"><HolidaysView /></GuardedView>}
              {activeTab === 'timesheets' && <GuardedView module="timesheets"><TimesheetsView /></GuardedView>}
              {activeTab === 'policies' && <GuardedView module="policies"><PoliciesView /></GuardedView>}
              {!['dashboard','marketplace','leaderboard','recruit','employees','onboarding','orgchart','people','leave','holidays','documents','attendance','timesheets','payroll','expenses','assets','projects','tasks','performance','learning','chat','survey','field','crm','finance','ai','community','helpdesk','reports','rewards','profile','settings','roles','notifications','policies'].includes(activeTab) && (
                <Navigate to="/dashboard" replace />
              )}
              </Suspense>

            </div>
          </main>

          <footer className="shrink-0 flex items-center justify-between px-6 lg:px-8 py-2.5 border-t border-gold/10 text-[9px] studio-kicker text-ivory-muted/60">
            <div className="flex items-center gap-4">
              <span>Connected</span>
              <span className="text-gold/25">·</span>
              <span>Active</span>
              {showAdminCrons && (
                <>
                  <span className="text-gold/25">·</span>
                  <button onClick={triggerFridayCron} className="hover:text-gold-light transition-colors">Fri cron</button>
                  <button onClick={triggerSundayCron} className="hover:text-gold-light transition-colors">Sun cron</button>
                </>
              )}
            </div>
            <span>{import.meta.env.MODE} · {health ? formatUptime(health.uptime) : '—'}</span>
          </footer>
        </div>
      </div>

      <DeferredChatWidget users={allUsers.length ? allUsers : [currentUser]} currentUser={currentUser} />
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


