import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBACStore } from '../store';
import { canAccessModule } from '../rbac';

export function ModuleGuard({ module, children }: { module: string; children: ReactNode }) {
  const { currentUser } = useRBACStore();
  if (!canAccessModule(currentUser, module)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}