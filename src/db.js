import pg from 'pg';
import { config } from './config.js';
import { findDemoUser } from './users.js';

const { Pool } = pg;
const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      application_name: 'sigesdoc-api',
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 5_000,
      query_timeout: 6_000
    })
  : null;

function mapDatabaseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    profile: row.profile || {},
    permissions: Array.isArray(row.profile?.permissions) ? row.profile.permissions : []
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!pool) return findDemoUser(normalizedEmail);

  const result = await pool.query(
    `SELECT id, email, password_hash, full_name, role, is_active, profile
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [normalizedEmail]
  );
  return mapDatabaseUser(result.rows[0]);
}

export async function registerSuccessfulLogin({ userId, attemptedEmail, ipAddress, userAgent }) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
    await client.query(
      `INSERT INTO auth_events (user_id, attempted_email, event_type, ip_address, user_agent)
       VALUES ($1, $2, 'login_success', $3::inet, $4)`,
      [userId, attemptedEmail, ipAddress || null, userAgent || null]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function registerAuthEvent({ userId = null, attemptedEmail, eventType, ipAddress, userAgent }) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO auth_events (user_id, attempted_email, event_type, ip_address, user_agent)
     VALUES ($1, $2, $3, $4::inet, $5)`,
    [userId, attemptedEmail, eventType, ipAddress || null, userAgent || null]
  );
}

export async function databaseStatus() {
  if (!pool) return { mode: 'demo', connected: true };
  try {
    await pool.query('SELECT 1');
    return { mode: 'postgresql', connected: true };
  } catch {
    return { mode: 'postgresql', connected: false };
  }
}

export async function closeDatabase() {
  if (pool) await pool.end();
}

export { pool };
