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

## Contrato MVP de flujo (actualización del 27/09)

| Área             | Resultado del frontend                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Validación       | `dossierContract.ts` valida `Dossier`, versiones, transiciones, historial, asignaciones, observaciones y auditoría.  |
| Transiciones     | Envía exactamente `{ transitionId, versionId, observation? }`; solo ofrece las que devuelve `available-transitions`. |
| Asignación       | Envía `{ specialistId }` a `POST /dossiers/{id}/assignments`.                                                        |
| Observaciones    | Envía `{ versionId, text }`; solo en `IN_REVIEW` o `IN_REEVALUATION`, sin editar ni borrar.                          |
| Auditoría        | Filtra con `type`, `from`, `to`; los tipos son los seis de AUD-01.                                                   |
| Rutas pendientes | Un 404 en una ruta confirmada se muestra como "pendiente en el servidor", nunca con datos simulados.                 |

Las formas que el contrato no fija están en [pendientes-backend.md](pendientes-backend.md) §3.

## Acciones que permanecen fuera del MVP

La interfaz no declara como realizadas operaciones diferidas por los informes técnicos: carga
persistente de archivos, OCR, firma o sellado digital, notificaciones externas, rama de posgrado y
gestión archivística avanzada (Informe Módulo II §5.1).

La comparación de versiones se resuelve en la interfaz con las rutas confirmadas de versiones y
plantillas; no supone la ruta `POST /version-comparisons`, que en el backend sigue propuesta.
