import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Users, Calendar, ArrowLeft, LayoutGrid, List, Flag, UserPlus,
  MoreHorizontal, CheckCircle2, Circle, Trash2, X, Search, Filter,
  MessageSquare, Paperclip, Video, ExternalLink, Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import type { Project, ProjectDetail, ProjectTask, ProjectStatus, ProjectPriority, User } from '../types';

const STAGES: { key: ProjectTask['stage']; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

const STATUSES: { key: ProjectStatus; label: string }[] = [
  { key: 'planning', label: 'Planning' },
  { key: 'active', label: 'Active' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

const PRIORITIES: ProjectPriority[] = ['low', 'medium', 'high', 'urgent'];
const COLORS = ['#651a2c', '#7f2438', '#4a1220', '#9a3348', '#320a15'];

function statusChip(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    planning: 'bg-maroon-50 text-maroon-700 border-maroon-200',
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    on_hold: 'bg-amber-50 text-amber-800 border-amber-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
    archived: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return map[status] || map.active;
}

function priorityChip(p: ProjectPriority) {
  const map: Record<ProjectPriority, string> = {
    low: 'text-gray-500',
    medium: 'text-maroon-600',
    high: 'text-amber-700',
    urgent: 'text-red-700',
  };
  return map[p];
}

export function ProjectsView() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1];

  if (projectId) {
    return <ProjectDetailView projectId={projectId} onBack={() => navigate('/projects')} />;
  }

  return <ProjectListView onOpen={(id) => navigate(`/projects/${id}`)} />;
}

function ProjectListView({ onOpen }: { onOpen: (id: string) => void }) {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [form, setForm] = useState({
    name: '', description: '', client: '', status: 'planning' as ProjectStatus,
    priority: 'medium' as ProjectPriority, startDate: '', endDate: '', color: COLORS[0],
  });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
  });

  const filtered = projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ ...form, leadId: currentUser?.id }),
    });
    qc.invalidateQueries({ queryKey: ['projects'] });
    setShowForm(false);
    setForm({ name: '', description: '', client: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', color: COLORS[0] });
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    openTasks: projects.reduce((s, p) => s + (p.openTasks || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="studio-stat">
          <p className="studio-stat-label">Projects</p>
          <p className="studio-stat-value">{stats.total}</p>
        </div>
        <div className="studio-stat">
          <p className="studio-stat-label">Active</p>
          <p className="studio-stat-value">{stats.active}</p>
        </div>
        <div className="studio-stat">
          <p className="studio-stat-label">Open Tasks</p>
          <p className="studio-stat-value">{stats.openTasks}</p>
        </div>
      </div>

      <div className="studio-card px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-maroon-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-maroon-400 shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProjectStatus | 'all')} className="input-field w-auto text-sm py-2">
              <option value="all">All statuses</option>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {showForm && isManager && (
        <form onSubmit={create} className="studio-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-xl font-semibold text-maroon-950">Create Project</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-maroon-400 hover:text-maroon-800"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="studio-kicker block mb-1.5">Project name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Brand Refresh 2026" />
            </div>
            <div className="md:col-span-2">
              <label className="studio-kicker block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field min-h-[80px] resize-none" placeholder="What is this project about?" />
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Client</label>
              <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Colour</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className={cn('w-8 h-8 rounded-full border-2 transition-transform', form.color === c ? 'border-ink scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))} className="input-field">
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))} className="input-field">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Start date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">End date</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Project</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-maroon-500 text-center py-12">Loading projects…</p>
      ) : filtered.length === 0 ? (
        <div className="studio-card p-16 flex flex-col items-center text-maroon-400">
          <LayoutGrid className="w-12 h-12 mb-4 opacity-40" />
          <p className="font-display text-lg text-maroon-700">No projects yet</p>
          <p className="text-sm mt-1">{isManager ? 'Create your first project to get started.' : 'You have not been assigned to any projects.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <button key={p.id} onClick={() => onOpen(p.id)} className="studio-card p-6 text-left hover:scale-[1.01] transition-transform group">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-maroon-950 truncate group-hover:text-maroon-700">{p.name}</h3>
                    {p.client && <p className="text-xs text-maroon-500 mt-0.5 truncate">{p.client}</p>}
                  </div>
                </div>
                <span className={cn('studio-chip text-[8px] shrink-0 border', statusChip(p.status))}>{p.status.replace('_', ' ')}</span>
              </div>
              {p.description && <p className="text-sm text-maroon-600/70 line-clamp-2 mb-4">{p.description}</p>}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-maroon-500">Progress · Health</span>
                  <span className="font-semibold text-maroon-900">{p.progress}% · {(p as { health?: number }).health ?? '—'}%</span>
                </div>
                <div className="h-1.5 bg-maroon-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-maroon-100">
                <div className="flex items-center gap-3 text-xs text-maroon-600">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.teamSize}</span>
                  <span>{p.openTasks ?? 0} open tasks</span>
                </div>
                {p.endDate && (
                  <span className="flex items-center gap-1 text-xs text-maroon-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(p.endDate), 'MMM d')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetailView({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [tab, setTab] = useState<'board' | 'list' | 'milestones' | 'team' | 'chat'>('board');
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' as ProjectPriority, assigneeId: '', dueDate: '' });
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [addMemberId, setAddMemberId] = useState('');

  const { data: project, isLoading, error } = useQuery<ProjectDetail>({
    queryKey: ['project', projectId],
    queryFn: () => fetcher(`/api/projects/${projectId}`),
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetcher('/api/users'),
    enabled: isManager,
  });

  type ProjectMessage = {
    id: string; fromId: string; authorName: string; content: string;
    type: 'message' | 'file' | 'meet'; attachmentName?: string; meetLink?: string; createdAt: string;
  };

  const { data: chatMessages = [], refetch: refetchChat } = useQuery<ProjectMessage[]>({
    queryKey: ['project-chat', projectId],
    queryFn: () => fetcher(`/api/projects/${projectId}/chat`),
    enabled: tab === 'chat',
    refetchInterval: tab === 'chat' ? 8000 : false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const moveTask = async (taskId: string, stage: ProjectTask['stage']) => {
    await fetcher(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
    refresh();
  };

  const createTask = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        ...taskForm,
        assigneeId: taskForm.assigneeId || null,
        dueDate: taskForm.dueDate || null,
      }),
    });
    setTaskForm({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
    setShowTaskForm(false);
    refresh();
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    await fetcher(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    refresh();
  };

  const addMilestone = async (e: FormEvent) => {
    e.preventDefault();
    await fetcher(`/api/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title: milestoneTitle, dueDate: milestoneDate }),
    });
    setMilestoneTitle('');
    setMilestoneDate('');
    refresh();
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    await fetcher(`/api/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    refresh();
  };

  const addMember = async () => {
    if (!addMemberId) return;
    await fetcher(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId: addMemberId }) });
    setAddMemberId('');
    refresh();
  };

  const removeMember = async (userId: string) => {
    await fetcher(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
    refresh();
  };

  const updateStatus = async (status: ProjectStatus) => {
    if (!isManager) return;
    await fetcher(`/api/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    refresh();
  };

  const sendChat = async (payload: { content?: string; type?: string; contentBase64?: string; fileName?: string; mimeType?: string }) => {
    setChatSending(true);
    try {
      await fetcher(`/api/projects/${projectId}/chat`, { method: 'POST', body: JSON.stringify(payload) });
      setChatInput('');
      refetchChat();
    } finally {
      setChatSending(false);
    }
  };

  const scheduleMeet = () => sendChat({ type: 'meet', content: 'Google Meet scheduled for the team' });

  const attachFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result).split(',')[1];
        sendChat({ type: 'file', contentBase64: base64, fileName: file.name, mimeType: file.type, content: `Shared file: ${file.name}` });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  if (isLoading) return <p className="text-sm text-maroon-500 py-12 text-center">Loading project…</p>;
  if (error || !project) return (
    <div className="studio-card p-12 text-center">
      <p className="text-maroon-700">Project not found or access denied.</p>
      <button onClick={onBack} className="btn-secondary mt-4">Back to projects</button>
    </div>
  );

  const tasks = project.tasks || [];
  const members = project.members || [];
  const availableUsers = allUsers.filter(u => u.status !== 'Inactive' && !project.memberIds.includes(u.id));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-maroon-600 hover:text-maroon-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All projects
      </button>

      <div className="studio-card overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-maroon-100" style={{ borderLeftWidth: 4, borderLeftColor: project.color }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn('studio-chip border text-[8px]', statusChip(project.status))}>{project.status.replace('_', ' ')}</span>
                <span className={cn('studio-kicker', priorityChip(project.priority))}>{project.priority} priority</span>
              </div>
              <h2 className="font-display text-3xl font-semibold text-maroon-950">{project.name}</h2>
              {project.client && <p className="text-sm text-maroon-500 mt-1">{project.client}</p>}
              {project.description && <p className="text-sm text-maroon-700/80 mt-3 max-w-2xl leading-relaxed">{project.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {isManager && project.status !== 'completed' && (
                <select
                  value={project.status}
                  onChange={e => updateStatus(e.target.value as ProjectStatus)}
                  className="input-field text-sm py-2 w-auto"
                >
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              )}
              <button onClick={() => setShowTaskForm(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="studio-kicker">Progress / Health</p>
              <p className="font-display text-2xl font-semibold text-maroon-950 mt-1">{project.progress}%</p>
              {'health' in project && (
                <p className="text-xs text-maroon-500 mt-0.5">Health score: {(project as { health?: number }).health ?? '—'}%</p>
              )}
              <div className="h-1.5 bg-maroon-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
              </div>
            </div>
            <div>
              <p className="studio-kicker">Tasks</p>
              <p className="font-display text-2xl font-semibold text-maroon-950 mt-1">{tasks.length}</p>
              <p className="text-xs text-maroon-500 mt-1">{tasks.filter(t => t.stage !== 'done').length} open</p>
            </div>
            <div>
              <p className="studio-kicker">Team</p>
              <p className="font-display text-2xl font-semibold text-maroon-950 mt-1">{project.teamSize}</p>
            </div>
            <div>
              <p className="studio-kicker">Timeline</p>
              <p className="text-sm text-maroon-800 mt-1 font-medium">
                {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : '—'}
                {project.endDate && <> → {format(new Date(project.endDate), 'MMM d, yyyy')}</>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-6 border-b border-maroon-100 overflow-x-auto">
          {([
            { key: 'board' as const, label: 'Board', icon: LayoutGrid },
            { key: 'list' as const, label: 'List', icon: List },
            { key: 'milestones' as const, label: 'Milestones', icon: Flag },
            { key: 'team' as const, label: 'Team', icon: Users },
            { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.key ? 'border-maroon-700 text-maroon-950' : 'border-transparent text-maroon-500 hover:text-maroon-800',
              )}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {showTaskForm && (
            <form onSubmit={createTask} className="studio-card p-4 mb-6 space-y-3">
              <div className="flex gap-3">
                <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className="input-field flex-1" />
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))} className="input-field w-auto">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="input-field min-h-[60px] resize-none" />
              <div className="flex flex-wrap gap-3">
                <select value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))} className="input-field w-auto text-sm">
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="input-field w-auto text-sm" />
                <button type="submit" className="btn-primary text-sm">Add Task</button>
                <button type="button" onClick={() => setShowTaskForm(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </form>
          )}

          {tab === 'board' && (
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[420px]">
              {STAGES.map(stage => (
                <div key={stage.key} className="min-w-[260px] flex-1 bg-maroon-50/50 border border-maroon-100 rounded-2xl p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="studio-kicker text-maroon-700">{stage.label}</h4>
                    <span className="text-xs text-maroon-400 tabular-nums">{tasks.filter(t => t.stage === stage.key).length}</span>
                  </div>
                  {tasks.filter(t => t.stage === stage.key).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      onMove={s => moveTask(task.id, s)}
                      onDelete={() => deleteTask(task.id)}
                      canDelete={isManager || task.createdBy === currentUser?.id}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'list' && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-maroon-400 text-center py-8">No tasks yet. Add one to get started.</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="studio-card p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={cn('font-medium text-maroon-950', task.stage === 'done' && 'line-through text-maroon-400')}>{task.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-maroon-500">
                        <span className="capitalize">{task.stage.replace('_', ' ')}</span>
                        <span>·</span>
                        <span className={priorityChip(task.priority)}>{task.priority}</span>
                        {task.assigneeId && (
                          <>
                            <span>·</span>
                            <span>{members.find(m => m.id === task.assigneeId)?.name || 'Assigned'}</span>
                          </>
                        )}
                        {task.dueDate && (
                          <>
                            <span>·</span>
                            <span>Due {format(new Date(task.dueDate), 'MMM d')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <select
                      value={task.stage}
                      onChange={e => moveTask(task.id, e.target.value as ProjectTask['stage'])}
                      className="input-field text-xs py-1.5 w-auto shrink-0"
                    >
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'milestones' && (
            <div className="space-y-4 max-w-xl">
              <form onSubmit={addMilestone} className="flex gap-2">
                <input required value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)} placeholder="Milestone title" className="input-field flex-1" />
                <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)} className="input-field w-auto" />
                <button type="submit" className="btn-primary shrink-0"><Plus className="w-4 h-4" /></button>
              </form>
              {(project.milestones || []).length === 0 ? (
                <p className="text-sm text-maroon-400 py-4">No milestones defined.</p>
              ) : (
                project.milestones.map(ms => (
                  <button
                    key={ms.id}
                    onClick={() => toggleMilestone(ms.id, !ms.completed)}
                    className="w-full studio-card p-4 flex items-center gap-3 text-left hover:bg-maroon-50/50 transition-colors"
                  >
                    {ms.completed ? <CheckCircle2 className="w-5 h-5 text-maroon-600 shrink-0" /> : <Circle className="w-5 h-5 text-maroon-300 shrink-0" />}
                    <div>
                      <p className={cn('font-medium text-maroon-950', ms.completed && 'line-through text-maroon-400')}>{ms.title}</p>
                      {ms.dueDate && <p className="text-xs text-maroon-500 mt-0.5">Due {format(new Date(ms.dueDate), 'MMM d, yyyy')}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {tab === 'chat' && (
            <div className="flex flex-col h-[480px] max-w-2xl">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-maroon-400 text-center py-8">No messages yet. Start the conversation.</p>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'rounded-2xl px-4 py-3 max-w-[85%]',
                        msg.fromId === currentUser?.id ? 'ml-auto bg-maroon-800 text-white' : 'bg-maroon-50 text-maroon-950',
                        msg.fromId === 'system' && 'mx-auto bg-maroon-100/80 text-maroon-700 text-center text-sm max-w-full',
                      )}
                    >
                      {msg.fromId !== 'system' && msg.fromId !== currentUser?.id && (
                        <p className="text-[10px] font-semibold opacity-70 mb-1">{msg.authorName}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.type === 'file' && msg.attachmentName && (
                        <a
                          href={`/api/projects/${projectId}/chat/${msg.id}/file`}
                          className={cn('inline-flex items-center gap-1.5 mt-2 text-xs font-medium underline', msg.fromId === currentUser?.id ? 'text-maroon-100' : 'text-maroon-700')}
                        >
                          <Paperclip className="w-3.5 h-3.5" /> {msg.attachmentName}
                        </a>
                      )}
                      {msg.type === 'meet' && msg.meetLink && (
                        <a
                          href={msg.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn('inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg', msg.fromId === currentUser?.id ? 'bg-white/20 hover:bg-white/30' : 'bg-maroon-700 text-white hover:bg-maroon-800')}
                        >
                          <Video className="w-3.5 h-3.5" /> Join Google Meet <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <p className={cn('text-[9px] mt-1.5 opacity-50', msg.fromId === currentUser?.id ? 'text-right' : '')}>
                        {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-maroon-100 pt-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) { e.preventDefault(); sendChat({ content: chatInput.trim() }); } }}
                    placeholder="Message the project team…"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => chatInput.trim() && sendChat({ content: chatInput.trim() })}
                    disabled={chatSending || !chatInput.trim()}
                    className="btn-primary shrink-0 px-4"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={attachFile} disabled={chatSending} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Attach file
                  </button>
                  <button type="button" onClick={scheduleMeet} disabled={chatSending} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Schedule Google Meet
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'team' && (
            <div className="space-y-4 max-w-lg">
              {isManager && availableUsers.length > 0 && (
                <div className="flex gap-2">
                  <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)} className="input-field flex-1">
                    <option value="">Add team member…</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}
                  </select>
                  <button onClick={addMember} disabled={!addMemberId} className="btn-primary shrink-0"><UserPlus className="w-4 h-4" /></button>
                </div>
              )}
              {members.map(m => (
                <div key={m.id} className="studio-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-maroon-600 to-maroon-950 text-white flex items-center justify-center text-sm font-bold">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-maroon-950">{m.name}</p>
                      <p className="text-xs text-maroon-500">{m.title || m.department}{m.id === project.leadId && ' · Lead'}</p>
                    </div>
                  </div>
                  {isManager && m.id !== project.leadId && (
                    <button onClick={() => removeMember(m.id)} className="p-2 text-maroon-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task, members, onMove, onDelete, canDelete,
}: {
  task: ProjectTask;
  members: { id: string; name: string }[];
  onMove: (stage: ProjectTask['stage']) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const idx = STAGES.findIndex(s => s.key === task.stage);
  const next = idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
  const prev = idx > 0 ? STAGES[idx - 1].key : null;

  return (
    <div className="studio-card p-3 relative group">
      <p className="text-sm font-medium text-maroon-950 leading-snug">{task.title}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className={cn('text-[9px] font-bold uppercase tracking-wider', priorityChip(task.priority))}>{task.priority}</span>
        {task.assigneeId && (
          <span className="text-[9px] text-maroon-500">{members.find(m => m.id === task.assigneeId)?.name?.split(' ')[0]}</span>
        )}
        {task.dueDate && (
          <span className="text-[9px] text-maroon-400">{format(new Date(task.dueDate), 'MMM d')}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-maroon-50">
        <div className="flex gap-1">
          {prev && (
            <button onClick={() => onMove(prev)} className="text-[10px] text-maroon-500 hover:text-maroon-800">←</button>
          )}
          {next && (
            <button onClick={() => onMove(next)} className="text-[10px] text-maroon-600 font-semibold hover:text-maroon-900">→</button>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="p-1 text-maroon-300 hover:text-maroon-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-maroon-100 rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
              {STAGES.filter(s => s.key !== task.stage).map(s => (
                <button key={s.key} onClick={() => { onMove(s.key); setMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-maroon-700 hover:bg-maroon-50">
                  {s.label}
                </button>
              ))}
              {canDelete && (
                <button onClick={() => { onDelete(); setMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}