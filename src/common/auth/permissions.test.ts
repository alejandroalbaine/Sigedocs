import { hasPermission, normalizePermissions } from './permissions.ts';

test('normaliza únicamente permisos explícitos recibidos', () => {
  expect([
    ...normalizePermissions([' expedientes.consultar ', '', null, 'auditoria.consultar']),
  ]).toEqual(['expedientes.consultar', 'auditoria.consultar']);
  expect(normalizePermissions('ADMIN_SISTEMA').size).toBe(0);
});

test('comprueba permisos explícitos sin deducirlos del rol', () => {
  expect(hasPermission(['expedientes.aprobar'], 'expedientes.aprobar')).toBe(true);
  expect(hasPermission(['ADMIN_SISTEMA'], 'expedientes.aprobar')).toBe(false);
  expect(hasPermission(null, 'expedientes.aprobar')).toBe(false);
});
