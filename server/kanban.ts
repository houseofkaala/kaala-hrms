import type { Database } from './db';

export type KanbanStage = 'todo' | 'in_progress' | 'in_review' | 'done';
export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface KanbanComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface KanbanChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KanbanTaskRecord {
  id: string;
  title: string;
  description: string;
  stage: KanbanStage;
  priority: KanbanPriority;
  assigneeId: string | null;
  /** ISO datetime deadline */
  dueDate: string | null;
  /** Hours allowed from creation to complete */
  timeLimitHours: number | null;
  labels: string[];
  projectId: string | null;
  checklist: KanbanChecklistItem[];
  comments: KanbanComment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const TIME_LIMIT_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '4 hours', hours: 4 },
  { label: '8 hours', hours: 8 },
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
] as const;

const DEFAULT_TIME_LIMIT_HOURS = 24;

export const KANBAN_STAGES: { key: KanbanStage; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

const VALID_STAGE = new Set<KanbanStage>(['todo', 'in_progress', 'in_review', 'done']);
const VALID_PRIORITY = new Set<KanbanPriority>(['low', 'medium', 'high', 'urgent']);

function normalizePriority(raw?: string): KanbanPriority {
  const p = (raw || 'medium').toLowerCase();
  if (p === 'low' || p === 'normal') return 'low';
  if (p === 'high' || p === 'urgent') return p === 'urgent' ? 'urgent' : 'high';
  return 'medium';
}

function normalizeStage(raw?: string): KanbanStage {
  const s = (raw || 'todo').toLowerCase().replace(/-/g, '_');
  if (VALID_STAGE.has(s as KanbanStage)) return s as KanbanStage;
  return 'todo';
}

function parseTimeLimitHours(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(24 * 365, Math.round(n));
}

function endOfDayIso(dateOnly: string): string {
  const d = new Date(`${dateOnly}T23:59:59`);
  return isNaN(d.getTime()) ? dateOnly : d.toISOString();
}

/** Resolve deadline from time limit and/or explicit due date + time. */
export function resolveKanbanDeadline(
  body: {
    dueDate?: string | null;
    dueTime?: string | null;
    timeLimitHours?: unknown;
  },
  createdAt: string,
): { dueDate: string | null; timeLimitHours: number | null } {
  const created = new Date(createdAt);
  const limitHours = parseTimeLimitHours(body.timeLimitHours);

  if (limitHours) {
    return {
      dueDate: new Date(created.getTime() + limitHours * 3600000).toISOString(),
      timeLimitHours: limitHours,
    };
  }

  if (typeof body.dueDate === 'string' && body.dueDate.trim()) {
    const datePart = body.dueDate.trim().slice(0, 10);
    const timePart = typeof body.dueTime === 'string' && body.dueTime ? body.dueTime : null;
    const iso = body.dueDate.includes('T')
      ? body.dueDate
      : timePart
        ? `${datePart}T${timePart.length === 5 ? `${timePart}:00` : timePart}`
        : endOfDayIso(datePart);
    const due = new Date(iso);
    if (!isNaN(due.getTime())) {
      const hours = Math.max(1, Math.round((due.getTime() - created.getTime()) / 3600000));
      return { dueDate: due.toISOString(), timeLimitHours: hours };
    }
  }

  return { dueDate: null, timeLimitHours: null };
}

export function getTaskDeadline(task: Pick<KanbanTaskRecord, 'dueDate' | 'timeLimitHours' | 'createdAt'>): Date | null {
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (task.timeLimitHours && task.createdAt) {
    return new Date(new Date(task.createdAt).getTime() + task.timeLimitHours * 3600000);
  }
  return null;
}

export function isKanbanTaskOverdue(task: Pick<KanbanTaskRecord, 'stage' | 'dueDate' | 'timeLimitHours' | 'createdAt'>): boolean {
  if (task.stage === 'done') return false;
  const deadline = getTaskDeadline(task);
  return deadline !== null && deadline.getTime() < Date.now();
}

export function kanbanTimeRemainingMs(task: Pick<KanbanTaskRecord, 'stage' | 'dueDate' | 'timeLimitHours' | 'createdAt'>): number | null {
  if (task.stage === 'done') return null;
  const deadline = getTaskDeadline(task);
  if (!deadline) return null;
  return deadline.getTime() - Date.now();
}

export function validateKanbanTimeLimit(body: Record<string, unknown>): string | null {
  const { dueDate, timeLimitHours } = resolveKanbanDeadline(
    {
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
      dueTime: typeof body.dueTime === 'string' ? body.dueTime : null,
      timeLimitHours: body.timeLimitHours,
    },
    new Date().toISOString(),
  );
  if (!dueDate && !timeLimitHours) {
    return 'Time limit is required — choose a preset or set a deadline date and time';
  }
  if (dueDate && new Date(dueDate).getTime() <= Date.now()) {
    return 'Deadline must be in the future';
  }
  return null;
}

export function normalizeKanbanTask(
  raw: Partial<KanbanTaskRecord> & { id: string; title: string },
  fallbackUserId = 'system',
): KanbanTaskRecord {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    title: raw.title || 'Untitled task',
    description: raw.description || '',
    stage: normalizeStage(raw.stage),
    priority: normalizePriority(raw.priority),
    assigneeId: raw.assigneeId ?? null,
    dueDate: raw.dueDate ?? null,
    timeLimitHours: parseTimeLimitHours(raw.timeLimitHours),
    labels: Array.isArray(raw.labels) ? raw.labels.filter(Boolean).map(String) : [],
    projectId: raw.projectId ?? null,
    checklist: Array.isArray(raw.checklist)
      ? raw.checklist.map((item, i) => ({
          id: item.id || `cl-${raw.id}-${i}`,
          text: item.text || '',
          done: Boolean(item.done),
        }))
      : [],
    comments: Array.isArray(raw.comments)
      ? raw.comments.map((c, i) => ({
          id: c.id || `cm-${raw.id}-${i}`,
          userId: c.userId || fallbackUserId,
          userName: c.userName || 'User',
          content: c.content || '',
          createdAt: c.createdAt || now,
        }))
      : [],
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    createdBy: raw.createdBy || raw.assigneeId || fallbackUserId,
  };
}

export function ensureKanbanSchema(db: Database & { kanbanTasks?: unknown[] }) {
  if (!db.kanbanTasks) db.kanbanTasks = [];
  db.kanbanTasks = db.kanbanTasks.map(t => {
    const raw = t as Partial<KanbanTaskRecord> & { id: string; title: string };
    const normalized = normalizeKanbanTask(raw);
    if (!normalized.dueDate && normalized.timeLimitHours && normalized.createdAt) {
      normalized.dueDate = new Date(
        new Date(normalized.createdAt).getTime() + normalized.timeLimitHours * 3600000,
      ).toISOString();
    } else if (normalized.dueDate && !normalized.timeLimitHours && normalized.createdAt) {
      const hours = Math.max(
        1,
        Math.round(
          (new Date(normalized.dueDate).getTime() - new Date(normalized.createdAt).getTime()) / 3600000,
        ),
      );
      if (Number.isFinite(hours)) normalized.timeLimitHours = hours;
    }
    return normalized;
  });
}

export function kanbanTaskVisible(
  task: KanbanTaskRecord,
  userId: string,
  isManager: boolean,
): boolean {
  if (isManager) return true;
  return task.assigneeId === userId || task.createdBy === userId;
}

export function kanbanStats(tasks: KanbanTaskRecord[]) {
  const now = Date.now();
  const byStage = Object.fromEntries(KANBAN_STAGES.map(s => [s.key, 0])) as Record<KanbanStage, number>;
  let overdue = 0;
  for (const t of tasks) {
    byStage[t.stage] = (byStage[t.stage] || 0) + 1;
    if (isKanbanTaskOverdue(t)) overdue += 1;
  }
  return { total: tasks.length, byStage, overdue };
}

export function parseLabels(input: unknown): string[] {
  if (Array.isArray(input)) return [...new Set(input.map(String).map(s => s.trim()).filter(Boolean))].slice(0, 8);
  if (typeof input === 'string') {
    return [...new Set(input.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 8);
  }
  return [];
}

export function applyKanbanPatch(
  task: KanbanTaskRecord,
  body: Record<string, unknown>,
): void {
  if (typeof body.title === 'string' && body.title.trim()) task.title = body.title.trim();
  if (typeof body.description === 'string') task.description = body.description;
  if (typeof body.stage === 'string' && VALID_STAGE.has(body.stage as KanbanStage)) {
    task.stage = body.stage as KanbanStage;
  }
  if (typeof body.priority === 'string' && VALID_PRIORITY.has(body.priority as KanbanPriority)) {
    task.priority = body.priority as KanbanPriority;
  }
  if (body.assigneeId === null || typeof body.assigneeId === 'string') {
    task.assigneeId = body.assigneeId as string | null;
  }
  if (body.dueDate === null && body.timeLimitHours === null) {
    task.dueDate = null;
    task.timeLimitHours = null;
  } else if (
    body.timeLimitHours !== undefined &&
    body.dueDate === undefined &&
    body.dueTime === undefined
  ) {
    const hours = parseTimeLimitHours(body.timeLimitHours);
    if (hours) {
      task.timeLimitHours = hours;
      task.dueDate = new Date(Date.now() + hours * 3600000).toISOString();
    }
  } else if (body.dueDate !== undefined || body.dueTime !== undefined || body.timeLimitHours !== undefined) {
    const resolved = resolveKanbanDeadline(
      {
        dueDate: body.dueDate === null ? null : typeof body.dueDate === 'string' ? body.dueDate : task.dueDate,
        dueTime: typeof body.dueTime === 'string' ? body.dueTime : null,
        timeLimitHours: body.timeLimitHours !== undefined ? body.timeLimitHours : undefined,
      },
      task.createdAt,
    );
    task.dueDate = resolved.dueDate;
    task.timeLimitHours = resolved.timeLimitHours;
  }
  if (body.projectId === null || typeof body.projectId === 'string') {
    task.projectId = body.projectId as string | null;
  }
  if (body.labels !== undefined) task.labels = parseLabels(body.labels);
  task.updatedAt = new Date().toISOString();
}

export function addKanbanComment(
  task: KanbanTaskRecord,
  userId: string,
  userName: string,
  content: string,
): KanbanComment {
  const comment: KanbanComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    userName,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  task.comments.push(comment);
  task.updatedAt = new Date().toISOString();
  return comment;
}

export function addKanbanChecklistItem(task: KanbanTaskRecord, text: string): KanbanChecklistItem {
  const item: KanbanChecklistItem = {
    id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    done: false,
  };
  task.checklist.push(item);
  task.updatedAt = new Date().toISOString();
  return item;
}

export function patchKanbanChecklistItem(
  task: KanbanTaskRecord,
  itemId: string,
  body: { text?: string; done?: boolean },
): KanbanChecklistItem | null {
  const item = task.checklist.find(i => i.id === itemId);
  if (!item) return null;
  if (typeof body.text === 'string' && body.text.trim()) item.text = body.text.trim();
  if (typeof body.done === 'boolean') item.done = body.done;
  task.updatedAt = new Date().toISOString();
  return item;
}

export function removeKanbanChecklistItem(task: KanbanTaskRecord, itemId: string): boolean {
  const idx = task.checklist.findIndex(i => i.id === itemId);
  if (idx < 0) return false;
  task.checklist.splice(idx, 1);
  task.updatedAt = new Date().toISOString();
  return true;
}

export function createKanbanTask(
  body: Record<string, unknown>,
  userId: string,
): KanbanTaskRecord {
  const now = new Date().toISOString();
  const hasLimit = body.timeLimitHours !== undefined && body.timeLimitHours !== null && body.timeLimitHours !== '';
  const hasDue = typeof body.dueDate === 'string' && body.dueDate.trim();
  const deadline = resolveKanbanDeadline(
    {
      dueDate: hasDue ? body.dueDate as string : null,
      dueTime: typeof body.dueTime === 'string' ? body.dueTime : null,
      timeLimitHours: hasLimit ? body.timeLimitHours : DEFAULT_TIME_LIMIT_HOURS,
    },
    now,
  );

  return normalizeKanbanTask({
    id: `KT-${Date.now()}`,
    title: String(body.title || '').trim() || 'Untitled task',
    description: typeof body.description === 'string' ? body.description : '',
    stage: 'todo',
    priority: normalizePriority(typeof body.priority === 'string' ? body.priority : undefined),
    assigneeId: body.assigneeId === null || typeof body.assigneeId === 'string' ? (body.assigneeId as string | null) : userId,
    dueDate: deadline.dueDate,
    timeLimitHours: deadline.timeLimitHours,
    labels: parseLabels(body.labels),
    projectId: body.projectId === null || typeof body.projectId === 'string' ? (body.projectId as string | null) : null,
    checklist: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  }, userId);
}