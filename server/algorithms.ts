import { getDb, getUserById } from './db';
import type { ProjectRecord } from './project-management';

/** 0–100 employee performance score from attendance, tasks, reviews, goals. */
export function employeePerformanceScore(userId: string): number {
  const db = getDb();
  const logs = db.attendanceLogs.filter(l => l.userId === userId && l.clockOut);
  const completed = db.tasks.filter(t => t.status === 'completed' && (t.claimedById === userId || t.ownerId === userId));
  const reviews = db.performanceReviews.filter(r => r.userId === userId);
  const goals = db.performanceGoals.filter(g => g.userId === userId);
  const projectDone = (db.projectTasks || []).filter(
    (t: { assigneeId?: string | null; stage: string }) => t.assigneeId === userId && t.stage === 'done',
  ).length;

  const avgHours = logs.length
    ? logs.reduce((s, l) => s + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0) / logs.length
    : 0;
  const attendancePts = Math.min(30, Math.round(avgHours * 4));
  const taskPts = Math.min(25, completed.length * 3 + projectDone * 2);
  const reviewPts = reviews.length
    ? Math.min(25, Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 5))
    : 10;
  const goalPts = goals.length
    ? Math.min(20, Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length / 5))
    : 5;

  return Math.min(100, attendancePts + taskPts + reviewPts + goalPts);
}

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
  const logs = db.attendanceLogs.filter(l => l.userId === userId);
  const leaves = db.leaveRequests.filter(l => l.userId === userId);
  const timesheets = db.timesheets.filter(t => t.userId === userId);
  const payroll = db.payrollRecords.filter(p => p.userId === userId);

  return {
    employee: { id: user.id, name: user.name, email: user.email, department: user.department, title: user.title, role: user.role },
    performanceScore: employeePerformanceScore(userId),
    attendance: {
      totalDays: new Set(logs.map(l => l.date)).size,
      avgHours: logs.filter(l => l.clockOut).length
        ? Math.round(logs.filter(l => l.clockOut).reduce((s, l) =>
            s + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0) / logs.filter(l => l.clockOut).length * 10) / 10
        : 0,
      lateCount: logs.filter(l => {
        const ci = new Date(l.clockIn);
        return ci.getHours() > 9 || (ci.getHours() === 9 && ci.getMinutes() > 30);
      }).length,
    },
    leaves: { total: leaves.length, approved: leaves.filter(l => l.status === 'Approved').length, pending: leaves.filter(l => l.status === 'Pending').length },
    timesheets: { entries: timesheets.length, hours: timesheets.reduce((s, t) => s + t.hours, 0) },
    tasksCompleted: db.tasks.filter(t => t.status === 'completed' && t.claimedById === userId).length,
    reviews: db.performanceReviews.filter(r => r.userId === userId),
    goals: db.performanceGoals.filter(g => g.userId === userId),
    payrollTotal: payroll.reduce((s, p) => s + p.netPay, 0),
  };
}