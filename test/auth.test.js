import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.ALLOW_DEMO_MODE = 'true';

const { createApp } = await import('../src/app.js');

const app = createApp();

test('health confirma el modo de demostración', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.connected, true);
});

test('rechaza credenciales incorrectas sin revelar el dato fallido', async () => {
  const response = await request(app).post('/api/auth/login').send({
    email: 'archivista.central@uapa.edu.do',
    password: 'incorrecta-123'
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Correo o contraseña incorrectos.');
});

test('inicia sesión, protege el perfil y permite cerrar sesión', async () => {
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({
    email: 'archivista.central@uapa.edu.do',
    password: 'UapaSecure2024*',
    remember: false
  });

  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);

  const profile = await agent.get('/api/auth/me');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.role, 'Archivista / Gestor');

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 200);

  const expiredProfile = await agent.get('/api/auth/me');
  assert.equal(expiredProfile.status, 401);
});
