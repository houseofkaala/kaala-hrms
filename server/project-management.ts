import type { Database } from './db';
import { projectHealthScore } from './algorithms';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStage = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  color: string;
  client: string;
  startDate: string;
  endDate: string;
  leadId: string;
  memberIds: string[];
  teamSize: number;
  milestones: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: TaskStage;
  priority: ProjectPriority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
  order: number;
  createdAt: string;
  createdBy: string;
}

export const TASK_STAGES: { key: TaskStage; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

export const PROJECT_COLORS = ['#651a2c', '#7f2438', '#4a1220', '#9a3348', '#320a15', '#1f050c'];

const VALID_STATUS = new Set<ProjectStatus>(['planning', 'active', 'on_hold', 'completed', 'archived']);
const VALID_PRIORITY = new Set<ProjectPriority>(['low', 'medium', 'high', 'urgent']);
const VALID_STAGE = new Set<TaskStage>(['backlog', 'todo', 'in_progress', 'in_review', 'done']);

export function normalizeProject(raw: Partial<ProjectRecord> & { id: string; name: string }): ProjectRecord {
  const memberIds = Array.isArray(raw.memberIds) ? [...new Set(raw.memberIds.filter(Boolean))] : [];
  const leadId = raw.leadId || memberIds[0] || '';
  if (leadId && !memberIds.includes(leadId)) memberIds.unshift(leadId);

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    status: VALID_STATUS.has(raw.status as ProjectStatus) ? (raw.status as ProjectStatus) : 'active',
    priority: VALID_PRIORITY.has(raw.priority as ProjectPriority) ? (raw.priority as ProjectPriority) : 'medium',
    progress: typeof raw.progress === 'number' ? raw.progress : 0,
    color: raw.color || PROJECT_COLORS[0],
    client: raw.client || '',
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    endDate: raw.endDate || '',
    leadId,
    memberIds,
    teamSize: memberIds.length || raw.teamSize || 1,
    milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeTask(raw: Partial<ProjectTaskRecord> & { id: string; projectId: string; title: string }): ProjectTaskRecord {
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    description: raw.description || '',
    stage: VALID_STAGE.has(raw.stage as TaskStage) ? (raw.stage as TaskStage) : 'todo',
    priority: VALID_PRIORITY.has(raw.priority as ProjectPriority) ? (raw.priority as ProjectPriority) : 'medium',
    assigneeId: raw.assigneeId ?? null,
    dueDate: raw.dueDate ?? null,
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    order: typeof raw.order === 'number' ? raw.order : 0,
    createdAt: raw.createdAt || new Date().toISOString(),
    createdBy: raw.createdBy || '',
  };
}

export function calcProgress(tasks: ProjectTaskRecord[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.stage === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

export function syncProjectMeta(project: ProjectRecord, tasks: ProjectTaskRecord[]) {
  project.progress = calcProgress(tasks);
  project.teamSize = project.memberIds.length;
  project.updatedAt = new Date().toISOString();
}

export function ensureProjectSchema(db: Database & { projectTasks?: ProjectTaskRecord[] }) {
  if (!db.projectTasks) db.projectTasks = [];
  db.projects = (db.projects || []).map(p => normalizeProject(p as ProjectRecord));
  db.projectTasks = db.projectTasks.map(t => normalizeTask(t));
}

export function userCanAccessProject(project: ProjectRecord, userId: string, role: string): boolean {
  if (role === 'admin' || role === 'manager') return true;
  return project.memberIds.includes(userId);
}

export function projectWithStats(
  project: ProjectRecord,
  tasks: ProjectTaskRecord[],
  users: Database['users'],
) {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const openTasks = projectTasks.filter(t => t.stage !== 'done').length;
  const members = project.memberIds
    .map(id => users.find(u => u.id === id))
    .filter(Boolean)
    .map(u => ({ id: u!.id, name: u!.name, title: u!.title, department: u!.department }));

  const progress = calcProgress(projectTasks);

  return {
    ...project,
    progress,
    health: projectHealthScore({ ...project, progress }, projectTasks),
    teamSize: project.memberIds.length,
    taskCount: projectTasks.length,
    openTasks,
    members,
  };
}