# Pendientes del backend para el Módulo 4

Fecha: 27 de septiembre de 2026. Frontend en `develop`; backend revisado en su rama `develop`.

El frontend ya consume todas las rutas del contrato MVP (`contratos/endpoints.md` §1–§9) y valida
cada respuesta (`src/common/api/dossierContract.ts`). Cuando una ruta responde 404, la pantalla
muestra "pendiente"; cuando responde con la forma del contrato, funciona sin cambios en el
frontend. Lo único que falta es del lado del servidor.

## 1. Bloqueo actual: REF-02

La regla R-1 del backend impide fusionar cambios en `src/` y `database/` hasta que entre REF-02
(renombrado al inglés). El frontend ya acepta ambos nombres durante la transición:

- Permisos: usa `dossiers.*`, `workflow.*`, `observations.create`, `audit.read`, y equivale
  temporalmente `expedientes.*` / `auditoria.consultar` (`src/common/auth/permissions.ts`).
- Errores: `code`/`codigo`, `errors`/`errores` y los códigos en ambos idiomas (`errors.ts`).
- Roles: `roleId`/`rolId`, `code`/`codigo`, `name`/`nombre`.

Después de REF-02 no hace falta ningún cambio en el frontend.

## 2. Rutas en orden sugerido

El orden desbloquea el flujo de punta a punta lo antes posible.

Alineado con el plan del mentor (29/09). B1, B2 y B9 son base de datos y no activan pantallas
por sí solas.

| Orden | Tarea | Rutas                                                                                     | Pantalla que se activa                       | Etapa |
| ----- | ----- | ----------------------------------------------------------------------------------------- | -------------------------------------------- | ----- |
| 1     | B3    | `GET/POST /dossiers`, `GET/PATCH /dossiers/{id}`                                          | Panel, Gestión, Búsqueda, Registro, Reportes | 1     |
| 2     | B4    | `GET /dossiers/{id}/available-transitions`, `POST .../transitions`, `GET .../transitions` | Acciones del flujo T1 a T6, historial        | 1     |
| 3     | B6    | `GET/POST /dossiers/{id}/observations`                                                    | Observaciones                                | 1     |
| 4     | B7    | `GET /dossiers/{id}/audit-events`                                                         | Historial y trazabilidad                     | 1     |
| 5     | B5    | `POST /dossiers/{id}/assignments` y `GET /users?roleCode=…` con `workflow.assign`         | Revisión → Workflow (asignar)                | 2     |
| 6     | B8    | `GET /dossiers/{id}/versions`, `GET/PATCH .../versions/{versionId}`                       | Versiones y formulario del programa          | 2     |
| 7     | B12   | `GET /templates/...`, `GET /institutional-catalogs/{catalog}`                             | Formulario del programa (CU-01)              | 2     |
| 8     | B10   | `GET/PUT /users/{id}/roles`, `GET/PUT /roles/{roleId}/permissions`                        | Usuarios y roles: asignar roles y permisos   | 2     |

`GET/POST /users` y `PATCH /users/{id}` ya están en el backend (plan del 29/09).

## 3. Formas que el contrato no fija (confirmar o documentar)

El frontend las acepta de forma tolerante, pero conviene fijarlas en `endpoints.md`:

1. **`Observation`** (§8): se espera `{ observationId, versionId, text, sectionKey, fieldKey,
createdBy: { userId, name }, createdAt }`.
2. **Estados en transiciones e historial** (§6): `toState`, `fromState` y `transition` se aceptan
   como código o como `{ code, name }`. Se recomienda `{ code, name }` para mostrar el nombre.
3. **Usuarios en historial, versiones y auditoría**: se aceptan como nombre o `{ userId, name }`.
4. **`GET /users`** (para elegir especialista): se espera `{ userId, name, roles }[]`; si llegan
   roles, el frontend filtra `CURRICULUM_SPECIALIST`. La pantalla ya pide
   `?roleCode=CURRICULUM_SPECIALIST&isActive=true` (ver §4).
5. **Usuarios y roles (CU-12)**: la pantalla envía `roleCode` y `roleCodes` con el código del
   contrato en inglés (`SCHOOL_DIRECTOR`), aunque `/roles` todavía responda con el alias
   (`DIR_ESCUELA`). Pide `users.manage` y acepta también `usuarios.administrar` hasta REF-02.
   Bloquea en la interfaz que un usuario cambie sus propios roles o desactive su cuenta.
6. **Resultados del checklist** (RF-05): el contrato MVP no tiene ruta propia. El frontend los
   envía dentro de `observation` al devolver o aprobar, para que queden en el historial.

## 4. Decisiones pendientes entre análisis y backend

- **Quién crea el expediente**: el caso de uso CU-18 dice la Dirección de Gestión Curricular; la
  siembra de permisos (migración 004) solo da `expedientes.crear` a Coordinación, Dirección de
  Escuela y Facilitador.
- **Quién aprueba para pilotaje**: CU-04 dice el Especialista; ADR-014 (T4/T8) dice la Dirección.
  El frontend no decide: muestra "Aprobar para pilotaje" solo a quien el servidor ofrezca la
  transición en `available-transitions`.
- **Cómo se asigna el especialista (T1)**: el frontend acepta las dos formas en discusión.
  Primero llama `POST /dossiers/{id}/assignments`; si esa ruta responde 404 y el servidor ofrece
  la transición `ASSIGN`, la ejecuta con `POST /dossiers/{id}/transitions` y
  `{ transitionId, versionId, specialistId }`. La lista de especialistas se pide con
  `GET /users?roleCode=CURRICULUM_SPECIALIST&isActive=true`; para que la Dirección la vea, el
  servidor debe aceptar ese filtro con `workflow.assign` (hoy `/users` exige `users.manage`).

## 5. Guía de instalación del backend

Pasos que el README del backend no deja claros y que el equipo necesitará:

- `npm run db:migrate` no lee `.env`: exportar `DATABASE_URL` antes.
- La siembra de usuarios (`database/scripts/seed-test-users.mjs` con `SEED_PASSWORD`) solo está
  en `database/README.md`.
- El administrador inicial (`scripts/admin.mjs`) exige una contraseña de 16 caracteres o más,
  distinta de `SEED_PASSWORD`.
