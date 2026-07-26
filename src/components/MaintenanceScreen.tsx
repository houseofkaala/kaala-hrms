import { Wrench } from 'lucide-react';
import { clearToken } from '../auth';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'ARIA is making changes to the HRMS. No one will be able to clock out today. Please use your email for communication.';

export function MaintenanceScreen({
  message = DEFAULT_MAINTENANCE_MESSAGE,
  showSignOut = false,
}: {
  message?: string;
  showSignOut?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-obsidian flex flex-col items-center justify-center p-6 text-center">
      <div className="studio-card max-w-lg w-full p-8 sm:p-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
          <Wrench className="w-8 h-8 text-amber-600" />
        </div>
        <p className="studio-kicker mb-2">Maintenance mode</p>
        <h1 className="text-2xl font-semibold text-ivory tracking-tight mb-4">
          By Marketing Only HRMS
        </h1>
        <p className="text-[15px] text-ivory leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <p className="text-sm text-ivory-muted mt-6">
          Contact your team by email while this update is in progress.
        </p>
        {showSignOut && (
          <button
            type="button"
            className="btn-secondary mt-6 text-sm"
            onClick={() => {
              clearToken();
              window.location.href = '/login';
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

export function MaintenanceBanner({ message }: { message: string }) {
  return (
    <div className="w-full bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-xl text-sm leading-relaxed mb-4">
      <strong className="font-semibold">Maintenance:</strong> {message}
    </div>
  );
}