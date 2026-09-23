import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(currentDirectory, '..', '.env');

const jwtSecret = randomBytes(48).toString('hex');
const seedPassword = `Sigesdoc-${randomBytes(12).toString('hex')}`;

const content = `# Configuración privada local de SIGESDOC.
# No comparta ni confirme este archivo en Git.
PORT=3000
NODE_ENV=development

# Origen de la API, sin rutas. Vacío conserva la aplicación conjunta.
API_BASE_URL=
COOKIE_SAME_SITE=strict

JWT_SECRET=${jwtSecret}

# Complete esta dirección cuando backend entregue la conexión PostgreSQL.
DATABASE_URL=
DB_SSL=false

SEED_USER_PASSWORD=${seedPassword}
ALLOW_DEMO_MODE=true
`;

try {
  await fs.writeFile(envPath, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log('Archivo .env privado generado correctamente.');
} catch (error) {
  if (error.code === 'EEXIST') {
    console.log('El archivo .env ya existe; se conservó sin cambios.');
  } else {
    throw error;
  }
}
