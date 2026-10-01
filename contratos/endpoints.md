# Endpoints principales por dominio

> **Copia de referencia en el frontend.** Sincronizada el 30/09/2026 con
> `SIGESDOC_BACKEND/docs/endpoints.md` (develop). La fuente vigente es la del backend.

**Estado:** Contrato MVP vigente (sección siguiente) + contrato por dominio — condensado de `02_ENDPOINTS_PRINCIPALES_POR_DOMINIO.md`, actualizado con el ticket #55 y con los ADR-011 a 015. El estado de requisitos de las tablas no implica implementación. Todas las rutas contractuales siguen [api-conventions.md](api-conventions.md) y comienzan con `/api/v1`. La matriz completa de trazabilidad RF/RNF está en el documento fuente; aquí solo el contrato de endpoints.

> **Identificadores en inglés ([ADR-011](decisions/ADR-011-english-naming-standard.md)).** Desde REF-02 la implementación usa el contrato de este documento: `meta` en inglés, campo `code` y `type: /problems/<slug>` en Problem Details, y códigos de error, de rol y de permiso en inglés. La correspondencia con los nombres anteriores está en [naming-glossary.md](naming-glossary.md) §4, §6 y §7.

Reglas comunes a todo el contrato:

- Todo `GET` de colección admite paginación, filtros y orden documentados (allowlist).
- Toda ruta con ID requiere autorización a nivel de objeto.
- Los cuerpos solo aceptan propiedades permitidas (sin actor, rol, estado o auditoría como datos enviados por el cliente).
- No hay `DELETE` ordinario para expedientes, versiones, evidencias ni auditoría.

## Contrato MVP — Tarea 4 (vigente)

**Estado:** Confirmado para implementar. **Esta sección manda** sobre las tablas por dominio de más abajo para los recursos que cubre. Rutas, parámetros, propiedades, envoltura y códigos van en **inglés** ([ADR-011](decisions/ADR-011-english-naming-standard.md)).

Reglas de toda esta sección:
- Todas las rutas empiezan con `/api/v1` y exigen sesión, salvo que se indique lo contrario.
- **El cliente nunca envía** actor, fechas, estado ni códigos generados. Los deriva el servidor.
- Colecciones paginadas: query `limit` (por defecto 25, máximo 100) y `cursor`; respuesta en `meta.pagination`.
- Sin alcance sobre el expediente → `404`; con alcance pero sin permiso → `403` ([ADR-015](decisions/ADR-015-object-level-authorization.md)).
- Errores nuevos: `CONFLICT` (409), `INVALID_TRANSITION` (409), `IMMUTABLE_VERSION` (409), `NO_VALID_TEMPLATE_VERSION` (409). Validación: `VALIDATION_FAILED` (422) con `errors[]` por campo.

### 1. Acceso (implementado)

| Método | Ruta | Notas |
|---|---|---|
| `POST` | `/sessions` | Pública. Login |
| `GET` | `/users/current` | Identidad y `permissions` efectivos (#57) |
| `DELETE` | `/sessions/current` | `204` |
| `GET` | `/status` | Pública |

### 2. Usuarios y roles — CORE-01, CORE-02

| Método | Ruta | Permiso | Body / Query | Respuesta |
|---|---|---|---|---|
| `GET` | `/users` | `users.manage` | `?isActive&roleCode&search&limit&cursor` | `200` `User[]` |
| `POST` | `/users` | `users.manage` | `{ name, email, password, roleCodes[], schoolCode? }` | `201` `User` |
| `GET` | `/users/{userId}` | `users.manage` | — | `200` `User` |
| `PATCH` | `/users/{userId}` | `users.manage` | `{ name?, isActive?, schoolCode? }` | `200` `User` |
| `GET` | `/users/{userId}/roles` | `users.manage` | — | `200` `Role[]` |
| `PUT` | `/users/{userId}/roles` | `users.manage` | `{ roleCodes[] }` (reemplaza) | `200` `User` |
| `GET` | `/roles` | pública (implementada) | — | `200` `Role[]` |
| `GET` | `/roles/{roleId}/permissions` | `roles.manage` | — | `200` `{ code, description }[]` |
| `PUT` | `/roles/{roleId}/permissions` | `roles.manage` | `{ permissionCodes[] }` (reemplaza) | `200` `{ code, description }[]` |

```json
// User
{ "userId": "uuid", "name": "…", "email": "x@uapa.edu.do", "isActive": true, "schoolCode": "ESC-ING" ,
  "roles": [{ "roleId": "uuid", "code": "PROGRAM_COORDINATOR", "name": "Encargado o Coordinador de Programa/Maestría" }],
  "createdAt": "2026-09-25T14:00:00Z" }
```

Reglas: correo duplicado → `409 CONFLICT`; nadie cambia sus propios roles ni permisos (`403`); desactivar un usuario revoca sus sesiones; `schoolCode` es obligatorio si tiene `SCHOOL_DIRECTOR`.

**Estado:** implementado (RF-01, CORE-01, CORE-02), salvo `/roles/{roleId}/permissions`. Detalles:
- `POST /users` crea la cuenta activa. `email` debe ser `@uapa.edu.do` y `password` sigue la política del inicio de sesión (8 a 128 caracteres). `roleCodes` exige al menos un rol, y responde `201` con `Location`.
- `GET /users` ordena por `createdAt:desc` y pagina con `meta.pagination`. `search` busca sin distinguir mayúsculas en nombre y correo.
- `PUT /users/{userId}/roles` acepta `roleCodes: []`, que retira todos los roles.
- Validación: una propiedad o parámetro no documentado responde `422`, con `errors[].code` `UNKNOWN_FIELD`. Un código de rol inexistente también responde `422`, con `UNKNOWN_ROLE`.
- Un `userId` que no existe o no es un UUID responde `404`.
- Ninguna respuesta incluye la contraseña ni su hash. No hay `DELETE /users/{userId}`: la baja es `PATCH { isActive: false }`.

### 3. Plantillas y catálogos (solo lectura en el MVP) — TPL-01

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/templates` | `200` `{ templateId, code, name, academicLevels }[]` |
| `GET` | `/templates/{templateId}/versions?status=published&validOn=YYYY-MM-DD` | `200` versiones (sin secciones); con `validOn` devuelve la vigente |
| `GET` | `/templates/{templateId}/versions/{templateVersionId}` | `200` definición completa ([template-data-contract.md](template-data-contract.md) §3) |
| `GET` | `/institutional-catalogs/{catalog}` | `200` `{ value, label }[]` (valores provisionales) |

La escritura de plantillas (crear versiones, secciones, campos y publicar) está en la sección [Plantillas](#plantillas-template-engine). **Estado:** las rutas de `/templates` de esta tabla están implementadas (TPL-01, [templates.md](templates.md)); `/institutional-catalogs` sigue pendiente, y las secciones y campos como recursos propios están implementados (TPL-02).

### 4. Expedientes — DOS-01

| Método | Ruta | Permiso | Body / Query | Respuesta |
|---|---|---|---|---|
| `POST` | `/dossiers` | `dossiers.create` | `{ title, academicLevel, schoolCode, degreeProgramCode, subjectCode }` | `201` `Dossier` (con la v1.0 creada en `RECEIVED`) |
| `GET` | `/dossiers` | `dossiers.read` + alcance | `?academicLevel&schoolCode&degreeProgramCode&currentState&search&limit&cursor` | `200` `Dossier[]` |
| `GET` | `/dossiers/{dossierId}` | `dossiers.read` + alcance | — | `200` `Dossier` |
| `PATCH` | `/dossiers/{dossierId}` | `dossiers.edit` + alcance | `{ title?, subjectCode? }`, solo en un estado editable | `200` `Dossier` |

```json
// Dossier
{ "dossierId": "uuid", "code": "ECD-2026-0001", "title": "Ingeniería de Software I",
  "documentType": "course_program", "academicLevel": "bachelor",
  "schoolCode": "ESC-ING", "degreeProgramCode": "ISW", "subjectCode": "ISW-201",
  "workflowId": "uuid",
  "currentState": { "code": "RECEIVED", "name": "Recepcionado", "isEditable": true },
  "currentVersion": { "versionId": "uuid", "label": "v1.0" },
  "template": { "templateId": "uuid", "templateVersionId": "uuid" },
  "assignedSpecialist": null,
  "createdBy": { "userId": "uuid", "name": "…" }, "createdAt": "…" }
```

Sin versión de plantilla vigente → `409 NO_VALID_TEMPLATE_VERSION`. `academicLevel` ∈ `associate` | `bachelor` (en el MVP no se admite `graduate`).

**Estado:** implementado (DOS-01). Detalles:
- `code` lo genera el servidor (`ECD-<año>-<secuencia>`, secuencia global `dossier_code_seq`); la versión de plantilla es la publicada vigente hoy para `course_program` que cubre el nivel, y el flujo, el del nivel (hoy `UNDERGRAD`). El creador queda en `dossier_participants`.
- El alcance es el de [ADR-015](decisions/ADR-015-object-level-authorization.md) §1, en `DossierAccessPolicy`. `CURRICULUM_SPECIALIST` no ve expedientes hasta WF-03 (asignaciones). Quien registra tiene que quedar dentro de su propio alcance: una `SCHOOL_DIRECTOR` que envía otra escuela recibe `422` con `errors[].code = OUT_OF_SCOPE` en `schoolCode`.
- `GET /dossiers`: `search` busca sin distinguir mayúsculas en `code`, `title` y `subjectCode`; `currentState` es el código del estado de la última versión. Orden `createdAt:desc, dossierId:desc`, paginado por cursor.
- `PATCH`: nivel, escuela y carrera no cambian (deciden el flujo y el alcance) → `422 UNKNOWN_FIELD`. Fuera de un estado editable → `409 IMMUTABLE_VERSION`.

### 5. Versiones y contenido del programa — DOS-02

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| `GET` | `/dossiers/{dossierId}/versions` | `dossiers.read` | — | `200` `{ versionId, label, state, createdBy, createdAt, approvedAt }[]` |
| `GET` | `/dossiers/{dossierId}/versions/{versionId}` | `dossiers.read` | — | `200` lo anterior + `templateVersionId`, `content` |
| `PATCH` | `/dossiers/{dossierId}/versions/{versionId}` | `dossiers.edit` | `{ content }` (completo, [template-data-contract.md](template-data-contract.md) §7) | `200` versión |

**Estado:** implementado (DOS-02).

Solo se edita la **última** versión y solo en un estado con `isEditable` (`RECEIVED`, `CHANGES_REQUIRED`); si no → `409 IMMUTABLE_VERSION`. Se valida en modo borrador (se aceptan campos incompletos, pero no tipos incorrectos ni claves desconocidas).

### 6. Workflow, transiciones e historial — WF-01, WF-02

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| `GET` | `/workflows/{workflowId}/states` | sesión | — | `200` estados ([ADR-014](decisions/ADR-014-undergraduate-workflow.md) §2) |
| `GET` | `/workflows/{workflowId}/transitions` | sesión | — | `200` transiciones (§3) |
| `GET` | `/dossiers/{dossierId}/available-transitions` | `dossiers.read` | — | `200` transiciones que **este usuario** puede ejecutar ahora: `{ transitionId, code, name, toState, requiresObservation }[]` |
| `POST` | `/dossiers/{dossierId}/transitions` | el de la transición | `{ transitionId, versionId, observation? }` | `201` `{ historyId, fromState, toState, versionId, newVersionId, occurredAt }` |
| `GET` | `/dossiers/{dossierId}/transitions` | `dossiers.read` | — | `200` historial: `{ historyId, transition, fromState, toState, versionLabel, user, observation, occurredAt }[]` |

`newVersionId` solo viene cuando la transición crea versión (devoluciones, ADR-013). Errores: no sale del estado actual → `409 INVALID_TRANSITION`; `versionId` no es la última → `409 CONFLICT`; falta la observación obligatoria → `422`; al pasar a revisión con contenido incompleto → `422` con los campos.

**Estado:** implementado (WF-02, migración `013_direct_dossier_transitions`). Detalles:
- **Transiciones.** Se ejecutan todas las del flujo `UNDERGRAD` salvo `ASSIGN` (T1), que solo se ejecuta al asignar una especialista (§7); por esta ruta responde `409 INVALID_TRANSITION`. Las cinco transiciones marcadas como inferidas en ADR-014 siguen pendientes de validar con Gestión Curricular.
- **Validaciones, bajo el bloqueo del expediente.** Alcance de [ADR-015](decisions/ADR-015-object-level-authorization.md) (fuera de alcance → `404`), permiso de la transición leído de la base (`403`), estado de origen (`409 INVALID_TRANSITION`) y `versionId` igual a la última versión (`409 CONFLICT`). Otro usuario que cambie el expediente al mismo tiempo → `409` (RNF-21). `observation`: de 1 a 5000 caracteres.
- **`START_REVIEW` (T2).** Valida el contenido en modo `submission` contra su versión de plantilla ([templates.md](templates.md) §6); si falta algo, `422` con la ruta de cada campo y no cambia nada.
- **Devoluciones** (`REQUEST_CHANGES`, `REQUEST_CHANGES_AGAIN`, `REQUEST_POST_PILOT_CHANGES`), en una sola transacción y como pide [ADR-013](decisions/ADR-013-dossier-lifecycle-and-versioning.md) (doc. base, fases 10 y 11: el dictamen queda sobre la versión revisada): 1) la observación obligatoria se guarda en `observations` (§8) sobre la versión revisada; 2) se crea `v<major>.<minor+1>` en `CHANGES_REQUIRED` con el mismo contenido y versión de plantilla; 3) la versión revisada pasa a `CHANGES_REQUIRED` y queda congelada. El historial registra la transición sobre la versión revisada (con su observación); la versión nueva aparece como alta. La respuesta trae `versionId` (la revisada) y `newVersionId`.
- **`ARCHIVE_IMPLEMENT` (T13).** Es el único cambio que se admite sobre una versión ya aprobada: solo el estado, sin tocar contenido ni sello (resuelve la discrepancia 32).

### 7. Asignación para revisión — WF-03

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| `POST` | `/dossiers/{dossierId}/assignments` | `workflow.assign` | `{ specialistId }` | `201` `{ assignmentId, specialist, assignedBy, assignedAt }` |
| `GET` | `/dossiers/{dossierId}/assignments` | `dossiers.read` | — | `200` historial de asignaciones |

Si el expediente está en `RECEIVED`, ejecuta T1 (`ASSIGN`) en la misma transacción. Reasignar deja la anterior en el historial. `specialistId` debe ser un usuario activo con `CURRICULUM_SPECIALIST` (si no → `422`).

### 8. Observaciones — WF-04

| Método | Ruta | Permiso | Body | Respuesta |
|---|---|---|---|---|
| `POST` | `/dossiers/{dossierId}/observations` | `observations.create` | `{ versionId, sectionKey?, fieldKey?, itemId?, text }` | `201` `Observation` |
| `GET` | `/dossiers/{dossierId}/observations` | `dossiers.read` | `?versionId&limit&cursor` | `200` `Observation[]` |

Solo se observa una versión en `IN_REVIEW` o `IN_REEVALUATION`. Las observaciones no se editan ni se borran.

**Estado:** implementado (WF-04, migración `012_observations`). Forma acordada con frontend:

```json
{
  "observationId": "…",
  "dossierId": "…",
  "version": { "versionId": "…", "label": "v1.0" },
  "sectionKey": "competencias_fundamentales",
  "fieldKey": "competencias_fundamentales",
  "itemId": "…",
  "text": "La competencia CF1 necesita un resultado medible.",
  "createdBy": { "userId": "…", "name": "…" },
  "createdAt": "2026-09-30T12:00:00.000Z"
}
```

- **Destino.** `sectionKey`, `fieldKey` e `itemId` son opcionales (se pueden omitir o enviar en `null`); sin ninguno es una observación general. `fieldKey` exige `sectionKey` y `itemId` exige `fieldKey` (si no, `422` con `REQUIRED`). La sección tiene que estar activa en la versión de plantilla de la versión observada y el campo pertenecer a esa sección (si no, `422` con `errors[].code = UNKNOWN_FIELD`). `itemId` tiene que ser un elemento de ese campo `repeatable_group` en el contenido de la versión, en cualquier nivel (si no, `UNKNOWN_ITEM`). Es el identificador que generó el cliente: normalmente un UUID (se compara sin distinguir mayúsculas), pero se acepta cualquier texto de hasta 200 caracteres, igual que en la validación del contenido ([templates.md](templates.md) §6). `text`: de 1 a 5000 caracteres, sin espacios sobrantes.
- **Versión y estado.** `versionId` tiene que ser la última versión del expediente y estar en `IN_REVIEW` o `IN_REEVALUATION`; en otro caso `409 CONFLICT`. Una versión de otro expediente recibe el mismo `409`. El alta bloquea la versión: si una transición la mueve al mismo tiempo, la observación no se guarda (`409`).
- **Alcance.** Sin alcance sobre el expediente → `404`, también en el `GET` ([ADR-015](decisions/ADR-015-object-level-authorization.md)). `CURRICULUM_SPECIALIST` observa los expedientes que tenga asignados cuando WF-03 le dé ese alcance.
- **Respuesta.** El `POST` no devuelve `Location`: una observación no tiene ruta propia. El `GET` va en orden `createdAt:asc, observationId:asc`, paginado por cursor; `versionId` limita a una versión (una versión que no es del expediente devuelve la colección vacía).
- **T3 (`REQUEST_CHANGES`).** La observación obligatoria de la devolución se guarda en esta tabla, en la misma transacción y **antes** de crear la nueva versión (`createIncrementedVersionService`) y de cambiar el estado, porque después la versión observada ya no es la última. `PostgresObservationRepository` recibe el cliente de esa transacción. `state_history.observation` queda solo como resumen.
- **Cronología.** La tabla guarda `dossier_id` (FK compuesta con la versión) y el trigger `log_observation_change` usa `log_dossier_record_change('created_by')` de `011_dossier_audit_trail`, así cada alta queda en `audit_log` y `GET /dossiers/{dossierId}/audit-events` la muestra como `observation_added`. Los triggers de la tabla rechazan `UPDATE`, `DELETE` y `TRUNCATE`.

### 9. Trazabilidad — AUD-01

| Método | Ruta | Permiso | Query | Respuesta |
|---|---|---|---|---|
| `GET` | `/dossiers/{dossierId}/audit-events` | `audit.read` o alcance | `?type&from&to&versionId&limit&cursor` | `200` `{ eventId, type, occurredAt, user, versionLabel, summary }[]` |

`type` ∈ `dossier_created`, `version_created`, `content_updated`, `state_changed`, `assigned`, `observation_added`. Solo lectura ([ADR-016](decisions/ADR-016-authentication-and-audit-events.md)).

**Estado:** implementado (AUD-01). Detalles:
- **Acceso:** la política de la ruta es `requireSession`; el acceso lo da `audit.read` (cualquier expediente) o el alcance de [ADR-015](decisions/ADR-015-object-level-authorization.md) §1. Sin ninguno de los dos, o si el expediente no existe o el id está mal formado → `404`.
- **Orden:** cronológico ascendente (`occurredAt`), paginado por cursor como `/users` (`meta.pagination`, `limit` 25 por omisión, máximo 100). Los eventos de una misma transacción comparten `occurredAt` y siguen el orden causal: el alta antes que su v1.0, la asignación antes que la transición que provoca y la transición antes que la versión que crea una devolución.
- **Filtros:** `type` (uno de los seis), `versionId` (UUID; excluye los eventos sin versión: `dossier_created`, `assigned` y los cambios de metadatos) y `from`/`to`, ambos inclusivos, como fecha (`2026-09-30`, día UTC completo) o instante con zona (`2026-09-30T14:00:00-04:00`). `from` posterior a `to`, un tipo desconocido o un parámetro fuera de la lista → `422`.
- **Respuesta:** `user` es `{ userId, name }` (o `null` si la bitácora no registró el usuario); `versionLabel` es `v<major>.<minor>` o `null`; `summary` es un texto en español calculado por el servidor (qué metadatos o secciones cambiaron, estados y transición, especialista asignada, sección observada). **Nunca** se devuelven `before_data`/`after_data` ni el contenido, el título anterior o el texto de una observación.
- **Fuentes** (todas de solo anexado): `audit_log` de `dossiers` (alta y `PATCH` de título o clave → `content_updated` sin versión), `audit_log` de `dossier_versions` (alta → `version_created`; cambio de `content` → `content_updated`), `state_history` con transición (`state_changed`), y `audit_log` de `dossier_assignments` y `observations` (`assigned`, `observation_added`) cuando WF-03 y WF-04 creen esas tablas y conecten `log_dossier_record_change` (ver [database/README.md](../database/README.md#auditoría-del-expediente-aud-01)). Hasta entonces esos dos tipos no devuelven eventos.
- No existe ninguna ruta para modificar o borrar eventos; los triggers rechazan `UPDATE`, `DELETE` y `TRUNCATE` sobre `audit_log` y `state_history` (prueba en `tests/dossiers/audit-events.http.integration.test.ts`).

---

## Contrato por dominio

> Para los recursos que cubre el **Contrato MVP** de arriba, manda el MVP. Las rutas anteriores en español quedan reemplazadas por las de estas tablas ([naming-glossary.md](naming-glossary.md) §3).

## Usuarios (`institutional-core`)

| Método | Endpoint | Propósito | Estado |
|---|---|---|---|
| `GET` | `/api/v1/users` | Consultar usuarios autorizados | Implementado |
| `POST` | `/api/v1/users` | Crear usuario institucional | Implementado |
| `GET` | `/api/v1/users/{userId}` | Consultar un usuario | Implementado |
| `PATCH` | `/api/v1/users/{userId}` | Modificar/activar/desactivar | Implementado |
| `GET`/`PUT` | `/api/v1/users/{userId}/roles` | Consultar / reemplazar los roles de un usuario | Implementado (CORE-02) |
| `GET` | `/api/v1/roles` | Consultar roles | Confirmado |
| `POST` | `/api/v1/roles` | Crear rol | Confirmado |
| `GET` | `/api/v1/roles/{roleId}/permissions` | Consultar permisos de un rol | Confirmado (CORE-02) |
| `PUT` | `/api/v1/roles/{roleId}/permissions` | Reemplazar permisos completos del rol | Confirmado (CORE-02) |

## Alineación de rutas (ticket #55)

Correspondencia de migración del módulo de acceso al contrato versionado:

| Ruta de origen | Ruta contractual de destino |
|---|---|
| `POST /api/auth/login` | `POST /api/v1/sessions` |
| `GET /api/auth/me` | `GET /api/v1/users/current` |
| `POST /api/auth/logout` | `DELETE /api/v1/sessions/current` |
| `GET /api/health` | `GET /api/v1/status` |

`current` es un segmento reservado según [api-conventions.md](api-conventions.md#4-identificadores-y-path-params): identifica el usuario autenticado o su sesión y nunca se interpreta como identificador de usuario o de sesión.

`DELETE /api/v1/sessions/current` responde `204 No Content`, sin cuerpo.

### Identidad y permisos efectivos (ticket #57)

`GET /api/v1/users/current` requiere sesión válida mediante `requireSession` y devuelve `200 OK` con esta estructura:

```json
{
  "data": {
    "user": {
      "userId": "uuid-del-usuario-autenticado",
      "email": "usuario@uapa.edu.do",
      "name": "Nombre actual",
      "unit": null,
      "roles": ["CINGEP", "FACILITATOR"],
      "permissions": ["dossiers.create", "dossiers.edit", "dossiers.read"]
    }
  }
}
```

El único dato de la sesión utilizado para elegir al usuario es `req.user.sub`. El caso de uso valida su formato UUID antes de consultar identidad o permisos; si es inválido devuelve `401 SESSION_INVALID` sin consultar ninguno de los dos servicios. Nombre, correo, estado activo, roles y permisos se consultan en PostgreSQL en cada llamada. Los roles del JWT no son autoridad para este endpoint; el JWT actual no contiene permisos y cualquier campo de permisos añadido al token se ignora. El cliente no puede seleccionar otro usuario mediante body, query, parámetros de ruta ni headers personalizados.

Los roles se obtienen de `user_roles → roles`. Los permisos efectivos son la unión actual de `user_roles → role_permissions → permissions`. Ambas listas contienen códigos sin duplicados y ordenados por código; sin asignaciones se devuelven listas vacías. La consulta está parametrizada por el usuario autenticado y usa columnas explícitas: no selecciona ni devuelve `password_hash`, credenciales ni datos de otros usuarios.

Un cambio de rol, de permisos asignados al rol o de datos personales se refleja en la siguiente consulta, conservando la misma cookie/JWT. Si el usuario fue desactivado, `requireSession` rechaza la siguiente consulta con `401`, `application/problem+json`, código `SESSION_INVALID` y tipo `/problems/session-invalid`: la política vigente de sesiones exige una cuenta activa. También bloquea el logout de una cuenta ya inactiva. Si la sesión supera esa verificación y el caso de uso detecta posteriormente una identidad inactiva (por ejemplo, por un cambio concurrente), devuelve `401 USER_INACTIVE`, tipo `/problems/user-inactive`. Si ya no existe la identidad asociada al `sub`, responde `401` con `SESSION_INVALID` y `/problems/session-invalid`, sin revelar la existencia previa de una cuenta ni recurrir a datos del token. Se mantiene el [contrato central de errores](responses-and-errors.md).

`unit: null` es una limitación temporal: el modelo técnico actual no define una tabla ni una relación usuario–unidad. No se deduce del rol ni se obtiene del JWT; este requisito aún no está implementado de forma definitiva. [ADR-015](decisions/ADR-015-object-level-authorization.md) agrega `users.school_code` para el alcance por escuela.

**Pendiente de validación con arquitectura/equipo: modelo y relación de unidad organizativa del usuario.**

El ticket #57 reutiliza el servicio oficial de permisos efectivos ya integrado en autenticación (`ConsultorPermisos` / `PostgresConsultorPermisos`). El repositorio de identidad solo consulta usuario, estado y roles; el caso de uso consulta permisos después de confirmar la identidad activa y ordena el Set recibido para devolver `permissions`.

### Disponibilidad pública del servicio

`GET /api/v1/status` preserva la comprobación de PostgreSQL de la ruta de origen. Si la conexión está disponible, devuelve `200 OK`, `Content-Type: application/json` y:

```json
{ "data": { "status": "available" } }
```

Si no está disponible, devuelve `503 Service Unavailable`, `Content-Type: application/problem+json` y:

```json
{
  "type": "/problems/service-unavailable",
  "title": "Servicio temporalmente no disponible",
  "status": 503,
  "detail": "El servicio no esta disponible temporalmente.",
  "instance": "/api/v1/status",
  "code": "SERVICE_UNAVAILABLE"
}
```

`SERVICE_UNAVAILABLE` identifica indisponibilidad temporal conocida. La respuesta pública no identifica la dependencia que falló ni expone información interna. Los errores siguen [responses-and-errors.md](responses-and-errors.md).

### Sondas operativas

Las sondas siguientes se conservan fuera del contrato público versionado, con sus formatos operativos sin envoltura `data`:

- `GET /health`: comprueba que el proceso está vivo, devuelve `200` y lo utiliza el healthcheck de Docker.
- `GET /ready`: comprueba PostgreSQL, devuelve `200` si está disponible y `503` si no.

## Plantillas (`template-engine`)

Jerarquía resuelta por [ADR-012](decisions/ADR-012-template-versioning.md): las secciones y los campos pertenecen a una **versión de plantilla**; una versión publicada es inmutable.

| Método | Endpoint | Propósito | Estado |
|---|---|---|---|
| `GET`/`POST` | `/api/v1/templates` | Consultar / crear plantilla lógica | Implementado |
| `GET`/`PATCH` | `/api/v1/templates/{templateId}` | Consultar / modificar metadatos | Implementado |
| `GET`/`POST` | `/api/v1/templates/{templateId}/versions` | Historial / crear versión en borrador sin sobrescribir | Implementado |
| `GET` | `/api/v1/templates/{templateId}/versions/{templateVersionId}` | Versión concreta | Implementado |
| `POST` | `/api/v1/templates/{templateId}/versions/{templateVersionId}/publications` | Publicar una versión (acción modelada como recurso) | Implementado (ADR-012) |
| `GET`/`POST` | `/api/v1/template-versions/{templateVersionId}/sections` | Secciones de una versión de plantilla | Implementado (ADR-012) |
| `PATCH` | `/api/v1/sections/{sectionId}` | Modificar, reordenar, activar/desactivar sección | Implementado (ADR-012) |
| `GET`/`POST` | `/api/v1/sections/{sectionId}/fields` | Campos configurables | Implementado (ADR-012) |
| `PATCH` | `/api/v1/fields/{fieldId}` | Modificar campo | Implementado (ADR-012) |
| `GET`/`POST` | `/api/v1/template-versions/{templateVersionId}/validation-rules` | Reglas de validación | Propuesto |
| `GET`/`POST` | `/api/v1/template-versions/{templateVersionId}/checklists` | Checklists configurables | Propuesto |
| `GET` | `/api/v1/institutional-catalogs` | Escuelas, carreras, modalidades | Confirmado |

Escribir secciones o campos solo se permite en versiones en borrador; sobre una versión publicada → `409 IMMUTABLE_VERSION`.

## Expedientes (`dossiers`)

| Método | Endpoint | Propósito | Estado |
|---|---|---|---|
| `GET`/`POST` | `/api/v1/dossiers` | Buscar / crear Expediente Curricular Digital | Implementado (DOS-01, [ADR-013](decisions/ADR-013-dossier-lifecycle-and-versioning.md): se crea con la v1.0 y el estado inicial) |
| `GET`/`PATCH` | `/api/v1/dossiers/{dossierId}` | Consultar / modificar metadatos | Implementado (DOS-01) |
| `GET` | `/api/v1/dossiers/{dossierId}/versions` | Historial de versiones | Confirmado |
| `GET`/`PATCH` | `/api/v1/dossiers/{dossierId}/versions/{versionId}` | Versión concreta / editar su contenido | Confirmado |
| `GET`/`POST` | `/api/v1/dossiers/{dossierId}/attachments` | Metadatos / adjuntar archivo | Confirmado / **Pendiente** (mecanismo de carga, fuera del MVP) |
| `GET` | `/api/v1/attachments/{attachmentId}/content` | Descargar contenido binario | Propuesto |
| `POST` | `/api/v1/version-comparisons` | Comparar dos versiones | Propuesto |
| `POST` | `/api/v1/cross-validations` | Validar contra documentos maestros | Propuesto |
| `GET` | `/api/v1/dossiers/{dossierId}/audit-events` | Cronología inmutable | Implementado (AUD-01, [ADR-016](decisions/ADR-016-authentication-and-audit-events.md); `assigned` y `observation_added` llegan con WF-03 y WF-04) |
| `POST` | `/api/v1/dossiers/{dossierId}/final-documents` | Generar documento institucional definitivo | Propuesto |
| `GET`/`POST` | `/api/v1/master-documents` | Pensum, mallas, normativas | Confirmado |
| `POST` | `/api/v1/exports` / `/api/v1/imports` | Exportar / importar datos | **Pendiente** |

Las versiones nuevas no se crean con un `POST` directo: las crea el servidor al crear el expediente y en las transiciones que devuelven el expediente (ADR-013). No se define `DELETE /api/v1/dossiers/{dossierId}` ni de versiones/evidencias/auditoría.

## Workflow (`workflow`)

| Método | Endpoint | Propósito | Estado |
|---|---|---|---|
| `GET`/`POST` | `/api/v1/workflows` | Consultar / crear configuración de flujo | `GET` implementado (WF-01); en el MVP solo lectura |
| `GET`/`PATCH` | `/api/v1/workflows/{workflowId}` | Consultar / modificar flujo | `GET` implementado / **Pendiente** |
| `GET`/`POST` | `/api/v1/workflows/{workflowId}/states` | Estados configurados | `GET` implementado (WF-01) |
| `GET`/`POST` | `/api/v1/workflows/{workflowId}/transitions` | Definiciones de transición permitidas | `GET` implementado (WF-01) |
| `GET`/`POST` | `/api/v1/dossiers/{dossierId}/transitions` | Historial / ejecutar movimiento (aprobar, devolver) | Confirmado ([ADR-014](decisions/ADR-014-undergraduate-workflow.md)) |
| `GET`/`POST` | `/api/v1/dossiers/{dossierId}/assignments` | Historial / crear asignación de responsable | Confirmado |
| `GET`/`POST` | `/api/v1/dossiers/{dossierId}/observations` | Observaciones por criterio/sección/campo | Implementado (WF-04) |

### Decisión clave de workflow

Aprobar, devolver y reenviar **no son endpoints propios** — son tipos de transición ejecutados vía `POST /dossiers/{dossierId}/transitions`. El servidor deriva actor, estado origen/destino y fecha del contexto autorizado; el cliente nunca los envía como datos autoritativos.

```json
{ "transitionId": "transicion-autorizada", "versionId": "version-evaluada", "observation": "Motivo permitido por el flujo" }
```

## Operaciones confirmadas sin contrato aún cerrado

No agregar rutas para: notificaciones de proceso, reapertura formal, sellos y firmas, alertas de vencimiento, baja/transferencia/disposición documental — todas **pendientes de validación con arquitectura/equipo**. La publicación de versiones de plantilla (ADR-012) y el pilotaje y su evaluación (transiciones de [ADR-014](decisions/ADR-014-undergraduate-workflow.md)) ya tienen contrato.

Documento fuente completo (incluye matriz de cobertura RF/RNF fila por fila): `02_ENDPOINTS_PRINCIPALES_POR_DOMINIO.md` en la documentación de proyecto.
