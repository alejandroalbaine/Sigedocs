import { hasPermission, type Permission } from '../../common/auth/permissions.ts';
import {
  BarChart3,
  ClipboardCheck,
  FileClock,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  SearchCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Sin ruta: el módulo existe en el catálogo pero el backend aún no publica su contrato. */
  to?: string;
  /** Sin permiso: visible para cualquier usuario autenticado. */
  permission?: Permission;
  /** Permisos adicionales que también se exigen (la pantalla consulta expedientes). */
  alsoRequires?: readonly Permission[];
}

/**
 * Correspondencia provisional opción → permiso (docs/integracion-api.md), pendiente de la
 * matriz oficial (ADR-010 del backend).
 */
export const NAVIGATION: readonly NavItem[] = [
  { label: 'Panel principal', icon: LayoutDashboard, to: '/' },
  {
    label: 'Gestión documental',
    icon: FolderKanban,
    to: '/expedientes',
    permission: 'dossiers.read',
  },
  {
    label: 'Registrar documento',
    icon: FilePlus2,
    to: '/expedientes/nuevo',
    permission: 'dossiers.create',
  },
  {
    label: 'Búsqueda avanzada',
    icon: SearchCheck,
    to: '/busqueda',
    permission: 'dossiers.read',
  },
  {
    label: 'Detalle y revisión',
    icon: ClipboardCheck,
    to: '/revision',
    permission: 'dossiers.read',
  },
  {
    label: 'Observaciones',
    icon: MessageSquareText,
    to: '/observaciones',
    permission: 'observations.create',
  },
  {
    label: 'Historial y trazabilidad',
    icon: FileClock,
    to: '/historial',
    permission: 'audit.read',
    alsoRequires: ['dossiers.read'],
  },
  {
    label: 'Reportes y estadísticas',
    icon: BarChart3,
    to: '/reportes',
    permission: 'audit.read',
    alsoRequires: ['dossiers.read'],
  },
  {
    label: 'Usuarios y roles',
    icon: UsersRound,
    to: '/usuarios',
    permission: 'users.manage',
  },
];

export function visibleNavigation(permissions: readonly string[]): NavItem[] {
  return NAVIGATION.filter(
    (item) =>
      (!item.permission || hasPermission(permissions, item.permission)) &&
      (item.alsoRequires ?? []).every((extra) => hasPermission(permissions, extra)),
  );
}
