import type { ReactNode } from 'react';
import { hasPermission, type Permission } from './permissions.ts';
import { useSession } from './SessionContext.ts';

/** Renderiza `children` solo si el usuario tiene el permiso. Nunca decide por nombre de rol. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useSession();
  return hasPermission(user?.permissions, permission) ? children : fallback;
}
