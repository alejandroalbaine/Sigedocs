# Integración del frontend con la API

> **Documento derivado (ADR-009 del backend).** No define el contrato: lo definen
> `endpoints.md`, `convenciones-api.md` y `respuestas-y-errores.md` de SIGESDOC_BACKEND.
> Aquí solo se describe cómo lo consume la interfaz.

## Rutas consumidas

| Operación                  | Método y ruta                                            | Validador                   |
| -------------------------- | -------------------------------------------------------- | --------------------------- |
| Estado del servicio        | `GET /api/v1/status`                                     | `parseStatus`               |
| Iniciar sesión             | `POST /api/v1/sessions`                                  | `parseLoginResponse`        |
| Identidad actual           | `GET /api/v1/users/current`                              | `parseCurrentUser`          |
| Cerrar sesión              | `DELETE /api/v1/sessions/current`                        | `204 No Content`            |
| Nombres de rol             | `GET /api/v1/roles`                                      | `parseRoles`                |
| Usuarios                   | `GET/POST /api/v1/users`, `PATCH /api/v1/users/{userId}` | `parseManagedUser(s)`       |
| Roles de un usuario        | `GET/PUT /api/v1/users/{userId}/roles`                   | `parseUserRoles`            |
| Especialistas para asignar | `GET /api/v1/users?roleCode=CURRICULUM_SPECIALIST`       | `parseSpecialists`          |
| Expedientes                | `GET/POST /api/v1/dossiers`, `GET /api/v1/dossiers/{id}` | `parseDossier(s)`           |
| Transiciones disponibles   | `GET /api/v1/dossiers/{id}/available-transitions`        | `parseAvailableTransitions` |
| Ejecutar transición        | `POST /api/v1/dossiers/{id}/transitions`                 | `parseTransitionResult`     |
| Historial de estados       | `GET /api/v1/dossiers/{id}/transitions`                  | `parseHistory`              |
| Asignación                 | `POST /api/v1/dossiers/{id}/assignments`                 | `parseAssignment`           |
| Observaciones              | `GET/POST /api/v1/dossiers/{id}/observations`            | `parseObservation(s)`       |
| Auditoría del expediente   | `GET /api/v1/dossiers/{id}/audit-events`                 | `parseAuditEvents`          |
| Versiones                  | `GET /api/v1/dossiers/{id}/versions`                     | `parseVersions`             |
| Detalle de una versión     | `GET/PATCH /api/v1/dossiers/{id}/versions/{versionId}`   | `parseVersionDetail`        |
| Plantilla de una versión   | `GET /api/v1/templates/{id}/versions/{versionId}`        | `parseTemplateVersion`      |

Las rutas de usuarios están en `src/common/api/users.ts` y `userContract.ts`; las de expedientes,
en `src/common/api/dossiers.ts` y `dossierContract.ts`, que también cubren el detalle y la edición de
una versión, la plantilla (`templatesApi`) y los catálogos.

El comparador de versiones (`src/features/versiones/`) no usa una ruta propia: pide el detalle
de las dos versiones y la plantilla de cada una (una sola vez si coinciden) y compara el contenido
en el navegador. Los elementos de un grupo repetible se emparejan por `itemId` y los valores de
catálogo por `value` (template-data-contract.md §7).

Las respuestas exitosas se leen desde `data`; las colecciones normalizan `meta.pagination`. Si la respuesta no cumple el contrato, el cliente
lanza `ApiError` con "respuesta no válida" y registra en consola qué campo falló.

## Identidad (ADR-005)

```ts
interface SessionUser {
  userId: string;
  name: string;
  email: string;
  unit: string | null; // el login no la envía; users/current la envía como null por ahora
  roles: string[]; // códigos, p. ej. ESPECIALISTA_CURRICULAR
  permissions: string[]; // códigos modulo.accion
}
```

- Login: `data = { sessionState, expiresAt, user }`.
- Identidad actual: `data = { user }`.
- Los nombres legibles de rol salen de `GET /api/v1/roles` (`code → name`). Durante REF-02 se
  aceptan también `codigo → nombre`. Si esa
  consulta falla, se muestran los códigos.

## Configuración por entorno

`VITE_API_BASE_URL` contiene solo el origen del backend:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Sin `/api/v1`, credenciales, parámetros ni fragmentos: el build falla si el valor no es un
origen válido. Vacío significa mismo origen (interfaz y API detrás del mismo proxy).

## Sesión entre orígenes (ADR-007)

Todas las solicitudes usan `credentials: 'include'`. El backend, por su parte:

- lista el origen exacto de la interfaz en `ALLOWED_ORIGINS` (en local, `http://localhost:5173`);
- responde con `Access-Control-Allow-Credentials: true`;
- emite la cookie `HttpOnly`, `SameSite=Lax` (y `Secure` en producción).

`localhost:5173` y `localhost:3000` son el mismo sitio, así que la cookie `Lax` viaja en
desarrollo. Si en producción interfaz y API quedan en dominios distintos, el backend debe
pasar a `SameSite=None` con HTTPS.

## Errores

Los errores llegan como Problem Details (`application/problem+json`). La interfaz decide por
`code` y nunca muestra `title` ni `detail`. Mientras concluye REF-02 acepta el alias documentado
`codigo`. Catálogo cubierto en `src/common/api/errors.ts`:

- Acceso: `CREDENCIALES_INVALIDAS`, `USUARIO_INACTIVO`, `USUARIO_SIN_ROL` (403).
- Sesión (ADR-006): `SESION_AUSENTE`, `SESION_EXPIRADA`, `SESION_INVALIDA`, `NO_AUTENTICADO`.
- Generales: `ACCESO_DENEGADO`, `VALIDACION_FALLIDA`, `SOLICITUD_MALFORMADA`,
  `DEMASIADOS_INTENTOS`, `RECURSO_NO_ENCONTRADO`.
- Disponibilidad: `SERVICIO_NO_DISPONIBLE`, `DEPENDENCIA_NO_DISPONIBLE`, `ERROR_INTERNO`.

Un código desconocido usa un mensaje genérico según el estado HTTP. Con `VALIDATION_FAILED`,
los campos de `errors` se marcan con `aria-invalid`; también se aceptan temporalmente
`VALIDACION_FALLIDA` y `errores`. El cliente espera como máximo diez segundos
y no reintenta.

Un 401 al verificar la sesión deja la interfaz sin sesión y `RequireSession` vuelve a `/login`
recordando la ruta pedida. Cualquier otro fallo (backend caído, respuesta inválida) muestra el
error con opción de reintentar, sin confundirlo con falta de sesión.

## Permisos

El catálogo está tipado en `src/common/auth/permissions.ts`. La interfaz usa los códigos finales
en inglés y reconoce los alias anteriores únicamente durante REF-02:

| Opción o acción                         | Permiso                                                |
| --------------------------------------- | ------------------------------------------------------ |
| Gestión documental · Búsqueda · Detalle | `dossiers.read`                                        |
| Registrar documento                     | `dossiers.create`                                      |
| Asignar especialista                    | `workflow.assign`                                      |
| Iniciar revisión · reevaluación         | `workflow.start_review`, `workflow.start_reevaluation` |
| Solicitar ajustes                       | `workflow.request_changes`                             |
| Aprobar para pilotaje                   | `workflow.approve_for_pilot`                           |
| Reenviar                                | `workflow.resubmit`                                    |
| Observaciones                           | `observations.create`                                  |
| Historial y trazabilidad · Reportes     | `audit.read`                                           |
| Usuarios y roles                        | `users.manage`                                         |

Los botones del flujo no los decide la interfaz: muestra solo las transiciones que el servidor
devuelve en `available-transitions` para ese usuario y ese estado.

La navegación está en `src/pages/layout/navigation.ts`. Ocultar opciones no es control de
acceso: el backend autoriza cada operación.

## Rutas que el backend aún no publica

Toda pantalla trata una respuesta `404` (o `501`) en una ruta confirmada como "en preparación":
muestra un aviso neutro, no un error en rojo, y no inventa datos. Los errores reales (sin conexión,
`500`, `403`) se siguen mostrando. El estado de cada ruta está en la tabla del README y lo que falta
del lado del servidor, en [pendientes-backend.md](pendientes-backend.md).

Para habilitar una ruta nueva: agregar la llamada y su validador al cliente, reproducir la
respuesta real en `src/test/backend.ts`, cubrirla con pruebas y recién entonces conectar la
pantalla.
