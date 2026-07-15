import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ViewApiError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="studio-card p-6 border border-red-500/20 bg-red-50 dark:bg-red-950/30 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-700 dark:text-red-200">Could not load this section</p>
        <p className="text-xs text-red-600/90 dark:text-red-300/80 mt-1">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-xs font-semibold text-gold hover:opacity-80 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}