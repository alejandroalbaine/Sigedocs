import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { closeDatabase, databaseStatus, findUserByEmail, pool } from '../src/db.js';

test('PostgreSQL responde y contiene el usuario inicial', { skip: !config.databaseUrl }, async () => {
  const status = await databaseStatus();
  assert.deepEqual(status, { mode: 'postgresql', connected: true });

  const user = await findUserByEmail('archivista.central@uapa.edu.do');
  assert.ok(user);
  assert.equal(user.role, 'Archivista / Gestor');
  assert.equal(await bcrypt.compare(config.seedUserPassword, user.passwordHash), true);

  const tables = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'auth_events')
      ORDER BY table_name`
  );
  assert.deepEqual(tables.rows.map((row) => row.table_name), ['auth_events', 'users']);
});

test.after(async () => {
  await closeDatabase();
});
