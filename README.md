# SIGESDOC Frontend

Interfaz web de SIGESDOC, el Sistema de Gestión Documental Curricular de la Universidad
Abierta para Adultos (UAPA). Consume la API de
[SIGESDOC_BACKEND](https://github.com/ProyectosInstitucionalesUAPA/SIGESDOC_BACKEND); este
repositorio no contiene servidor ni acceso a base de datos.

## Estado

| Módulo                    | Estado                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Acceso, sesión y permisos | Integrado con el backend real (`/api/v1/sessions`, `/users/current`).             |
| Panel principal           | Indicadores y actividad alimentados por expedientes autorizados.                  |
| Gestión y búsqueda        | Integradas con `GET /api/v1/dossiers` y alcance por rol.                          |
| Registro de expediente    | Integrado con `POST /api/v1/dossiers`; código, versión y estado son del servidor. |
| Revisión de expediente    | Estructura visual lista; decisiones deshabilitadas hasta integrar transiciones.   |
| Registro de observaciones | Contrato conocido; escritura deshabilitada hasta implementar la ruta.             |
| Historial y trazabilidad  | Filtros y detalle listos; espera la ruta de auditoría documental.                 |
| Reportes y UI Kit         | Exportación local CSV/JSON activa; PDF/Excel oficial espera una ruta del backend. |

Los cinco expedientes locales usados para revisión son datos de desarrollo en PostgreSQL, no
constantes del frontend. Ninguna pantalla presenta como guardada una operación que no se envió.

## Tecnologías

- React 19 + TypeScript (`strict`) sobre Vite.
- React Router en modo librería.
- CSS Modules con un único sistema de tokens (`src/common/styles/tokens.css`).
- Vitest + Testing Library.
- ESLint, Stylelint y Prettier con la misma configuración que el backend.

## Puesta en marcha

Requisitos: Node.js 22 (ver `.nvmrc`) y el backend corriendo en local.

1. En `SIGESDOC_BACKEND`, levante la API y la base de datos siguiendo su README. Para tener una
   cuenta por rol, siembre los usuarios de prueba:
   `SEED_PASSWORD=<clave> node database/scripts/usuarios-prueba.mjs`.
   Su `.env` debe incluir `ALLOWED_ORIGINS=http://localhost:5173`.
2. En este repositorio:

   ```bash
   npm install
   cp .env.example .env   # VITE_API_BASE_URL=http://localhost:3000
   npm run dev
   ```

3. Abra <http://localhost:5173>. En desarrollo, el login lista los correos de prueba; la
   contraseña es el `SEED_PASSWORD` que usó al sembrarlos.

En VS Code, `F5` levanta Vite y abre Chrome con el depurador conectado.

## Comandos

```bash
npm run dev           # Servidor de desarrollo
npm run build         # Verificación de tipos y build de producción en dist/
npm run preview       # Sirve dist/ localmente
npm test              # Pruebas
npm run lint          # ESLint
npm run lint:css      # Stylelint (rechaza colores fuera de tokens.css)
npm run format        # Prettier
npm run typecheck     # TypeScript
```

El CI ejecuta lint, estilos, formato, tipos, pruebas y build en cada PR hacia `main`.

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
  `frame-ancestors`, HSTS y el resto de cabeceras las debe enviar el hosting.
- Ocultar una opción por permisos es experiencia de usuario: el backend autoriza cada operación.
- Las variables `VITE_*` llegan al navegador; nunca contienen secretos.
