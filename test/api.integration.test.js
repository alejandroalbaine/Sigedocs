import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApiClient } from '../public/api.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.ALLOW_DEMO_MODE = 'true';
process.env.API_BASE_URL = '';

const { createApp } = await import('../src/app.js');
const app = createApp();

function createTestClient(agent = request.agent(app)) {
  return createApiClient({
    fetchImpl: async (url, options) => {
      let pending = agent[options.method.toLowerCase()](url).set(options.headers);
      if (options.body !== undefined) pending = pending.send(options.body);
      const response = await pending;
      return new Response(response.status === 204 ? null : response.text, {
        status: response.status,
        headers: { 'Content-Type': response.headers['content-type'] || '' }
      });
    }
  });
}

test('completa login, identidad y logout con el contrato /api/v1', async () => {
  const client = createTestClient();
  const health = await client.request('health');
  assert.equal(health.connected, true);
  assert.equal(health.mode, 'demo');

  await assert.rejects(client.request('me'), (error) => error.code === 'NO_AUTENTICADO');
  await assert.rejects(client.request('login', {
    email: 'archivista.central@uapa.edu.do',
    password: 'incorrecta-123'
  }), (error) => error.code === 'CREDENCIALES_INVALIDAS');

  const login = await client.request('login', {
    email: 'archivista.central@uapa.edu.do',
    password: 'UapaSecure2024*',
    remember: false
  });
  assert.equal(typeof login.nombre, 'string');
  assert.ok(login.permisos.includes('expedientes.consultar'));

  const profile = await client.request('me');
  assert.deepEqual(profile.permisos, login.permisos);
  assert.equal(await client.request('logout'), null);
  await assert.rejects(client.request('me'), (error) => error.code === 'NO_AUTENTICADO');
});

test('expone configuración pública sin secretos y ajusta CSP', async () => {
  const response = await request(app).get('/runtime-config.js');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /javascript/);
  assert.equal(response.text, 'globalThis.SIGESDOC_CONFIG = Object.freeze({"API_BASE_URL":""});');
  assert.doesNotMatch(response.text, /JWT_SECRET|DATABASE_URL|password/i);
  assert.match(response.headers['content-security-policy'], /connect-src 'self'/);
});

test('sirve páginas y módulos JavaScript requeridos', async () => {
  const pages = [
    ['/', '/login.js'],
    ['/dashboard.html', '/dashboard.js'],
    ['/historial.html', '/historial.js'],
    ['/observaciones.html', '/observaciones.js'],
    ['/revision.html', '/revision.js']
  ];
  for (const [page, script] of pages) {
    const response = await request(app).get(page);
    assert.equal(response.status, 200);
    assert.ok(response.text.includes('<script src="/runtime-config.js"></script>'));
    const scriptTag = response.text.match(new RegExp(`<script\\b[^>]*\\bsrc="${script}"[^>]*><\\/script>`))?.[0];
    assert.ok(scriptTag, `${page} debe cargar ${script}`);
    assert.match(scriptTag, /\btype="module"/);
  }
  for (const filename of [
    'config.js', 'api.js', 'permissions.js', 'session.js', 'charts.js',
    'login.js', 'dashboard.js', 'historial.js', 'observaciones.js', 'revision.js'
  ]) {
    const response = await request(app).get('/' + filename);
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /javascript/);
  }
});
