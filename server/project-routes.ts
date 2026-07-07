import { Express, type Response } from 'express';
import { getDb, saveDb, getUserById, pushNotification } from './db';
import { AuthedRequest, requireRole } from './middleware';
import {
  normalizeProject,
  normalizeTask,
  syncProjectMeta,
  userCanAccessProject,
  projectWithStats,
  PROJECT_COLORS,
  type ProjectRecord,
  type ProjectTaskRecord,
  type TaskStage,
  type ProjectStatus,
  type ProjectPriority,
} from './project-management';

export function registerProjectRoutes(app: Express) {
  const db = () => getDb() as ReturnType<typeof getDb> & { projectTasks: ProjectTaskRecord[] };

  const getProject = (id: string) => {
    const p = db().projects.find(x => x.id === id);
    return p ? normalizeProject(p as ProjectRecord) : null;
  };

  const requireProjectAccess = (req: AuthedRequest, res: Response, project: ProjectRecord) => {
    const u = getUserById(req.userId!);
    if (!u || !userCanAccessProject(project, req.userId!, u.role)) {
      res.status(403).json({ error: 'You do not have access to this project' });
      return false;
    }
    return true;
  };

  const projectTasks = (projectId: string) =>
    db().projectTasks.filter(t => t.projectId === projectId);

  // List projects (scoped for employees)
  app.get('/api/projects', (req: AuthedRequest, res) => {
    const u = getUserById(req.userId!);
    if (!u) return res.status(401).json({ error: 'Unauthorized' });

    let list = db().projects.map(p => normalizeProject(p as ProjectRecord));
    if (u.role === 'employee') {
      list = list.filter(p => p.memberIds.includes(req.userId!));
    }
    list = list.filter(p => p.status !== 'archived');

    const enriched = list.map(p => projectWithStats(p, db().projectTasks, db().users));
    res.json(enriched);
  });

  // Single project with tasks
  app.get('/api/projects/:id', (req: AuthedRequest, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!requireProjectAccess(req, res, project)) return;

    const tasks = projectTasks(project.id).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    syncProjectMeta(project, tasks);
    res.json({
      ...projectWithStats(project, tasks, db().users),
      tasks,
    });
  });

  // Create project
  app.post('/api/projects', requireRole('manager', 'admin'), (req: AuthedRequest, res) => {
    const leadId = req.body.leadId || req.userId!;
    const memberIds: string[] = Array.isArray(req.body.memberIds) ? req.body.memberIds : [leadId];
    if (!memberIds.includes(leadId)) memberIds.unshift(leadId);

    const now = new Date().toISOString();
    const project = normalizeProject({
      id: `p${Date.now()}`,
      name: req.body.name?.trim() || 'Untitled Project',
      description: req.body.description || '',
      status: (req.body.status as ProjectStatus) || 'planning',
      priority: (req.body.priority as ProjectPriority) || 'medium',
      color: req.body.color || PROJECT_COLORS[db().projects.length % PROJECT_COLORS.length],
      client: req.body.client || '',
      startDate: req.body.startDate || now.split('T')[0],
      endDate: req.body.endDate || '',
      leadId,
      memberIds,
      milestones: [],
      createdAt: now,
      updatedAt: now,
    });

    db().projects.push(project);
    saveDb();

    for (const uid of memberIds) {
      if (uid !== req.userId) {
        pushNotification(uid, 'Project assigned', `You have been added to "${project.name}".`, { triggerId: 'projects.assigned' });
      }
    }

    res.json({ success: true, project: projectWithStats(project, [], db().users) });
  });

  // Update project
  app.patch('/api/projects/:id', (req: AuthedRequest, res) => {
    const idx = db().projects.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const project = normalizeProject(db().projects[idx] as ProjectRecord);
    const u = getUserById(req.userId!);
    const isLeadOrManager = u && (u.role === 'admin' || u.role === 'manager' || project.leadId === req.userId);
    if (!requireProjectAccess(req, res, project)) return;
    if (!isLeadOrManager && Object.keys(req.body).some(k => !['status'].includes(k))) {
      return res.status(403).json({ error: 'Only project lead or managers can edit project details' });
    }

    if (req.body.name) project.name = req.body.name.trim();
    if (req.body.description !== undefined) project.description = req.body.description;
    if (req.body.status) project.status = req.body.status;
    if (req.body.priority) project.priority = req.body.priority;
    if (req.body.color) project.color = req.body.color;
    if (req.body.client !== undefined) project.client = req.body.client;
    if (req.body.startDate) project.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) project.endDate = req.body.endDate;
    if (req.body.leadId) project.leadId = req.body.leadId;
    if (req.body.progress !== undefined && isLeadOrManager) {
      project.progress = Number(req.body.progress);
    }

    const tasks = projectTasks(project.id);
    syncProjectMeta(project, tasks);
    db().projects[idx] = project;
    saveDb();
    res.json({ success: true, project: projectWithStats(project, tasks, db().users) });
  });

  // Archive project
  app.delete('/api/projects/:id', requireRole('manager', 'admin'), (req, res) => {
    const p = db().projects.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    (p as ProjectRecord).status = 'archived';
    saveDb();
    res.json({ success: true });
  });

  // Team members
  app.post('/api/projects/:id/members', requireRole('manager', 'admin'), (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    const userId = req.body.userId;
    if (!userId || !getUserById(userId)) return res.status(400).json({ error: 'Invalid user' });

    const idx = db().projects.findIndex(x => x.id === project.id);
    const p = normalizeProject(db().projects[idx] as ProjectRecord);
    if (!p.memberIds.includes(userId)) {
      p.memberIds.push(userId);
      p.teamSize = p.memberIds.length;
      db().projects[idx] = p;
      saveDb();
      pushNotification(userId, 'Project assigned', `You have been added to "${p.name}".`, { triggerId: 'projects.assigned' });
    }
    res.json({ success: true, project: projectWithStats(p, projectTasks(p.id), db().users) });
  });

  app.delete('/api/projects/:id/members/:userId', requireRole('manager', 'admin'), (req, res) => {
    const idx = db().projects.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const p = normalizeProject(db().projects[idx] as ProjectRecord);
    p.memberIds = p.memberIds.filter(id => id !== req.params.userId);
    if (p.leadId === req.params.userId) p.leadId = p.memberIds[0] || '';
    p.teamSize = p.memberIds.length;
    db().projects[idx] = p;
    saveDb();
    res.json({ success: true, project: projectWithStats(p, projectTasks(p.id), db().users) });
  });

  // Milestones
  app.post('/api/projects/:id/milestones', (req: AuthedRequest, res) => {
    const idx = db().projects.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const p = normalizeProject(db().projects[idx] as ProjectRecord);
    if (!requireProjectAccess(req, res, p)) return;

    const milestone = {
      id: `ms${Date.now()}`,
      title: req.body.title?.trim() || 'Milestone',
      dueDate: req.body.dueDate || '',
      completed: false,
    };
    p.milestones.push(milestone);
    p.updatedAt = new Date().toISOString();
    db().projects[idx] = p;
    saveDb();
    res.json({ success: true, milestone, project: p });
  });

  app.patch('/api/projects/:id/milestones/:milestoneId', (req: AuthedRequest, res) => {
    const idx = db().projects.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const p = normalizeProject(db().projects[idx] as ProjectRecord);
    if (!requireProjectAccess(req, res, p)) return;

    const ms = p.milestones.find(m => m.id === req.params.milestoneId);
    if (!ms) return res.status(404).json({ error: 'Milestone not found' });
    if (req.body.title) ms.title = req.body.title;
    if (req.body.dueDate !== undefined) ms.dueDate = req.body.dueDate;
    if (req.body.completed !== undefined) ms.completed = !!req.body.completed;

    db().projects[idx] = p;
    saveDb();
    res.json({ success: true, milestone: ms });
  });

  // Project tasks
  app.get('/api/projects/:id/tasks', (req: AuthedRequest, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (!requireProjectAccess(req, res, project)) return;
    res.json(projectTasks(project.id));
  });

  app.post('/api/projects/:id/tasks', (req: AuthedRequest, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (!requireProjectAccess(req, res, project)) return;

    const existing = projectTasks(project.id);
    const task = normalizeTask({
      id: `pt${Date.now()}`,
      projectId: project.id,
      title: req.body.title?.trim() || 'Untitled task',
      description: req.body.description || '',
      stage: (req.body.stage as TaskStage) || 'todo',
      priority: (req.body.priority as ProjectPriority) || 'medium',
      assigneeId: req.body.assigneeId || null,
      dueDate: req.body.dueDate || null,
      labels: req.body.labels || [],
      order: existing.length,
      createdBy: req.userId!,
    });

    db().projectTasks.push(task);

    const idx = db().projects.findIndex(x => x.id === project.id);
    if (idx !== -1) {
      const p = normalizeProject(db().projects[idx] as ProjectRecord);
      syncProjectMeta(p, projectTasks(project.id));
      db().projects[idx] = p;
    }

    if (task.assigneeId && task.assigneeId !== req.userId) {
      pushNotification(task.assigneeId, 'Task assigned', `"${task.title}" in ${project.name}`, { triggerId: 'tasks.assigned' });
    }

    saveDb();
    res.json({ success: true, task });
  });

  app.patch('/api/projects/:projectId/tasks/:taskId', (req: AuthedRequest, res) => {
    const project = getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!requireProjectAccess(req, res, project)) return;

    const task = db().projectTasks.find(t => t.id === req.params.taskId && t.projectId === project.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const prevAssignee = task.assigneeId;
    if (req.body.title) task.title = req.body.title.trim();
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.stage) task.stage = req.body.stage;
    if (req.body.priority) task.priority = req.body.priority;
    if (req.body.assigneeId !== undefined) task.assigneeId = req.body.assigneeId || null;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
    if (req.body.labels) task.labels = req.body.labels;
    if (req.body.order !== undefined) task.order = req.body.order;

    const idx = db().projects.findIndex(x => x.id === project.id);
    if (idx !== -1) {
      const p = normalizeProject(db().projects[idx] as ProjectRecord);
      syncProjectMeta(p, projectTasks(project.id));
      if (p.progress === 100 && p.status === 'active') {
        p.status = 'completed';
        for (const uid of p.memberIds) {
          pushNotification(uid, 'Project completed', `"${p.name}" has been marked complete.`, { triggerId: 'projects.completed' });
        }
      }
      db().projects[idx] = p;
    }

    if (task.assigneeId && task.assigneeId !== prevAssignee && task.assigneeId !== req.userId) {
      pushNotification(task.assigneeId, 'Task assigned', `"${task.title}" in ${project.name}`, { triggerId: 'tasks.assigned' });
    }

    saveDb();
    res.json({ success: true, task });
  });

  app.delete('/api/projects/:projectId/tasks/:taskId', (req: AuthedRequest, res) => {
    const project = getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!requireProjectAccess(req, res, project)) return;

    const tidx = db().projectTasks.findIndex(t => t.id === req.params.taskId && t.projectId === project.id);
    if (tidx === -1) return res.status(404).json({ error: 'Task not found' });
    db().projectTasks.splice(tidx, 1);

    const idx = db().projects.findIndex(x => x.id === project.id);
    if (idx !== -1) {
      const p = normalizeProject(db().projects[idx] as ProjectRecord);
      syncProjectMeta(p, projectTasks(project.id));
      db().projects[idx] = p;
    }

    saveDb();
    res.json({ success: true });
  });
}