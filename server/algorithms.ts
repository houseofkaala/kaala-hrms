import { getDb, getUserById } from './db';
import type { ProjectRecord } from './project-management';
import { computeEmployeeMetrics, employeePerformanceScore } from './performance-tracking';

export { employeePerformanceScore };

/** 0–100 project health from progress, overdue tasks, timeline. */
export function projectHealthScore(project: ProjectRecord, tasks: { stage: string; dueDate: string | null }[]): number {
  const open = tasks.filter(t => t.stage !== 'done');
  const overdue = open.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;
  const progress = project.progress || 0;
  const timelinePenalty = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed' ? 15 : 0;
  const overduePenalty = Math.min(30, overdue * 8);
  return Math.max(0, Math.min(100, progress - overduePenalty - timelinePenalty + (project.status === 'completed' ? 10 : 0)));
}

export function generateMeetLink(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `https://meet.google.com/${part()}-${part()}-${part()}`;
}

export function employeeReport(userId: string) {
  const user = getUserById(userId);
  if (!user) return null;
  const db = getDb();
  const metrics = computeEmployeeMetrics(userId, '90d');
  const leaves = db.leaveRequests.filter(l => l.userId === userId);
  const timesheets = db.timesheets.filter(t => t.userId === userId);
  const payroll = db.payrollRecords.filter(p => p.userId === userId);

  return {
    employee: { id: user.id, name: user.name, email: user.email, department: user.department, title: user.title, role: user.role },
    performanceScore: metrics?.score ?? 0,
    grade: metrics?.grade ?? 'Developing',
    breakdown: metrics?.breakdown,
    counts: metrics?.counts,
    attendance: {
      totalDays: metrics?.counts.daysPresent ?? 0,
      avgHours: metrics?.counts.avgHours ?? 0,
      lateCount: metrics?.counts.lateArrivals ?? 0,
    },
    leaves: { total: leaves.length, approved: leaves.filter(l => l.status === 'Approved').length, pending: leaves.filter(l => l.status === 'Pending').length },
    timesheets: { entries: timesheets.length, hours: timesheets.reduce((s, t) => s + t.hours, 0) },
    tasksCompleted:
      (metrics?.counts.marketplaceCompleted ?? 0) +
      (metrics?.counts.kanbanCompleted ?? 0) +
      (metrics?.counts.projectCompleted ?? 0),
    reviews: db.performanceReviews.filter(r => r.userId === userId),
    goals: db.performanceGoals.filter(g => g.userId === userId),
    payrollTotal: payroll.reduce((s, p) => s + p.netPay, 0),
  };
}