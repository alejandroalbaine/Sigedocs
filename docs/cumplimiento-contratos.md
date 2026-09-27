# Revisión de cumplimiento de contratos

Fecha de revisión: 27 de septiembre de 2026.

## Alcance verificado

Se comparó el frontend con `contratos/endpoints.md` y
`contratos/template-data-contract.md`, y se contrastó con las rutas realmente disponibles en
SIGESDOC_BACKEND. Los documentos describen el contrato objetivo; no demuestran por sí solos que
cada ruta ya esté implementada.

| Área               | Resultado del frontend                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envoltura de éxito | Lee siempre `data` y normaliza `meta.pagination`.                                                                                                        |
| Transición REF-02  | Acepta temporalmente `paginacion`, `codigo`, `errores`, `rolId`, `codigo` y `nombre`, pero entrega internamente la forma final en inglés.                |
| Acceso             | Usa exactamente `POST /sessions`, `GET /users/current`, `DELETE /sessions/current` y `GET /status` bajo `/api/v1`, con cookie de sesión.                 |
| Roles              | Normaliza cada rol a `{ roleId, code, name }`; la interfaz decide por permisos efectivos, no por el nombre del rol.                                      |
| Expedientes        | Lista y crea mediante `GET/POST /api/v1/dossiers`. El alta envía únicamente `title`, `academicLevel`, `schoolCode`, `degreeProgramCode` y `subjectCode`. |
| Nivel académico    | El formulario solo permite `associate` y `bachelor`, que son los valores admitidos por DOS-01 en el MVP.                                                 |
| Dossier            | El tipo incluye `documentType`, `workflowId`, `currentState`, `currentVersion`, `template`, `assignedSpecialist`, `createdBy` y `createdAt`.             |
| Plantillas         | Existe un validador para la definición completa y los ocho tipos de campo. Rechaza tipos desconocidos y más de dos niveles de grupos repetibles.         |
| Errores            | Interpreta Problem Details final (`code`, `errors`) y su forma transitoria; nunca presenta `detail` técnico al usuario.                                  |

## Acciones que permanecen deshabilitadas

La interfaz no declara como realizadas operaciones que el backend ejecutable aún no ofrece. Esto
incluye carga persistente de archivos, OCR, X.509, transiciones, observaciones, auditoría por
expediente, notificaciones, remesas y disposición final. Los controles del prototipo permanecen
deshabilitados o informativos hasta que la ruta correspondiente responda y tenga pruebas.

Esta decisión no es una carencia de integración: evita inventar endpoints, estados, actores o
resultados, tal como exigen los contratos.

## Evidencia automatizada

Las pruebas verifican rutas y métodos de sesión, credenciales entre orígenes, envolturas `data`,
paginación final y transitoria, Problem Details, permisos, los ocho tipos de plantilla, el máximo de
dos niveles repetibles y la navegación protegida. Además se ejecutan TypeScript estricto, ESLint,
Stylelint y el build de producción.
