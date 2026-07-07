import { runScheduledDigests } from './digest';

let started = false;

export function startNotificationScheduler(): void {
  if (started) return;
  started = true;

  // Check every 15 minutes for digest send windows (9 AM IST by server TZ)
  setInterval(() => {
    runScheduledDigests().catch(err => console.error('[HRMS Digest]', err));
  }, 15 * 60 * 1000);

  // Initial run after startup (catches missed window on restart)
  setTimeout(() => {
    runScheduledDigests().catch(err => console.error('[HRMS Digest]', err));
  }, 30_000);

  console.log('[HRMS] Email digest scheduler started');
}