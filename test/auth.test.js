import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.ALLOW_DEMO_MODE = 'true';
process.env.API_BASE_URL = '';

const { createApp } = await import('../src/app.js');
const app = createApp();

test('estado usa el contrato de éxito data', async () => {
  const response = await request(app).get('/api/v1/status');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.connected, true);
});

test('validación devuelve Problem Details y señala el campo', async () => {
  const response = await request(app).post('/api/v1/sessions').send({
    email: 'correo-invalido',
    password: ''
  });
  assert.equal(response.status, 422);
  assert.match(response.headers['content-type'], /application\/problem\+json/);
  assert.equal(response.body.codigo, 'VALIDACION_FALLIDA');
  assert.deepEqual(response.body.errores.map(({ campo }) => campo), ['email', 'password']);
});

test('rechaza credenciales sin revelar qué dato falló', async () => {
  const response = await request(app).post('/api/v1/sessions').send({
    email: 'archivista.central@uapa.edu.do',
    password: 'incorrecta-123'
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.codigo, 'CREDENCIALES_INVALIDAS');
  assert.doesNotMatch(response.body.detail, /correo|contraseña/i);
});

test('inicia sesión, devuelve permisos efectivos y cierra con 204', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/sessions').send({
    email: 'archivista.central@uapa.edu.do',
    password: 'UapaSecure2024*',
    remember: false
  });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.equal(login.body.data.nombre, 'Lic. Mercedes Peña');
  assert.equal(login.body.data.perfil.iniciales, 'MP');
  assert.equal(login.body.data.perfil.initials, undefined);
  assert.ok(Array.isArray(login.body.data.permisos));
  assert.ok(login.body.data.permisos.includes('expedientes.editar'));
  assert.ok(login.body.data.permisos.includes('auditoria.consultar'));

  const profile = await agent.get('/api/v1/users/current');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.rol, 'Archivista / Gestor');
  assert.deepEqual(profile.body.data.permisos, login.body.data.permisos);

  const logout = await agent.delete('/api/v1/sessions/current');
  assert.equal(logout.status, 204);
  assert.equal(logout.text, '');

  const expiredProfile = await agent.get('/api/v1/users/current');
  assert.equal(expiredProfile.status, 401);
  assert.equal(expiredProfile.body.codigo, 'NO_AUTENTICADO');
});
