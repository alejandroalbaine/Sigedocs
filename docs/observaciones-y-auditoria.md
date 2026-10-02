# Observaciones y auditoría (B6 / B7)

## Qué son

- **B6 – Observaciones**: registro y consulta de observaciones sobre la versión observada de
  un expediente. Requiere el permiso `observations.create`.
- **B7 – Auditoría**: cronología de acciones sobre un expediente. Requiere el permiso
  `audit.read`.

Ambas pantallas son **por expediente**: primero se elige el expediente en el selector y luego se
consultan sus versiones (B6) o sus eventos (B7).

## Fuente de datos

El interruptor `VITE_USE_MOCK_DATA` decide de dónde salen los datos:

| Valor | Comportamiento |
|---|---|
| `true` (por defecto) | Servicios simulados; la interfaz funciona sin backend. |
| `false` | Endpoints reales de `SIGESDOC_BACKEND`. |

Variables relacionadas:

- `VITE_API_BASE_URL`: origen del backend. Vacío = mismo origen.
- `VITE_MOCK_LATENCY_MS`: latencia artificial del servicio simulado, en milisegundos.
- `VITE_DOSSIER_ID`: valor por defecto del expediente (las pantallas usan el selector).

## Contratos esperados del backend

### B6

```http
POST /api/v1/dossiers/{dossierId}/observations
Content-Type: application/json

{
  "versionId": "uuid",
  "sectionKey": "datos_academicos",
  "fieldKey": "asignatura",
  "itemId": null,
  "text": "descripcion"
}
```

- `text` es obligatorio, de 1 a 5000 caracteres.
- `sectionKey` y `fieldKey` se escriben en `snake_case`.
- El autor y la fecha los fija el servidor; el cliente no los envía.

```http
GET /api/v1/dossiers/{dossierId}/observations?versionId={uuid}
```

### B7

```http
GET /api/v1/dossiers/{dossierId}/audit-events
```

```json
[
  {
    "eventId": "uuid",
    "type": "VERSION_SUBMITTED",
    "occurredAt": "2026-01-05T14:30:00.000Z",
    "user": { "userId": "uuid", "name": "Nombre Apellido" },
    "versionLabel": "v1.0",
    "summary": "descripcion"
  }
]
```

`user` puede venir en `null`; la interfaz lo muestra como **Sistema**.

## Estructura del código

| Ruta | Responsabilidad |
|---|---|
| `src/features/observaciones/` | Contrato, servicio, hook, formulario y lista de B6. |
| `src/features/trazabilidad/` | Contrato, servicio, hook, filtros, tabla y detalle de B7. |
| `src/features/dossiers/dossiersService.ts` | Catálogo de expedientes, versiones y secciones, compartido por B6 y B7. |
| `src/common/types.ts` | Tipos compartidos (`Dossier`, `CreateDossierInput`). |
| `src/common/config.ts` | Interruptor mock/API y latencia simulada. |

Los hooks descartan respuestas de consultas anteriores: si el expediente cambia mientras una
petición está en vuelo, el resultado tardío se ignora y no pisa el expediente nuevo.

## Pruebas

Las pruebas usan datos simulados con latencia `0`, fijado en `vite.config.ts` (`test.env`) para
que la suite no dependa del `.env` de quien la ejecuta.

```bash
npm run typecheck
npm run lint
npx vitest run
```

## Verificación con backend real

```bash
# terminal 1
cd ../SIGESDOC_BACKEND && npm run dev

# terminal 2
npm run dev
```

En el `.env` local: `VITE_USE_MOCK_DATA=false` y `VITE_API_BASE_URL=http://localhost:3000`.
El origen del frontend debe estar en `ALLOWED_ORIGINS` del backend.