import { getDb, getUserById } from './db';
import { activeUsers } from './security';
import { getTaskDeadline, isKanbanTaskOverdue, type KanbanTaskRecord } from './kanban';

export type PerformancePeriod = '30d' | '90d' | 'quarter' | 'ytd' | 'all';

export interface PerformanceBreakdown {
  attendance: number;
  taskDelivery: number;
  onTimeDelivery: number;
  goals: number;
  reviews: number;
  overduePenalty: number;
}

export interface PerformanceCounts {
  marketplaceCompleted: number;
  kanbanCompleted: number;
  kanbanOverdue: number;
  kanbanOnTime: number;
  kanbanOpen: number;
  projectCompleted: number;
  projectOverdue: number;
  daysPresent: number;
  avgHours: number;
  lateArrivals: number;
  goalsTotal: number;
  goalsAvgProgress: number;
  reviewsCount: number;
  avgReviewRating: number;
  onTimeRate: number;
}

export interface EmployeePerformanceMetrics {
  userId: string;
  name: string;
  department: string;
  title: string;
  role: string;
  period: PerformancePeriod;
  periodStart: string | null;
  periodEnd: string;
  score: number;
  grade: 'Exceptional' | 'Strong' | 'Developing' | 'Needs Attention';
  breakdown: PerformanceBreakdown;
  counts: PerformanceCounts;
}

export interface PerformanceSnapshotRecord {
  id: string;
  userId: string;
  period: string;
  score: number;
  breakdown: PerformanceBreakdown;
  recordedAt: string;
}

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'Exceptional' as const },
  { min: 75, grade: 'Strong' as const },
  { min: 50, grade: 'Developing' as const },
  { min: 0, grade: 'Needs Attention' as const },
];

function gradeFromScore(score: number): EmployeePerformanceMetrics['grade'] {
  return GRADE_THRESHOLDS.find(g => score >= g.min)?.grade ?? 'Needs Attention';
}

export function periodStart(period: PerformancePeriod, ref = new Date()): Date | null {
  if (period === 'all') return null;
  const d = new Date(ref);
  if (period === '30d') {
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (period === '90d') {
    d.setDate(d.getDate() - 90);
    return d;
  }
  if (period === 'quarter') {
    const qStart = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), qStart, 1);
  }
  if (period === 'ytd') {
    return new Date(d.getFullYear(), 0, 1);
  }
  return null;
}

function inPeriod(iso: string | undefined | null, start: Date | null): boolean {
  if (!iso) return start === null;
  if (!start) return true;
  return new Date(iso).getTime() >= start.getTime();
}

function isLateClockIn(clockIn: string): boolean {
  const ci = new Date(clockIn);
  return ci.getHours() > 9 || (ci.getHours() === 9 && ci.getMinutes() > 30);
}

function kanbanOnTime(task: KanbanTaskRecord): boolean {
  if (task.stage !== 'done') return false;
  const deadline = getTaskDeadline(task);
  if (!deadline) return false;
  const doneAt = task.updatedAt || task.createdAt;
  return new Date(doneAt).getTime() <= deadline.getTime();
}

function kanbanOverdue(task: KanbanTaskRecord): boolean {
  return isKanbanTaskOverdue(task);
}

export function computePerformanceBreakdown(counts: PerformanceCounts): PerformanceBreakdown {
  const attendancePts = Math.min(
    25,
    Math.round(counts.avgHours * 3) + Math.max(0, 10 - counts.lateArrivals),
  );
  const taskTotal = counts.marketplaceCompleted + counts.kanbanCompleted + counts.projectCompleted;
  const taskDelivery = Math.min(25, taskTotal * 2);
  const onTimeDelivery = Math.min(15, Math.round(counts.onTimeRate * 15));
  const goals = counts.goalsTotal
    ? Math.min(15, Math.round(counts.goalsAvgProgress / 100 * 15))
    : 5;
  const reviews = counts.reviewsCount
    ? Math.min(20, Math.round(counts.avgReviewRating * 4))
    : 8;
  const overduePenalty = Math.min(
    10,
    (counts.kanbanOverdue + counts.projectOverdue) * 2,
  );

  return { attendance: attendancePts, taskDelivery, onTimeDelivery, goals, reviews, overduePenalty };
}

export function scoreFromBreakdown(breakdown: PerformanceBreakdown): number {
  const raw =
    breakdown.attendance +
    breakdown.taskDelivery +
    breakdown.onTimeDelivery +
    breakdown.goals +
    breakdown.reviews -
    breakdown.overduePenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function computeEmployeeCounts(userId: string, period: PerformancePeriod = 'all'): PerformanceCounts {
  const db = getDb();
  const start = periodStart(period);
  const logs = db.attendanceLogs.filter(l => l.userId === userId && inPeriod(l.date, start));
  const closedLogs = logs.filter(l => l.clockOut);
  const avgHours = closedLogs.length
    ? closedLogs.reduce((s, l) =>
        s + (new Date(l.clockOut!).getTime() - new Date(l.clockIn).getTime()) / 3600000, 0) / closedLogs.length
    : 0;

  const marketplaceCompleted = db.tasks.filter(
    t => t.status === 'completed' &&
      (t.claimedById === userId || t.ownerId === userId) &&
      inPeriod(t.deadline, start),
  ).length;

  const kanbanTasks = (db.kanbanTasks || []).filter(
    t => (t.assigneeId === userId || t.createdBy === userId) && inPeriod(t.createdAt, start),
  );
  const kanbanCompleted = kanbanTasks.filter(t => t.stage === 'done').length;
  const kanbanOverdue = kanbanTasks.filter(kanbanOverdue).length;
  const kanbanOnTime = kanbanTasks.filter(kanbanOnTime).length;
  const kanbanOpen = kanbanTasks.filter(t => t.stage !== 'done').length;

  const projectTasks = (db.projectTasks || []).filter(
    (t: { assigneeId?: string | null; createdAt?: string }) =>
      t.assigneeId === userId && inPeriod(t.createdAt, start),
  );
  const projectCompleted = projectTasks.filter((t: { stage: string }) => t.stage === 'done').length;
  const projectOverdue = projectTasks.filter(
    (t: { stage: string; dueDate: string | null }) =>
      t.stage !== 'done' && t.dueDate && new Date(t.dueDate).getTime() < Date.now(),
  ).length;

  const goals = db.performanceGoals.filter(g => g.userId === userId);
  const goalsAvgProgress = goals.length
    ? goals.reduce((s, g) => s + Math.min(100, Math.round((g.progress / Math.max(g.target, 1)) * 100)), 0) / goals.length
    : 0;

  const reviews = db.performanceReviews.filter(r => r.userId === userId && r.status === 'Completed');
  const avgReviewRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  const datedTasks = kanbanTasks.filter(t => getTaskDeadline(t) && t.stage === 'done');
  const onTimeRate = datedTasks.length ? kanbanOnTime / datedTasks.length : (kanbanCompleted > 0 ? 0.7 : 0);

  return {
    marketplaceCompleted,
    kanbanCompleted,
    kanbanOverdue,
    kanbanOnTime,
    kanbanOpen,
    projectCompleted,
    projectOverdue,
    daysPresent: new Set(logs.map(l => l.date)).size,
    avgHours: Math.round(avgHours * 10) / 10,
    lateArrivals: logs.filter(l => isLateClockIn(l.clockIn)).length,
    goalsTotal: goals.length,
    goalsAvgProgress: Math.round(goalsAvgProgress),
    reviewsCount: reviews.length,
    avgReviewRating: Math.round(avgReviewRating * 10) / 10,
    onTimeRate: Math.round(onTimeRate * 100) / 100,
  };
}

export function computeEmployeeMetrics(
  userId: string,
  period: PerformancePeriod = 'all',
): EmployeePerformanceMetrics | null {
  const user = getUserById(userId);
  if (!user) return null;

  const counts = computeEmployeeCounts(userId, period);
  const breakdown = computePerformanceBreakdown(counts);
  const score = scoreFromBreakdown(breakdown);
  const start = periodStart(period);

  return {
    userId: user.id,
    name: user.name,
    department: user.department,
    title: user.title || '',
    role: user.role,
    period,
    periodStart: start?.toISOString() ?? null,
    periodEnd: new Date().toISOString(),
    score,
    grade: gradeFromScore(score),
    breakdown,
    counts,
  };
}

export function buildTeamRankings(
  period: PerformancePeriod = 'all',
  department?: string,
) {
  return activeUsers()
    .filter(u => u.status === 'Active' && u.role !== 'admin')
    .filter(u => !department || u.department === department)
    .map(u => {
      const m = computeEmployeeMetrics(u.id, period)!;
      return {
        id: u.id,
        name: u.name,
        department: u.department,
        title: u.title,
        role: u.role,
        score: m.score,
        grade: m.grade,
        breakdown: m.breakdown,
        counts: m.counts,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildPerformanceReport(opts: {
  period?: PerformancePeriod;
  department?: string;
  userId?: string;
} = {}) {
  const period = opts.period || '90d';
  const rankings = buildTeamRankings(period, opts.department);
  const db = getDb();

  const reviews = db.performanceReviews.filter(r => r.status === 'Completed');
  const avgRating = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 10) / 10
    : 0;

  const departmentStats = [...new Set(activeUsers().map(u => u.department))].map(dept => {
    const team = rankings.filter(r => r.department === dept);
    const avgScore = team.length
      ? Math.round(team.reduce((s, t) => s + t.score, 0) / team.length)
      : 0;
    return { department: dept, headcount: team.length, avgScore, topScore: team[0]?.score ?? 0 };
  }).sort((a, b) => b.avgScore - a.avgScore);

  const scoreDistribution = [
    { band: '90-100', count: rankings.filter(r => r.score >= 90).length },
    { band: '75-89', count: rankings.filter(r => r.score >= 75 && r.score < 90).length },
    { band: '50-74', count: rankings.filter(r => r.score >= 50 && r.score < 75).length },
    { band: '0-49', count: rankings.filter(r => r.score < 50).length },
  ];

  const individual = opts.userId ? computeEmployeeMetrics(opts.userId, period) : null;
  const snapshots = (db.performanceSnapshots || []).filter(
    s => !opts.userId || s.userId === opts.userId,
  );

  const trend = snapshots
    .filter(s => !opts.userId || s.userId === opts.userId)
    .slice(-12)
    .map(s => ({
      period: s.period,
      score: s.score,
      recordedAt: s.recordedAt,
    }));

  const taskSummary = rankings.reduce(
    (acc, r) => ({
      kanbanCompleted: acc.kanbanCompleted + r.counts.kanbanCompleted,
      marketplaceCompleted: acc.marketplaceCompleted + r.counts.marketplaceCompleted,
      projectCompleted: acc.projectCompleted + r.counts.projectCompleted,
      overdue: acc.overdue + r.counts.kanbanOverdue + r.counts.projectOverdue,
    }),
    { kanbanCompleted: 0, marketplaceCompleted: 0, projectCompleted: 0, overdue: 0 },
  );

  return {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      employeesRanked: rankings.length,
      avgScore: rankings.length
        ? Math.round(rankings.reduce((s, r) => s + r.score, 0) / rankings.length)
        : 0,
      avgRating,
      lowPerformers: rankings.filter(r => r.score < 50).length,
      topPerformers: rankings.slice(0, 5),
      ...taskSummary,
    },
    rankings,
    departmentStats,
    scoreDistribution,
    goals: db.performanceGoals,
    reviews,
    individual,
    trend,
  };
}

export function ensurePerformanceSchema(db: { performanceSnapshots?: PerformanceSnapshotRecord[] }) {
  if (!db.performanceSnapshots) db.performanceSnapshots = [];
}

export function recordPerformanceSnapshots(periodLabel?: string): number {
  const db = getDb();
  ensurePerformanceSchema(db);
  const label = periodLabel || new Date().toISOString().slice(0, 7);
  const now = new Date().toISOString();
  let recorded = 0;

  for (const user of activeUsers().filter(u => u.status === 'Active' && u.role !== 'admin')) {
    const metrics = computeEmployeeMetrics(user.id, '30d');
    if (!metrics) continue;
    const exists = db.performanceSnapshots!.some(
      s => s.userId === user.id && s.period === label,
    );
    if (exists) continue;
    db.performanceSnapshots!.push({
      id: `ps-${Date.now()}-${user.id}`,
      userId: user.id,
      period: label,
      score: metrics.score,
      breakdown: metrics.breakdown,
      recordedAt: now,
    });
    recorded++;
  }
  return recorded;
}

export function getUserPerformanceTrend(userId: string) {
  const db = getDb();
  ensurePerformanceSchema(db);
  return (db.performanceSnapshots || [])
    .filter(s => s.userId === userId)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(-12)
    .map(s => ({ period: s.period, score: s.score, recordedAt: s.recordedAt }));
}

/** Back-compat wrapper used by algorithms and automations. */
export function employeePerformanceScore(userId: string): number {
  return computeEmployeeMetrics(userId, '90d')?.score ?? 0;
}