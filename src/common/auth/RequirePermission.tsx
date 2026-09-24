import type { ReactNode } from 'react';
import { EmptyState } from '../components/EmptyState/EmptyState.tsx';
import { hasPermission, type Permission } from './permissions.ts';
import { useCurrentUser } from './SessionContext.ts';

export interface RequirePermissionProps {
  permission: Permission;
  /** Qué no puede hacer, p. ej. "consultar la trazabilidad". */
  action: string;
  children: ReactNode;
}

/** Sin el permiso muestra un estado explicativo; no redirige, igual que la interfaz anterior. */
export function RequirePermission({ permission, action, children }: RequirePermissionProps) {
  const user = useCurrentUser();
  if (hasPermission(user.permissions, permission)) return children;
  return (
    <EmptyState title="Sin permiso">
      Su cuenta no tiene permiso para {action}. Si lo necesita, solicítelo a la Mesa de Ayuda TI.
    </EmptyState>
  );
}
