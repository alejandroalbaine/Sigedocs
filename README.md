# SIGESDOC Frontend

Interfaz web de SIGESDOC, el Sistema de Gestión Documental Curricular de la Universidad
Abierta para Adultos (UAPA). Consume la API de
[SIGESDOC_BACKEND](https://github.com/ProyectosInstitucionalesUAPA/SIGESDOC_BACKEND); este
repositorio no contiene servidor ni acceso a base de datos.

## Estado

El frontend implementa el contrato MVP completo (`contratos/endpoints.md` §1–§9). Cada pantalla
funciona en cuanto el backend publica su ruta; mientras una ruta confirmada no exista, la pantalla
lo indica como "pendiente" y nunca muestra datos simulados. Lo que falta del lado del servidor está
en [docs/pendientes-backend.md](docs/pendientes-backend.md).

| Módulo                    | Rutas del contrato                                              | Backend `develop` (27/09) |
| ------------------------- | --------------------------------------------------------------- | ------------------------- |
| Acceso, sesión y permisos | `POST /sessions`, `GET /users/current`, `DELETE /sessions/...`  | Implementado              |
| Panel, gestión y búsqueda | `GET /dossiers`                                                 | Pendiente (DOS-01)        |
| Registro de expediente    | `POST /dossiers`                                                | Pendiente (DOS-01)        |
| Detalle y revisión        | `GET /dossiers/{id}`, `/versions`, `/available-transitions`     | Pendiente (DOS-02, WF-01) |
| Decisiones y flujo        | `POST /dossiers/{id}/transitions`                               | Pendiente (WF-02)         |
| Asignación                | `GET /users`, `POST /dossiers/{id}/assignments`                 | Pendiente (WF-03)         |
| Observaciones             | `GET/POST /dossiers/{id}/observations`                          | Pendiente (WF-04)         |
| Historial y trazabilidad  | `GET /dossiers/{id}/transitions`, `/audit-events`               | Pendiente (AUD-01)        |
| Reportes y Biblioteca UI  | Se calculan con `GET /dossiers`; exportación CSV/JSON local     | Pendiente (DOS-01)        |
| Usuarios y roles (CU-12)  | `GET/POST /users`, `PATCH /users/{id}`, `PUT /users/{id}/roles` | Pendiente (CORE-01/02)    |

Los expedientes que aparecen en capturas o videos anteriores provenían de un modo de prueba: el
backend todavía no expone `/dossiers`. Ninguna pantalla presenta como guardada una operación que
no se envió.

## Tecnologías

- React 19 + TypeScript (`strict`) sobre Vite.
- React Router en modo librería.
- CSS Modules con un único sistema de tokens (`src/common/styles/tokens.css`).
- Vitest + Testing Library.
- ESLint, Stylelint y Prettier con la misma configuración que el backend.

## Inicio rápido

Requisitos: Git, Node.js 22 (ver `.nvmrc`) y el backend ejecutándose en
`http://localhost:3000`.

1. Descargue y prepare el frontend:

```bash
git clone https://github.com/alejandroalbaine/Sigedocs.git
cd Sigedocs
git switch develop
npm ci
npm run setup
npm run dev
```

2. Abra <http://localhost:5173>. El comando `setup` crea `.env` desde `.env.example` sin
   sobrescribir una configuración existente.

3. En `SIGESDOC_BACKEND`, levante la API y PostgreSQL siguiendo su README. Para tener cuentas de
   prueba debe ejecutar su siembra con un `SEED_PASSWORD`. El backend debe permitir exactamente
   `http://localhost:5173` en `ALLOWED_ORIGINS`.

La aplicación puede abrir sin backend, pero el acceso y los datos reales necesitan la API. En
desarrollo, el login lista los correos de prueba; la contraseña es el `SEED_PASSWORD` utilizado en
el backend.

### Opción con Docker

El frontend puede ejecutarse en producción mediante Docker y Nginx.

Para construir la imagen y levantar el contenedor:

```bash
docker compose up --build
```

Abra <http://localhost:5173>.

El puerto `5173` del equipo se redirige al puerto `80` del contenedor, donde Nginx sirve el build de producción generado por Vite.

Para detener el contenedor:

```bash
docker compose down
```

La variable `VITE_API_BASE_URL` se configura durante el proceso de build. Por defecto utiliza:

```text
http://localhost:3000
```

El valor queda fijo dentro de la imagen. Para apuntar a otro backend hay que reconstruirla:

```bash
VITE_API_BASE_URL=https://api.ejemplo.edu.do docker compose up --build
```

El backend debe incluir el origen de la interfaz (`http://localhost:5173` en local) en `ALLOWED_ORIGINS`.
Docker ahora sirve el build de producción; para desarrollar con recarga en caliente use `npm run dev`.

Docker levanta únicamente el frontend. El backend continúa ejecutándose desde su propio repositorio.
En VS Code, `F5` levanta Vite y abre Chrome con el depurador conectado.

## Comandos

```bash
npm run dev           # Servidor de desarrollo
npm run setup         # Crea .env desde la plantilla si todavía no existe
npm run build         # Verificación de tipos y build de producción en dist/
npm run preview       # Sirve dist/ localmente
npm test              # Pruebas
npm run lint          # ESLint
npm run lint:css      # Stylelint (rechaza colores fuera de tokens.css)
npm run format        # Prettier
npm run typecheck     # TypeScript
npm run check         # Ejecuta todas las comprobaciones antes de un Pull Request
```

El CI ejecuta lint, estilos, formato, tipos, pruebas y build en cada cambio dirigido a `develop` o
`main`.

## Estructura

```text
src/
├── common/        Lo que usa más de una feature
│   ├── api/       Cliente HTTP, contrato del backend y errores
│   ├── auth/      Sesión, permisos, RequireSession, RequirePermission, <Can>
│   ├── charts/    Gráficos Canvas sin dependencias
│   ├── components/ Button, TextField, Field, Alert, Dialog, Card, DataTable…
│   ├── styles/    tokens.css y global.css
│   └── utils/     Formato de fechas, iniciales
├── features/      Unidades con lógica propia, por dominio
│   ├── autenticacion/
│   ├── observaciones/
│   ├── revision/
│   └── trazabilidad/
├── pages/         Una carpeta por ruta: Página.tsx, su CSS y su test
│   ├── Login/ Dashboard/ Gestion/ Registro/ Busqueda/ Reportes/ UiKit/
│   ├── Revision/ Observaciones/ Historial/ NotFound/ documental/
│   └── layout/    AppLayout, navegación por permisos, menú de perfil y page.module.css
├── router.tsx     Rutas (router.test.tsx prueba redirecciones y sesión)
└── main.tsx
```

Las reglas (dónde va cada cosa, idioma, estilos) están en [CONTRIBUTING.md](CONTRIBUTING.md).
El procedimiento sencillo para trabajar entre dos personas está en
[docs/flujo-git-colaboracion.md](docs/flujo-git-colaboracion.md).
La guía ampliada de instalación y solución de problemas está en
[docs/puesta-en-marcha.md](docs/puesta-en-marcha.md).

## Contrato con el backend

El contrato lo define el backend (ADR-009); la fuente son `SIGESDOC_BACKEND/docs`
(`endpoints.md`, `respuestas-y-errores.md` y `decisiones/`). `src/common/api/contract.ts` lo
refleja y **valida cada respuesta**: si el backend cambia la forma de un recurso, la interfaz
muestra "respuesta no válida" en lugar de fallar en silencio. Detalles de sesión, CORS,
errores y permisos en [docs/integracion-api.md](docs/integracion-api.md).
La última comparación formal con los archivos entregados está en
[docs/cumplimiento-contratos.md](docs/cumplimiento-contratos.md).

## Seguridad

- La sesión es una cookie `HttpOnly` del backend; el frontend nunca lee ni guarda tokens.
- Toda solicitud usa `credentials: 'include'` y el origen exacto de `VITE_API_BASE_URL`.
- El build inyecta una CSP como `<meta>` (`script-src 'self'`, `connect-src` limitado a la API).
  `nginx.conf` envía `frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options` y
  `Referrer-Policy`; HSTS lo debe enviar el hosting con HTTPS.
- Ocultar una opción por permisos es experiencia de usuario: el backend autoriza cada operación.
- Las variables `VITE_*` llegan al navegador; nunca contienen secretos.
