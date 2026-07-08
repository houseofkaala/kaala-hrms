import type { UserRecord } from './db';
import { portalForRole } from './portal-config';

export function provisionNewEmployee(db: {
  onboardingTasks: { id: string; userId: string; title: string; description: string; status: string; dueDate: string; category: string }[];
  notifications: unknown[];
}, user: UserRecord) {
  const due = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const tasks = [
    { title: 'Complete your profile', description: 'Add phone, emergency contact, and address in Settings', category: 'HR', days: 3 },
    { title: 'Review company policies', description: 'Read policies in the Policies module', category: 'HR', days: 5 },
    { title: 'Security awareness training', description: 'Complete mandatory learning modules', category: 'Learning', days: 7 },
  ];

  for (const t of tasks) {
    db.onboardingTasks.push({
      id: `ob${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      title: t.title,
      description: t.description,
      status: 'Pending',
      dueDate: due(t.days),
      category: t.category,
    });
  }

}

export function portalLoginPath(role: UserRecord['role']) {
  return portalForRole(role);
}