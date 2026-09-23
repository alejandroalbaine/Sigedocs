import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicFiles = new URL('../public/', import.meta.url);

async function source(filename) {
  return readFile(new URL(filename, publicFiles), 'utf8');
}

test('los módulos no recuperan rutas de autenticación antiguas ni peticiones directas', async () => {
  for (const filename of ['dashboard.js', 'historial.js', 'observaciones.js', 'revision.js']) {
    const contents = await source(filename);
    assert.doesNotMatch(contents, /\/api\/auth\//, `${filename} contiene una ruta antigua`);
    assert.doesNotMatch(contents, /credentials\s*:\s*['"]same-origin['"]/, `${filename} usa credenciales antiguas`);
    assert.doesNotMatch(contents, /fetch\s*\(\s*['"`]\/api\//, `${filename} evita el cliente central`);
  }
});

test('las páginas integradas respetan CSP y cargan configuración antes de sus módulos', async () => {
  for (const filename of ['dashboard.html', 'historial.html', 'observaciones.html', 'revision.html']) {
    const contents = await source(filename);
    assert.doesNotMatch(contents, /<script[^>]+src=['"]https?:\/\//i, `${filename} carga scripts externos`);
    assert.doesNotMatch(contents, /\son[a-z]+\s*=/i, `${filename} contiene manejadores inline`);
    assert.ok(contents.indexOf('/runtime-config.js') < contents.indexOf('type="module"'));
  }
});

test('el dashboard vincula opciones funcionales con permisos efectivos', async () => {
  const html = await source('dashboard.html');
  for (const permission of [
    'expedientes.consultar', 'expedientes.consultar', 'expedientes.crear',
    'expedientes.aprobar', 'expedientes.editar',
    'auditoria.consultar', 'auditoria.consultar'
  ]) {
    assert.match(html, new RegExp(`data-permission="${permission}"`));
  }
  const script = await source('dashboard.js');
  assert.match(script, /applyPermissions\(/);
});
