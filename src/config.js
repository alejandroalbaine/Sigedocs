import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const developmentSecret = 'sigesdoc-desarrollo-local-cambiar-en-produccion-2026';
const databaseUrl = process.env.DATABASE_URL?.trim() || '';
const jwtSecret = process.env.JWT_SECRET || developmentSecret;
const allowDemoMode = !databaseUrl && !isProduction && process.env.ALLOW_DEMO_MODE !== 'false';
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

if ((isProduction || databaseUrl) && (!process.env.JWT_SECRET || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET debe existir y tener al menos 32 caracteres.');
}

if (!databaseUrl && !allowDemoMode) {
  throw new Error('DATABASE_URL es obligatoria cuando el modo de demostración está desactivado.');
}

export const config = Object.freeze({
  port,
  isProduction,
  databaseUrl,
  databaseSsl: process.env.DB_SSL === 'true',
  jwtSecret,
  seedUserPassword: process.env.SEED_USER_PASSWORD || '',
  allowDemoMode,
  cookieName: 'sigesdoc_session',
  issuer: 'sigesdoc-uapa',
  audience: 'sigesdoc-web'
});
