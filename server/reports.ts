import { getDb, getUserById } from './db';
import { activeUsers } from './security';
import { employeePerformanceScore, projectHealthScore, employeeReport } from './algorithms';
import { normalizeProject } from './project-management';

export function buildReport(type: string, opts: { userId?: string; projectId?: string } = {}) {
  const db = getDb();
  const now = new Date();

  if (type === 'attendance') {
    const last30 = db.attendanceLogs.filter(l => new Date(l.date) >= new Date(now.getTime() - 30 * 86400000));
    const byDay: Record<string, number> = {};
    last30.forEach(l => { byDay[l.date] = (byDay[l.date] || 0) + 1; });
    return {
      logs: db.attendanceLogs.length,
      activeToday: db.users.filter(u => u.status === 'Active').length,
      chart: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      lateThisMonth: last30.filter(l => {
        const ci = new Date(l.clockIn);
        return ci.getHours() > 9 || (ci.getHours() === 9 && ci.getMinutes() > 30);
      }).length,
    };
  }

  if (type === 'leave') {
    return {
      requests: db.leaveRequests,
      approved: db.leaveRequests.filter(l => l.status === 'Approved').length,
      pending: db.leaveRequests.filter(l => l.status === 'Pending').length,
      rejected: db.leaveRequests.filter(l => l.status === 'Rejected').length,
      byType: ['Annual Leave', 'Sick Leave', 'Casual Leave'].map(t => ({
        type: t,
        count: db.leaveRequests.filter(l => l.type === t).length,
      })),
    };
  }

  if (type === 'performance') {
    const reviews = db.performanceReviews;
    const avgRating = reviews.length
      ? Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 10) / 10
      : 0;
    const rankings = activeUsers()
      .filter(u => u.role === 'employee')
      .map(u => ({ id: u.id, name: u.name, department: u.department, score: employeePerformanceScore(u.id) }))
      .sort((a, b) => b.score - a.score);
    return {
      goals: db.performanceGoals,
      reviews,
      avgRating,
      rankings,
      topPerformers: rankings.slice(0, 5),
    };
  }

  if (type === 'attrition') {
    return {
      headcount: activeUsers().length,
      onLeave: db.users.filter(u => u.status === 'On Leave').length,
      departures: db.users.filter(u => u.status === 'Inactive').length,
      newHires30d: db.users.filter(u => u.joinDate && new Date(u.joinDate) >= new Date(now.getTime() - 30 * 86400000)).length,
    };
  }

  if (type === 'employee' && opts.userId) {
    return employeeReport(opts.userId) || { error: 'Employee not found' };
  }

  if (type === 'projects') {
    const tasks = db.projectTasks || [];
    return {
      total: db.projects.length,
      active: db.projects.filter(p => p.status === 'active').length,
      completed: db.projects.filter(p => p.status === 'completed').length,
      projects: db.projects.map(p => {
        const norm = normalizeProject(p);
        const pTasks = tasks.filter((t: { projectId: string }) => t.projectId === p.id);
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
          health: projectHealthScore(norm, pTasks),
          openTasks: pTasks.filter((t: { stage: string }) => t.stage !== 'done').length,
          client: p.client,
        };
      }),
    };
  }

  if (type === 'project' && opts.projectId) {
    const p = db.projects.find(x => x.id === opts.projectId);
    if (!p) return { error: 'Project not found' };
    const norm = normalizeProject(p);
    const tasks = (db.projectTasks || []).filter((t: { projectId: string }) => t.projectId === opts.projectId);
    const timesheets = db.timesheets.filter(t => t.projectId === opts.projectId || t.projectName === p.name);
    return {
      project: { id: p.id, name: p.name, status: p.status, progress: p.progress, client: p.client },
      health: projectHealthScore(norm, tasks),
      tasks: { total: tasks.length, done: tasks.filter((t: { stage: string }) => t.stage === 'done').length, byStage: ['backlog', 'todo', 'in_progress', 'in_review', 'done'].map(s => ({ stage: s, count: tasks.filter((t: { stage: string }) => t.stage === s).length })) },
      timesheets: { hours: timesheets.reduce((s, t) => s + t.hours, 0), entries: timesheets.length },
      members: norm.memberIds.map(id => ({ id, name: getUserById(id)?.name || id })),
    };
  }

  if (type === 'finance') {
    const payroll = db.payrollRecords;
    const expenses = db.expenses;
    return {
      totalPayroll: payroll.reduce((s, p) => s + p.netPay, 0),
      approvedExpenses: expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0),
      pendingExpenses: expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0),
      byDepartment: [...new Set(db.users.map(u => u.department))].map(dept => ({
        department: dept,
        headcount: db.users.filter(u => u.department === dept && u.status === 'Active').length,
        payroll: payroll.filter(p => getUserById(p.userId)?.department === dept).reduce((s, p) => s + p.netPay, 0),
      })),
    };
  }

  return { message: 'Custom report generated', modules: Object.keys(db.rolePermissions) };
}