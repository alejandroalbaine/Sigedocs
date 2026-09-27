# Puesta en marcha del frontend

## Método recomendado: Node.js

Instale Git y Node.js 22. Luego ejecute:

```bash
git clone https://github.com/alejandroalbaine/Sigedocs.git
cd Sigedocs
git switch develop
npm ci
npm run setup
npm run dev
```

Abra `http://localhost:5173`. No se necesita instalar extensiones obligatorias en Visual Studio
Code; el repositorio recomienda ESLint, Prettier y Stylelint automáticamente.

`npm ci` instala exactamente las versiones registradas en `package-lock.json`. No debe copiar
`node_modules` de otra computadora.

## Método alternativo: Docker

Con Docker Desktop iniciado:

```bash
docker compose up --build
```

Para comprobar el contenedor:

```bash
docker compose ps
```

Para detenerlo:

```bash
docker compose down
```

El contenedor incluye Node.js y las dependencias del frontend. Los cambios en el código local se
reflejan mediante Vite.

## Conexión con backend

El archivo `.env.example` configura:

```env
VITE_API_BASE_URL=http://localhost:3000
```

El backend debe estar disponible en ese origen y debe permitir
`ALLOWED_ORIGINS=http://localhost:5173`. Para comprobarlo:

```bash
curl http://localhost:3000/api/v1/status
```

La respuesta esperada contiene `data.status`. Si el frontend abre pero muestra un error de
conexión, normalmente el backend no está levantado o el origen no está autorizado.

## Cuentas de desarrollo

Los correos aparecen en la sección «Cuentas de prueba» del login. La contraseña no pertenece al
frontend: es el valor `SEED_PASSWORD` utilizado al sembrar SIGESDOC_BACKEND. Nunca se debe escribir
esa contraseña en este repositorio.

## Comprobación antes de trabajar

```bash
npm run check
```

Este comando valida formato, tipos, pruebas, JavaScript/TypeScript, CSS y compilación.

## Problemas comunes

### El puerto 5173 está ocupado

Detenga el servidor anterior con `Control + C`. Si utilizó Docker:

```bash
docker compose down
```

### La página abre, pero no permite iniciar sesión

Compruebe la API:

```bash
curl http://localhost:3000/api/v1/status
```

Confirme que frontend y backend usan `localhost`, no una mezcla de `localhost` y `127.0.0.1`,
porque CORS compara el origen exacto.

### Dependencias inconsistentes

No modifique `package-lock.json` manualmente. Ejecute nuevamente:

```bash
npm ci
```
