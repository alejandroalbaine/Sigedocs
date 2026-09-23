import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPermissions, hasPermission, normalizePermissions } from '../public/permissions.js';

function option(permission) {
  return { dataset: { permission }, hidden: false };
}

test('normaliza únicamente permisos explícitos recibidos', () => {
  assert.deepEqual([...normalizePermissions([' expedientes.consultar ', '', null, 'auditoria.consultar'])], [
    'expedientes.consultar',
    'auditoria.consultar'
  ]);
  assert.equal(normalizePermissions('Administrador').size, 0);
});

test('comprueba permisos explícitos sin deducirlos del rol', () => {
  assert.equal(hasPermission(['expedientes.aprobar'], 'expedientes.aprobar'), true);
  assert.equal(hasPermission(['Administrador'], 'expedientes.aprobar'), false);
  assert.equal(hasPermission(null, 'expedientes.aprobar'), false);
});

test('muestra opciones por permiso y nunca por nombre de rol', () => {
  const expedientes = option('expedientes.consultar');
  const reportes = option('auditoria.consultar');
  const visible = applyPermissions([expedientes, reportes], ['expedientes.consultar']);
  assert.equal(visible, 1);
  assert.equal(expedientes.hidden, false);
  assert.equal(reportes.hidden, true);
});

test('un usuario sin permisos conserva el panel sin opciones funcionales', () => {
  const options = [option('expedientes.consultar'), option('auditoria.consultar')];
  assert.equal(applyPermissions(options, []), 0);
  assert.equal(options.every(({ hidden }) => hidden), true);
});
