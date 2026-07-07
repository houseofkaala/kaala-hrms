import { getDb, saveDb, getUserById, pushNotification } from './db';
import { saveDocumentFile, getDocumentFilePath, deleteDocumentFile } from './document-storage';
import { generateMeetLink } from './algorithms';
import type { ProjectRecord } from './project-management';

export interface ProjectMessage {
  id: string;
  projectId: string;
  fromId: string;
  authorName: string;
  content: string;
  type: 'message' | 'file' | 'meet';
  attachmentName?: string;
  attachmentKey?: string;
  meetLink?: string;
  createdAt: string;
}

export function ensureProjectChat(project: ProjectRecord) {
  const db = getDb() as ReturnType<typeof getDb> & { projectMessages?: ProjectMessage[] };
  if (!db.projectMessages) db.projectMessages = [];
  const exists = db.projectMessages.some(m => m.projectId === project.id && m.type === 'message' && m.fromId === 'system');
  if (!exists) {
    db.projectMessages.push({
      id: `pm${Date.now()}`,
      projectId: project.id,
      fromId: 'system',
      authorName: 'House of Kaala',
      content: `Welcome to the "${project.name}" project room. Share updates, attach files, or schedule a Google Meet.`,
      type: 'message',
      createdAt: new Date().toISOString(),
    });
    saveDb();
  }
}

export function getProjectMessages(projectId: string): ProjectMessage[] {
  const db = getDb() as ReturnType<typeof getDb> & { projectMessages?: ProjectMessage[] };
  return (db.projectMessages || [])
    .filter(m => m.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function addProjectMessage(projectId: string, fromId: string, data: {
  content?: string;
  type?: 'message' | 'file' | 'meet';
  contentBase64?: string;
  mimeType?: string;
  fileName?: string;
}) {
  const db = getDb() as ReturnType<typeof getDb> & { projectMessages?: ProjectMessage[] };
  if (!db.projectMessages) db.projectMessages = [];
  const user = getUserById(fromId);
  const msg: ProjectMessage = {
    id: `pm${Date.now()}`,
    projectId,
    fromId,
    authorName: user?.name || 'User',
    content: data.content || '',
    type: data.type || 'message',
    createdAt: new Date().toISOString(),
  };

  if (data.type === 'meet') {
    msg.meetLink = generateMeetLink();
    msg.content = msg.content || 'Google Meet scheduled';
  }

  if (data.type === 'file' && data.contentBase64 && data.fileName) {
    const docId = `pchat${Date.now()}`;
    const saved = saveDocumentFile(docId, data.contentBase64, data.mimeType || 'application/pdf');
    msg.attachmentKey = saved.storageKey;
    msg.attachmentName = data.fileName;
    msg.content = msg.content || `Shared file: ${data.fileName}`;
  }

  db.projectMessages.push(msg);

  const project = db.projects.find(p => p.id === projectId);
  if (project) {
    for (const uid of (project as ProjectRecord).memberIds || []) {
      if (uid !== fromId) {
        pushNotification(uid, `Project: ${project.name}`, msg.content.slice(0, 80), { triggerId: 'projects.assigned' });
      }
    }
  }

  saveDb();
  return msg;
}

export function getProjectAttachmentPath(key: string | undefined) {
  return key ? getDocumentFilePath(key) : null;
}