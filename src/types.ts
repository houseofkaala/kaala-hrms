export interface User {
  id: string;
  name: string;
  points: number;
  role: 'employee' | 'manager' | 'admin' | 'sales' | 'executive_assistant';
  department: string;
  status?: string;
  email?: string;
  phone?: string;
  projects?: string[];
  title?: string;
  joinDate?: string;
  allowedModules?: string[];
  hasProfileImage?: boolean;
}

export interface Task {
  id: string;
  title: string;
  ownerId: string;
  status: 'pending' | 'marketplace' | 'claimed' | 'in_progress' | 'under_review' | 'completed' | 'failed';
  timeStarted?: string;
  timeSpent?: number;
  claimedById?: string;
  value: number; 
  deadline: string;
  referenceLink?: string;
  category?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectTaskStage = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface ProjectMember {
  id: string;
  name: string;
  title?: string;
  department?: string;
}

export interface Project {
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
  taskCount?: number;
  openTasks?: number;
  members?: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: ProjectTaskStage;
  priority: ProjectPriority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
  order: number;
  createdAt: string;
  createdBy: string;
}

export interface ProjectDetail extends Project {
  tasks: ProjectTask[];
}

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

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  stage: KanbanStage;
  priority: KanbanPriority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: string[];
  projectId: string | null;
  checklist: KanbanChecklistItem[];
  comments: KanbanComment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface KanbanStats {
  total: number;
  byStage: Record<KanbanStage, number>;
  overdue: number;
}

