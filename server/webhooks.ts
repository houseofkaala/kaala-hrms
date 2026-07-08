import { getDb } from './db';

export type WebhookEvent =
  | 'employee.created'
  | 'employee.deactivated'
  | 'leave.approved'
  | 'payroll.processed'
  | 'attendance.clock_in'
  | 'document.signed';

interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  const db = getDb() as ReturnType<typeof getDb> & { webhooks?: WebhookRecord[] };
  const hooks = (db.webhooks || []).filter(h => h.active && h.events.includes(event));
  if (!hooks.length) return;

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    hooks.map(async hook => {
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kaala-Event': event,
            'X-Kaala-Signature': hook.secret.slice(0, 8),
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) console.warn(`Webhook ${hook.id} returned ${res.status}`);
      } catch (err) {
        console.warn(`Webhook ${hook.id} failed:`, err);
      }
    }),
  );
}