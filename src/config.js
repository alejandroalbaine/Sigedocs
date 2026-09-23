import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const developmentSecret = 'sigesdoc-desarrollo-local-cambiar-en-produccion-2026';
const databaseUrl = process.env.DATABASE_URL?.trim() || '';
const jwtSecret = process.env.JWT_SECRET || developmentSecret;
const allowDemoMode = !databaseUrl && !isProduction && process.env.ALLOW_DEMO_MODE !== 'false';
const port = Number(process.env.PORT || 3000);
const apiBaseUrl = normalizeOrigin(process.env.API_BASE_URL || '', 'API_BASE_URL');
const cookieSameSite = process.env.COOKIE_SAME_SITE || 'strict';

function normalizeOrigin(value, name) {
  const normalized = String(value).trim();
  if (!normalized) return '';
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error(`${name} debe ser un origen HTTP o HTTPS válido.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} debe contener solo el origen, sin rutas ni credenciales.`);
  }
  return url.origin;
}

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

if ((isProduction || databaseUrl) && (!process.env.JWT_SECRET || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET debe existir y tener al menos 32 caracteres.');
}

if (!databaseUrl && !allowDemoMode) {
  throw new Error('DATABASE_URL es obligatoria cuando el modo de demostración está desactivado.');
}

if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE debe ser strict, lax o none.');
}

if (cookieSameSite === 'none' && !isProduction) {
  throw new Error('COOKIE_SAME_SITE=none requiere HTTPS y NODE_ENV=production.');
}

export const config = Object.freeze({
  port,
  isProduction,
  databaseUrl,
  databaseSsl: process.env.DB_SSL === 'true',
  jwtSecret,
  seedUserPassword: process.env.SEED_USER_PASSWORD || '',
  allowDemoMode,
  apiBaseUrl,
  cookieSameSite,
  cookieName: 'sigesdoc_session',
  issuer: 'sigesdoc-uapa',
  audience: 'sigesdoc-web'
});
