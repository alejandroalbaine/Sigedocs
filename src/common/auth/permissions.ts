/**
 * Catálogo de permisos del backend (migración 002_seguridad_base, notación `modulo.accion`).
 * Un código mal escrito en la interfaz no compila. La autorización real la hace el backend
 * en cada solicitud; ocultar una opción solo mejora la experiencia.
 */
export const PERMISSIONS = [
  'usuarios.administrar',
  'plantillas.administrar',
  'expedientes.crear',
  'expedientes.editar',
  'expedientes.consultar',
  'expedientes.aprobar',
  'auditoria.consultar',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

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
  return normalizePermissions(permissions).has(required);
}
