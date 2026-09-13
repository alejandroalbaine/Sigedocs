import { createApp } from './src/app.js';
import { config } from './src/config.js';
import { closeDatabase } from './src/db.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`SIGESDOC disponible en http://localhost:${config.port}`);
  console.log(`Modo de datos: ${config.databaseUrl ? 'PostgreSQL' : 'demostración local'}`);
});

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${signal}: cerrando SIGESDOC...`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  server.close(async () => {
    await closeDatabase();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
