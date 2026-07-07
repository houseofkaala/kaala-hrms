import { getDb, getUserById, sanitizeUser } from './db';
import { isManagerOrAdmin } from './security';
import type { ProjectRecord } from './project-management';

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

function periodRange(period: DashboardPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'daily') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === 'weekly') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const d = new Date(iso);
  return d >= start && d <= end;
}

function avgMinutes(times: string[]): string {
  if (!times.length) return '--:--';
  const total = times.reduce((sum, iso) => {
    const d = new Date(iso);
    return sum + d.getHours() * 60 + d.getMinutes();
  }, 0);
  const avg = Math.round(total / times.length);
  const h = Math.floor(avg / 60) % 24;
  const m = avg % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function teamScope(userId: string) {
  const db = getDb();
  const me = getUserById(userId);
  if (!me) return { me, teamIds: [] as string[], team: [] as ReturnType<typeof sanitizeUser>[] };

  let team = db.users.filter(u => u.status === 'Active' || u.status === 'On Leave');

  if (isManagerOrAdmin(me)) {
    const reports = team.filter(u => u.managerId === userId);
    const deptPeers = team.filter(u => u.department === me.department && u.id !== userId);
    const ids = new Set([...reports, ...deptPeers].map(u => u.id));
    team = team.filter(u => ids.has(u.id));
  } else {
    team = team.filter(u => u.department === me.department);
  }

  if (!team.some(u => u.id === userId)) {
    team = [me, ...team.filter(u => u.id !== userId)];
  }

  return {
    me,
    teamIds: team.map(u => u.id),
    team: team.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      title: u.title,
      status: u.status,
      joinDate: u.joinDate,
      phone: u.phone,
      hasProfileImage: Boolean(u.profileImageKey),
    })),
  };
}

export function buildDashboard(userId: string, period: DashboardPeriod = 'monthly') {
  const db = getDb();
  const { me, teamIds, team } = teamScope(userId);
  const { start, end } = periodRange(period);
  const now = new Date();

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const onLeave = team.filter(u => u.status === 'On Leave').length;
  const newJoinees = team.filter(u => {
    if (!u.joinDate) return false;
    return new Date(u.joinDate) >= thirtyDaysAgo;
  }).length;

  const upcomingHoliday = [...db.holidays]
    .filter(h => new Date(h.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

  const teamTimesheets = db.timesheets
    .filter(t => teamIds.includes(t.userId) && inRange(t.date, start, end))
    .map(t => ({
      ...t,
      employee: getUserById(t.userId)?.name || 'Unknown',
    }));

  const latestMembers = [...team]
    .sort((a, b) => new Date(b.joinDate || 0).getTime() - new Date(a.joinDate || 0).getTime())
    .slice(0, 6)
    .map(m => ({ ...m, hasProfileImage: Boolean(getUserById(m.id)?.profileImageKey) }));

  const teamLogs = db.attendanceLogs.filter(l =>
    teamIds.includes(l.userId) && inRange(l.clockIn, start, end),
  );

  const clockIns = teamLogs.map(l => l.clockIn);
  const clockOuts = teamLogs.filter(l => l.clockOut).map(l => l.clockOut!);

  const workingHours = teamLogs
    .filter(l => l.clockOut)
    .map(l => (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000);

  const avgWorkingHours = workingHours.length
    ? Math.round((workingHours.reduce((s, h) => s + h, 0) / workingHours.length) * 10) / 10
    : 0;

  const presentToday = new Set(
    db.attendanceLogs
      .filter(l => l.date === now.toISOString().split('T')[0] && teamIds.includes(l.userId))
      .map(l => l.userId),
  ).size;

  const memberLeaves = db.leaveRequests
    .filter(l => teamIds.includes(l.userId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map(l => ({
      ...l,
      employee: getUserById(l.userId)?.name || 'Unknown',
    }));

  const myLeaves = db.leaveRequests.filter(l => l.userId === userId);
  const approvedLeave = myLeaves.filter(l => l.status === 'Approved');
  const annualUsed = approvedLeave.filter(l => l.type !== 'Sick Leave').reduce((s, l) => s + l.days, 0);
  const sickUsed = approvedLeave.filter(l => l.type === 'Sick Leave').reduce((s, l) => s + l.days, 0);

  const payStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const payEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInPeriod = payEnd.getDate();
  const dayOfMonth = now.getDate();
  const payrollRecord = db.payrollRecords.find(
    p => p.userId === userId && p.period.includes(now.toLocaleString('en-US', { month: 'long' })),
  );

  const userProjects = db.projects.filter(p =>
    p.leadId === userId || p.memberIds.includes(userId),
  );

  const periodProjects = userProjects.filter(p => {
    const created = new Date(p.createdAt);
    const updated = new Date(p.updatedAt);
    return created >= start && created <= end || updated >= start && updated <= end;
  });

  const taken = periodProjects.length || userProjects.filter(p => p.status !== 'archived').length;
  const completed = userProjects.filter(p => p.status === 'completed').length;
  const inProgress = userProjects.filter(p => p.status === 'active' || p.status === 'planning').length;

  const projectTasks = (db.projectTasks || []).filter(
    (t: { projectId: string; assigneeId?: string | null }) => {
      const project = userProjects.find(p => p.id === t.projectId);
      return project && (t.assigneeId === userId || project.leadId === userId);
    },
  );

  const doneTasks = projectTasks.filter((t: { stage: string }) => t.stage === 'done').length;
  const totalTasks = projectTasks.length;
  const efficiency = totalTasks > 0
    ? Math.round((doneTasks / totalTasks) * 100)
    : completed > 0 && taken > 0
      ? Math.round((completed / taken) * 100)
      : 0;

  const todos = [
    ...db.tasks
      .filter(t =>
        (t.ownerId === userId || t.claimedById === userId) &&
        !['completed', 'failed'].includes(t.status),
      )
      .map(t => ({
        id: t.id,
        title: t.title,
        type: 'marketplace' as const,
        status: t.status,
        dueDate: t.deadline,
        priority: t.priority || 'Normal',
      })),
    ...db.kanbanTasks
      .filter(t => t.assigneeId === userId && t.stage !== 'done')
      .map(t => ({
        id: t.id,
        title: t.title,
        type: 'kanban' as const,
        status: t.stage,
        dueDate: null,
        priority: t.priority || 'Normal',
      })),
    ...projectTasks
      .filter((t: { stage: string }) => t.stage !== 'done')
      .map((t: { id: string; title: string; stage: string; dueDate: string | null; priority: string }) => ({
        id: t.id,
        title: t.title,
        type: 'project' as const,
        status: t.stage,
        dueDate: t.dueDate,
        priority: t.priority,
      })),
    ...db.onboardingTasks
      .filter(t => t.userId === userId && t.status !== 'Completed')
      .map(t => ({
        id: t.id,
        title: t.title,
        type: 'onboarding' as const,
        status: t.status,
        dueDate: t.dueDate,
        priority: 'Normal',
      })),
  ];

  const attendanceByDay = Array.from({ length: period === 'daily' ? 1 : period === 'weekly' ? 7 : 30 }, (_, i) => {
    const d = new Date(start);
    if (period === 'weekly') d.setDate(start.getDate() + i);
    else if (period === 'monthly') d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const logs = teamLogs.filter(l => l.date === dateStr || l.clockIn.startsWith(dateStr));
    const hours = logs
      .filter(l => l.clockOut)
      .reduce((s, l) => s + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0);
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      present: new Set(logs.map(l => l.userId)).size,
      hours: Math.round(hours * 10) / 10,
    };
  }).filter(d => period !== 'monthly' || new Date(d.date) <= end);

  return {
    period,
    stats: {
      totalEmployees: team.length,
      onLeave,
      newJoinees,
      upcomingHoliday: upcomingHoliday
        ? { name: upcomingHoliday.name, date: upcomingHoliday.date, type: upcomingHoliday.type }
        : null,
    },
    timesheets: {
      total: teamTimesheets.length,
      pending: teamTimesheets.filter(t => t.status === 'Pending').length,
      approved: teamTimesheets.filter(t => t.status === 'Approved').length,
      totalHours: Math.round(teamTimesheets.reduce((s, t) => s + t.hours, 0) * 10) / 10,
      recent: teamTimesheets.slice(0, 5),
      mine: db.timesheets.filter(t => t.userId === userId).slice(0, 5),
    },
    latestMembers,
    attendance: {
      presentToday,
      teamSize: team.length,
      avgClockIn: avgMinutes(clockIns),
      avgClockOut: avgMinutes(clockOuts),
      avgWorkingHours,
      chart: attendanceByDay,
    },
    memberLeaves,
    leaves: {
      pending: myLeaves.filter(l => l.status === 'Pending').length,
      approved: myLeaves.filter(l => l.status === 'Approved').length,
      rejected: myLeaves.filter(l => l.status === 'Rejected').length,
      annualRemaining: Math.max(0, db.orgSettings.defaultLeaveDays - annualUsed),
      sickRemaining: Math.max(0, db.orgSettings.sickLeaveDays - sickUsed),
      recent: myLeaves.slice(0, 5),
    },
    payPeriod: {
      start: payStart.toISOString().split('T')[0],
      end: payEnd.toISOString().split('T')[0],
      dayOfMonth,
      daysInPeriod,
      daysRemaining: daysInPeriod - dayOfMonth,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0],
      netPay: payrollRecord?.netPay ?? null,
      status: payrollRecord?.status ?? 'Pending',
    },
    projects: {
      taken,
      completed,
      inProgress,
      efficiency,
      items: userProjects.slice(0, 5).map((p: ProjectRecord) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
      })),
    },
    team,
    todos,
    greeting: me?.name?.split(' ')[0] || 'there',
  };
}