import { copyFile, access } from 'node:fs/promises';
import process from 'node:process';

const requiredNodeMajor = 22;
const currentNodeMajor = Number(process.versions.node.split('.')[0]);

if (currentNodeMajor < requiredNodeMajor) {
  console.error(
    `Se necesita Node.js ${requiredNodeMajor} o superior. Versión actual: ${process.versions.node}.`,
  );
  process.exitCode = 1;
} else {
  try {
    await access('.env');
    console.log('El archivo .env ya existe; no se modificó.');
  } catch {
    await copyFile('.env.example', '.env');
    console.log('Se creó .env desde .env.example.');
  }

  console.log('Frontend preparado. Ejecute: npm run dev');
  console.log('Dirección: http://localhost:5173');
  console.log('API esperada: http://localhost:3000');
}
