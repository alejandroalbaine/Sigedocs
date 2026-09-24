import { hasPermission, type Permission } from '../../common/auth/permissions.ts';

export interface NavItem {
  label: string;
  icon: string;
  /** Sin ruta: el módulo existe en el catálogo pero el backend aún no publica su contrato. */
  to?: string;
  /** Sin permiso: visible para cualquier usuario autenticado. */
  permission?: Permission;
}

/**
 * Correspondencia provisional opción → permiso (docs/integracion-api.md), pendiente de la
 * matriz oficial (ADR-010 del backend).
 */
export const NAVIGATION: readonly NavItem[] = [
  { label: 'Panel principal', icon: '⌂', to: '/' },
  { label: 'Gestión documental', icon: '▣', permission: 'expedientes.consultar' },
  { label: 'Registrar documento', icon: '＋', permission: 'expedientes.crear' },
  { label: 'Búsqueda avanzada', icon: '⌕', permission: 'expedientes.consultar' },
  { label: 'Detalle y revisión', icon: '▤', to: '/revision', permission: 'expedientes.aprobar' },
  { label: 'Observaciones', icon: '✎', to: '/observaciones', permission: 'expedientes.editar' },
  {
    label: 'Historial y trazabilidad',
    icon: '◷',
    to: '/historial',
    permission: 'auditoria.consultar',
  },
  { label: 'Reportes y estadísticas', icon: '▥', permission: 'auditoria.consultar' },
];

export function visibleNavigation(permissions: readonly string[]): NavItem[] {
  return NAVIGATION.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  );
}
