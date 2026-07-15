import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, LayoutGrid, List, X, Calendar, User, Flag,
  MessageSquare, CheckCircle2, Circle, Trash2, MoreHorizontal, Send,
  AlertCircle, Tag,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { fetcher, cn } from '../utils';
import { useRBACStore } from '../store';
import { ViewApiError } from '../components/ViewApiError';
import type {
  KanbanTask, KanbanStage, KanbanPriority, KanbanStats, User as AppUser, Project,
} from '../types';

const STAGES: { key: KanbanStage; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITIES: KanbanPriority[] = ['low', 'medium', 'high', 'urgent'];

function priorityChip(p: KanbanPriority) {
  const map: Record<KanbanPriority, string> = {
    low: 'bg-charcoal text-ivory-muted',
    medium: 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/20',
    high: 'bg-amber-50 text-amber-800 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/20',
    urgent: 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/20',
  };
  return map[p] || map.medium;
}

function priorityLabel(p: KanbanPriority) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function isOverdue(task: KanbanTask) {
  return task.dueDate && task.stage !== 'done' && isPast(parseISO(task.dueDate));
}

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium' as KanbanPriority,
  assigneeId: '',
  dueDate: '',
  labels: '',
  projectId: '',
};

export function TasksView() {
  const { currentUser } = useRBACStore();
  const qc = useQueryClient();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<KanbanStage | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<KanbanPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [actionError, setActionError] = useState('');

  const { data: tasks = [], isError, error, refetch, isLoading } = useQuery<KanbanTask[]>({
    queryKey: ['kanban'],
    queryFn: () => fetcher('/api/kanban'),
  });

  const { data: stats } = useQuery<KanbanStats>({
    queryKey: ['kanban-stats'],
    queryFn: () => fetcher('/api/kanban/stats'),
  });

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: () => fetcher('/api/users'),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetcher('/api/projects'),
    enabled: isManager,
  });

  const activeUsers = useMemo(
    () => users.filter(u => u.status !== 'Inactive'),
    [users],
  );

  const userName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return activeUsers.find(u => u.id === id)?.name || 'Unknown';
  };

  const projectName = (id: string | null) => {
    if (!id) return null;
    return projects.find(p => p.id === id)?.name || id;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks.filter(t => {
      if (stageFilter !== 'all' && t.stage !== stageFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
      if (q) {
        const hay = [
          t.title, t.description, t.id,
          ...t.labels,
          userName(t.assigneeId),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, stageFilter, priorityFilter, assigneeFilter, activeUsers]);

  const selected = tasks.find(t => t.id === selectedId) ?? null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['kanban'] });
    qc.invalidateQueries({ queryKey: ['kanban-stats'] });
  };

  const createTask = async (e: FormEvent) => {
    e.preventDefault();
    setActionError('');
    try {
      await fetcher('/api/kanban', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          priority: form.priority,
          assigneeId: form.assigneeId || (isManager ? null : currentUser?.id),
          dueDate: form.dueDate || null,
          labels: form.labels,
          projectId: form.projectId || null,
        }),
      });
      refresh();
      setForm(emptyForm);
      setShowCreate(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    setActionError('');
    try {
      await fetcher(`/api/kanban/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    setActionError('');
    try {
      await fetcher(`/api/kanban/${id}`, { method: 'DELETE' });
      if (selectedId === id) setSelectedId(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  if (isError) {
    return (
      <ViewApiError
        message={error instanceof Error ? error.message : 'Failed to load tasks'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 view-panel-height flex flex-col">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="studio-stat">
          <p className="studio-stat-label">Total</p>
          <p className="studio-stat-value">{stats?.total ?? tasks.length}</p>
        </div>
        {STAGES.map(s => (
          <div key={s.key} className="studio-stat">
            <p className="studio-stat-label">{s.label}</p>
            <p className="studio-stat-value">{stats?.byStage?.[s.key] ?? tasks.filter(t => t.stage === s.key).length}</p>
          </div>
        ))}
        <div className="studio-stat col-span-2 sm:col-span-1">
          <p className="studio-stat-label">Overdue</p>
          <p className={cn('studio-stat-value', (stats?.overdue ?? 0) > 0 && 'text-red-600')}>
            {stats?.overdue ?? tasks.filter(isOverdue).length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="studio-card px-4 sm:px-6 py-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ivory">Task Management</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate overflow-hidden">
              <button
                onClick={() => setView('board')}
                className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors', view === 'board' ? 'bg-charcoal text-ivory' : 'text-ivory-muted hover:text-ivory')}
              >
                <LayoutGrid className="w-4 h-4" /> Board
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors', view === 'list' ? 'bg-charcoal text-ivory' : 'text-ivory-muted hover:text-ivory')}
              >
                <List className="w-4 h-4" /> List
              </button>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ivory-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-ivory-muted shrink-0 hidden sm:block" />
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value as KanbanStage | 'all')} className="input-field w-auto text-sm py-2">
              <option value="all">All stages</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as KanbanPriority | 'all')} className="input-field w-auto text-sm py-2">
              <option value="all">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
            </select>
            {isManager && (
              <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="input-field w-auto text-sm py-2">
                <option value="all">All assignees</option>
                {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-lg">
          {actionError}
        </p>
      )}

      {/* Create modal */}
      {showCreate && (
        <form onSubmit={createTask} className="studio-card p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-ivory">Create Task</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="p-1 text-ivory-muted hover:text-ivory">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="studio-kicker block mb-1.5">Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="What needs to be done?" />
            </div>
            <div className="md:col-span-2">
              <label className="studio-kicker block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field min-h-[80px] resize-none" placeholder="Add details, context, or acceptance criteria…" />
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as KanbanPriority }))} className="input-field">
                {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="studio-kicker block mb-1.5">Due date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input-field" />
            </div>
            {isManager && (
              <div>
                <label className="studio-kicker block mb-1.5">Assignee</label>
                <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))} className="input-field">
                  <option value="">Unassigned</option>
                  {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            {isManager && projects.length > 0 && (
              <div>
                <label className="studio-kicker block mb-1.5">Project</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="input-field">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="studio-kicker block mb-1.5">Labels</label>
              <input value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} className="input-field" placeholder="Comma-separated, e.g. design, urgent" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Task</button>
          </div>
        </form>
      )}

      {/* Main content */}
      {isLoading ? (
        <p className="text-sm text-ivory-muted text-center py-12">Loading tasks…</p>
      ) : filtered.length === 0 ? (
        <div className="studio-card p-12 flex flex-col items-center text-ivory-muted">
          <LayoutGrid className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg text-ivory">No tasks found</p>
          <p className="text-sm mt-1">{tasks.length === 0 ? 'Create your first task to get started.' : 'Try adjusting your filters.'}</p>
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-4 sm:gap-6 flex-1 overflow-x-auto pb-4 table-scroll -mx-1 px-1 min-h-[420px]">
          {STAGES.map(stage => {
            const column = filtered.filter(t => t.stage === stage.key);
            return (
              <div key={stage.key} className="bg-marble-light border border-slate rounded-2xl p-4 min-w-[260px] sm:min-w-[300px] flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ivory">{stage.label}</h3>
                  <span className="text-xs text-ivory-muted tabular-nums">{column.length}</span>
                </div>
                {column.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assigneeName={userName(task.assigneeId)}
                    projectLabel={projectName(task.projectId)}
                    onOpen={() => setSelectedId(task.id)}
                    onMove={s => patchTask(task.id, { stage: s })}
                    onDelete={() => deleteTask(task.id)}
                    canDelete={isManager || task.createdBy === currentUser?.id}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {filtered.map(task => (
            <button
              key={task.id}
              onClick={() => setSelectedId(task.id)}
              className="studio-card p-4 w-full text-left flex items-center justify-between gap-4 hover:scale-[1.005] transition-transform"
            >
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium text-ivory', task.stage === 'done' && 'line-through text-ivory-muted')}>{task.title}</p>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-ivory-muted">
                  <span className="capitalize">{task.stage.replace('_', ' ')}</span>
                  <span>·</span>
                  <span className={cn('font-semibold uppercase', task.priority === 'urgent' ? 'text-red-500' : task.priority === 'high' ? 'text-amber-600' : '')}>
                    {task.priority}
                  </span>
                  {task.assigneeId && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {userName(task.assigneeId)}</span>
                    </>
                  )}
                  {task.dueDate && (
                    <>
                      <span>·</span>
                      <span className={cn('flex items-center gap-1', isOverdue(task) && 'text-red-500')}>
                        <Calendar className="w-3 h-3" /> {format(parseISO(task.dueDate), 'MMM d')}
                      </span>
                    </>
                  )}
                  {task.labels.length > 0 && (
                    <>
                      <span>·</span>
                      <span>{task.labels.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
              <select
                value={task.stage}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); patchTask(task.id, { stage: e.target.value }); }}
                className="input-field text-xs py-1.5 w-auto shrink-0"
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <TaskDetailDrawer
          task={selected}
          users={activeUsers}
          projects={projects}
          isManager={isManager}
          currentUserId={currentUser?.id}
          assigneeName={userName(selected.assigneeId)}
          projectLabel={projectName(selected.projectId)}
          onClose={() => setSelectedId(null)}
          onPatch={body => patchTask(selected.id, body)}
          onDelete={() => deleteTask(selected.id)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

function TaskCard({
  task, assigneeName, projectLabel, onOpen, onMove, onDelete, canDelete,
}: {
  task: KanbanTask;
  assigneeName: string;
  projectLabel: string | null;
  onOpen: () => void;
  onMove: (stage: KanbanStage) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  canDelete: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const idx = STAGES.findIndex(s => s.key === task.stage);
  const next = idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
  const prev = idx > 0 ? STAGES[idx - 1].key : null;
  const doneCount = task.checklist.filter(i => i.done).length;
  const checklistTotal = task.checklist.length;

  return (
    <div className="studio-card p-4 relative group cursor-pointer" onClick={onOpen}>
      <p className="font-semibold text-ivory leading-snug pr-6">{task.title}</p>
      {task.description && (
        <p className="text-xs text-ivory-muted mt-1.5 line-clamp-2">{task.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider', priorityChip(task.priority))}>
          {task.priority}
        </span>
        {task.labels.slice(0, 2).map(l => (
          <span key={l} className="text-[10px] px-2 py-0.5 rounded-md bg-charcoal text-ivory-muted flex items-center gap-0.5">
            <Tag className="w-2.5 h-2.5" /> {l}
          </span>
        ))}
        {isOverdue(task) && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-600 flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" /> Overdue
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-ivory-muted">
        {task.assigneeId && (
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {assigneeName.split(' ')[0]}</span>
        )}
        {task.dueDate && (
          <span className={cn('flex items-center gap-1', isOverdue(task) && 'text-red-500')}>
            <Calendar className="w-3 h-3" /> {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        )}
        {checklistTotal > 0 && (
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {doneCount}/{checklistTotal}</span>
        )}
        {task.comments.length > 0 && (
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {task.comments.length}</span>
        )}
        {projectLabel && (
          <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {projectLabel}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1">
          {prev && (
            <button onClick={() => onMove(prev)} className="text-[10px] text-ivory-muted hover:text-ivory">←</button>
          )}
          {next && (
            <button onClick={() => onMove(next)} className="text-[10px] text-gold font-semibold hover:opacity-80">→</button>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="p-1 text-ivory-muted hover:text-ivory opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-charcoal border border-slate rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
              <button onClick={() => { onOpen(); setMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-ivory hover:bg-charcoal/50">Open</button>
              {STAGES.filter(s => s.key !== task.stage).map(s => (
                <button key={s.key} onClick={() => { onMove(s.key); setMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-ivory-muted hover:bg-charcoal/50">
                  Move to {s.label}
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

function TaskDetailDrawer({
  task, users, projects, isManager, currentUserId, assigneeName, projectLabel,
  onClose, onPatch, onDelete, onRefresh,
}: {
  task: KanbanTask;
  users: AppUser[];
  projects: Project[];
  isManager: boolean;
  currentUserId?: string;
  assigneeName: string;
  projectLabel: string | null;
  onClose: () => void;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => void | Promise<void>;
  onRefresh: () => void;
}) {
  const [edit, setEdit] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    stage: task.stage,
    assigneeId: task.assigneeId || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    labels: task.labels.join(', '),
    projectId: task.projectId || '',
  });
  const [comment, setComment] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [saving, setSaving] = useState(false);

  const saveEdits = async () => {
    setSaving(true);
    try {
      await onPatch({
        title: edit.title,
        description: edit.description,
        priority: edit.priority,
        stage: edit.stage,
        assigneeId: edit.assigneeId || null,
        dueDate: edit.dueDate || null,
        labels: edit.labels,
        projectId: edit.projectId || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await fetcher(`/api/kanban/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment.trim() }),
      });
      setComment('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const addChecklist = async () => {
    if (!checklistText.trim()) return;
    setSaving(true);
    try {
      await fetcher(`/api/kanban/${task.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ text: checklistText.trim() }),
      });
      setChecklistText('');
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = async (itemId: string, done: boolean) => {
    await fetcher(`/api/kanban/${task.id}/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    });
    onRefresh();
  };

  const removeChecklist = async (itemId: string) => {
    await fetcher(`/api/kanban/${task.id}/checklist/${itemId}`, { method: 'DELETE' });
    onRefresh();
  };

  const canDelete = isManager || task.createdBy === currentUserId;
  const doneCount = task.checklist.filter(i => i.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-marble-light border-l border-slate h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-marble-light border-b border-slate px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-ivory-muted">{task.id}</p>
            <p className="text-sm text-ivory-muted mt-0.5">
              Created {format(parseISO(task.createdAt), 'MMM d, yyyy')}
              {task.updatedAt !== task.createdAt && ` · Updated ${format(parseISO(task.updatedAt), 'MMM d')}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-ivory-muted hover:text-ivory rounded-lg hover:bg-charcoal/30">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <input
              value={edit.title}
              onChange={e => setEdit(ed => ({ ...ed, title: e.target.value }))}
              className="input-field text-lg font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="studio-kicker block mb-1">Stage</label>
              <select value={edit.stage} onChange={e => setEdit(ed => ({ ...ed, stage: e.target.value as KanbanStage }))} className="input-field text-sm">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="studio-kicker block mb-1">Priority</label>
              <select value={edit.priority} onChange={e => setEdit(ed => ({ ...ed, priority: e.target.value as KanbanPriority }))} className="input-field text-sm">
                {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="studio-kicker block mb-1">Due date</label>
              <input type="date" value={edit.dueDate} onChange={e => setEdit(ed => ({ ...ed, dueDate: e.target.value }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="studio-kicker block mb-1">Assignee</label>
              {isManager ? (
                <select value={edit.assigneeId} onChange={e => setEdit(ed => ({ ...ed, assigneeId: e.target.value }))} className="input-field text-sm">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <p className="text-sm text-ivory py-2">{assigneeName}</p>
              )}
            </div>
            {isManager && projects.length > 0 && (
              <div className="col-span-2">
                <label className="studio-kicker block mb-1">Project</label>
                <select value={edit.projectId} onChange={e => setEdit(ed => ({ ...ed, projectId: e.target.value }))} className="input-field text-sm">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {!isManager && projectLabel && (
              <div className="col-span-2">
                <label className="studio-kicker block mb-1">Project</label>
                <p className="text-sm text-ivory py-1">{projectLabel}</p>
              </div>
            )}
          </div>

          <div>
            <label className="studio-kicker block mb-1.5">Description</label>
            <textarea
              value={edit.description}
              onChange={e => setEdit(ed => ({ ...ed, description: e.target.value }))}
              className="input-field min-h-[100px] resize-none text-sm"
              placeholder="Add a description…"
            />
          </div>

          <div>
            <label className="studio-kicker block mb-1.5">Labels</label>
            <input
              value={edit.labels}
              onChange={e => setEdit(ed => ({ ...ed, labels: e.target.value }))}
              className="input-field text-sm"
              placeholder="Comma-separated labels"
            />
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {task.labels.map(l => (
                  <span key={l} className="text-xs px-2 py-1 rounded-md bg-charcoal text-ivory-muted">{l}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={saveEdits} disabled={saving} className="btn-primary text-sm flex-1">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {canDelete && (
              <button onClick={onDelete} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Checklist */}
          <div className="border-t border-slate pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-ivory flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Checklist
              </h4>
              {task.checklist.length > 0 && (
                <span className="text-xs text-ivory-muted">{doneCount}/{task.checklist.length} done</span>
              )}
            </div>
            {task.checklist.length > 0 && (
              <div className="h-1.5 bg-charcoal rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(doneCount / task.checklist.length) * 100}%` }} />
              </div>
            )}
            <div className="space-y-2 mb-3">
              {task.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleChecklist(item.id, !item.done)} className="shrink-0 text-ivory-muted hover:text-gold">
                    {item.done ? <CheckCircle2 className="w-4 h-4 text-gold" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <span className={cn('text-sm flex-1', item.done && 'line-through text-ivory-muted')}>{item.text}</span>
                  <button onClick={() => removeChecklist(item.id)} className="p-1 text-ivory-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={checklistText}
                onChange={e => setChecklistText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklist(); } }}
                placeholder="Add checklist item…"
                className="input-field text-sm flex-1"
              />
              <button onClick={addChecklist} disabled={saving || !checklistText.trim()} className="btn-secondary text-sm shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="border-t border-slate pt-5">
            <h4 className="text-sm font-semibold text-ivory flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" /> Comments ({task.comments.length})
            </h4>
            <div className="space-y-3 mb-4 max-h-[240px] overflow-y-auto">
              {task.comments.length === 0 ? (
                <p className="text-xs text-ivory-muted">No comments yet.</p>
              ) : (
                task.comments.map(c => (
                  <div key={c.id} className={cn('rounded-xl px-3 py-2.5', c.userId === currentUserId ? 'bg-charcoal/50 ml-4' : 'bg-charcoal/30')}>
                    <p className="text-[10px] font-semibold text-ivory-muted mb-1">{c.userName}</p>
                    <p className="text-sm text-ivory leading-relaxed">{c.content}</p>
                    <p className="text-[9px] text-ivory-muted mt-1">{format(parseISO(c.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && comment.trim()) { e.preventDefault(); addComment(); } }}
                placeholder="Write a comment…"
                className="input-field text-sm flex-1"
              />
              <button onClick={addComment} disabled={saving || !comment.trim()} className="btn-primary shrink-0 px-3">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}