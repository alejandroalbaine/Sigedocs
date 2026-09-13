import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { pool } from './db.js';
import { demoUsers } from './users.js';

if (!config.databaseUrl || !pool) {
  console.error('Defina DATABASE_URL en el archivo .env antes de inicializar PostgreSQL.');
  process.exit(1);
}

if (config.seedUserPassword.length < 12) {
  console.error('SEED_USER_PASSWORD debe tener al menos 12 caracteres.');
  process.exit(1);
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(currentDirectory, '..', 'database', 'schema.sql');
const schema = await fs.readFile(schemaPath, 'utf8');
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query(schema);

  for (const user of demoUsers) {
    const passwordHash = await bcrypt.hash(config.seedUserPassword, 12);
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, profile)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (email) DO NOTHING`,
      [
        user.id,
        user.email,
        passwordHash,
        user.fullName,
        user.role,
        user.isActive,
        JSON.stringify(user.profile)
      ]
    );
  }

  await client.query('COMMIT');
  console.log('Base de datos SIGESDOC inicializada correctamente.');
  console.log('Usuarios iniciales disponibles. La contraseña está en SEED_USER_PASSWORD del archivo .env.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
