/**
 * Catálogo de permisos del backend (migración 002_seguridad_base, notación `modulo.accion`).
 * Un código mal escrito en la interfaz no compila. La autorización real la hace el backend
 * en cada solicitud; ocultar una opción solo mejora la experiencia.
 */
export const PERMISSIONS = [
  'users.manage',
  'roles.manage',
  'templates.manage',
  'dossiers.create',
  'dossiers.edit',
  'dossiers.read',
  'observations.create',
  'audit.read',
  'security.read',
  'workflow.assign',
  'workflow.start_review',
  'workflow.request_changes',
  'workflow.approve_for_pilot',
  'workflow.resubmit',
  'workflow.start_reevaluation',
  'workflow.start_pilot',
  'workflow.evaluate_pilot',
  'workflow.request_post_pilot_changes',
  'workflow.finalize',
  'workflow.archive',
  'usuarios.administrar',
  'plantillas.administrar',
  'expedientes.crear',
  'expedientes.editar',
  'expedientes.consultar',
  'expedientes.aprobar',
  'auditoria.consultar',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const LEGACY_BY_CURRENT: Partial<Record<Permission, Permission>> = {
  'dossiers.read': 'expedientes.consultar',
  'dossiers.create': 'expedientes.crear',
  'dossiers.edit': 'expedientes.editar',
  'observations.create': 'expedientes.editar',
  'workflow.approve_for_pilot': 'expedientes.aprobar',
  'audit.read': 'auditoria.consultar',
  'templates.manage': 'plantillas.administrar',
};

export function normalizePermissions(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .filter((permission): permission is string => typeof permission === 'string')
      .map((permission) => permission.trim())
      .filter(Boolean),
  );
}

export function hasPermission(permissions: unknown, required: Permission): boolean {
  const effective = normalizePermissions(permissions);
  if (effective.has(required)) return true;
  const legacy = LEGACY_BY_CURRENT[required];
  return legacy ? effective.has(legacy) : false;
}
