# Implementación de las ventanas SIGESDOC

## Objetivo

Las pantallas reproducen el lenguaje visual del
[prototipo institucional de Figma](https://www.figma.com/design/dpOduTZPhWexEa3dUUFnfM/Sin-t%C3%ADtulo?node-id=96-557)
con los tokens compartidos de SIGESDOC y consumen exclusivamente el contrato publicado por
`SIGESDOC_BACKEND`. La interfaz no
deduce capacidades por nombre de rol: recibe permisos efectivos desde `/api/v1/users/current`.

## Rutas de la interfaz

| Pantalla            | Ruta                 | Integración actual                                                                                     |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| Panel principal     | `/`                  | Cuatro indicadores, gráficas, actividad real y exportación CSV de los expedientes visibles.            |
| Gestión documental  | `/expedientes`       | `GET /api/v1/dossiers`; búsqueda, filtros, exportación CSV y alcance del servidor.                     |
| Registrar documento | `/expedientes/nuevo` | Asistente funcional de cinco pasos y `POST /api/v1/dossiers`; borrador y validación local del archivo. |
| Búsqueda avanzada   | `/busqueda`          | `GET /api/v1/dossiers?search=...`.                                                                     |
| Detalle y revisión  | `/revision`          | Cinco pestañas navegables con resumen, metadatos, versión, bitácora y relaciones.                      |
| Observaciones       | `/observaciones`     | Formulario preparado; escritura aún deshabilitada.                                                     |
| Historial           | `/historial`         | Filtros preparados; auditoría por expediente aún pendiente.                                            |
| Reportes            | `/reportes`          | Indicadores derivados de expedientes, filtros por periodo/unidad y exportación CSV.                    |
| Biblioteca UI       | `/ui-kit`            | Estados, botones, formularios, paneles minimizables, modal de ejemplo y exportación de tokens.         |

## Roles y permisos

El backend conserva los 12 roles institucionales y siembra los 20 permisos de
`docs/role-permission-matrix.md`. La navegación usa los códigos `dossiers.*`, `workflow.*`,
`observations.create` y `audit.read`. Los códigos antiguos en español solo se reconocen durante la
transición de sesiones locales anteriores; no se usan para funcionalidades nuevas.

## Funciones que ya operan en frontend

- Logo institucional, menú lateral, buscador global, perfil y cierre de sesión.
- Búsqueda y filtros de expedientes dentro del alcance devuelto por backend.
- Registro de expediente mediante `POST /api/v1/dossiers`, únicamente para usuarios con
  `dossiers.create`.
- Asistente de radicación de cinco pasos: información general, clasificación, archivo local,
  retención y revisión final.
- Navegación completa en las cinco secciones de Detalle y Dictamen. Las pestañas muestran datos
  reales del expediente y señalan expresamente qué información aún no publica backend.
- Borrador local de radicación, selección y vista previa del archivo, límite de 50 MB y cálculo
  local de SHA-256. El archivo no se envía mientras backend no publique el mecanismo de carga.
- Exportación CSV desde panel, gestión y reportes; exportación JSON de los tokens del UI Kit.
- Redirección segura al inicio de sesión si cualquier solicitud protegida recibe `401`, evitando
  conservar un perfil visualmente autenticado junto a un error de sesión.
- Cuenta de desarrollo `admin.integral@uapa.edu.do`, compuesta únicamente con roles oficiales del
  backend, para verificar todos los módulos. Su contraseña es el `SEED_PASSWORD` utilizado al
  ejecutar la siembra; no se almacena en el repositorio.

## Acciones deshabilitadas conscientemente

OCR persistente, carga de archivos, firmas X.509, sellado, exportación oficial PDF/Excel,
notificaciones, alertas TRD, remesas, transferencias, ZIP compilado y disposición final no tienen
rutas en el contrato MVP. Sus controles pueden verse para mantener fidelidad con el prototipo, pero
permanecen deshabilitados y explican el motivo. No se simulan respuestas del servidor ni se inventan
rutas. Se habilitarán únicamente cuando backend publique y pruebe el contrato correspondiente.

## Origen de los indicadores del panel

- Total custodiado, mesa de entrada, revisión y archivo histórico se calculan con los expedientes
  devueltos por `GET /api/v1/dossiers`.
- La gráfica mensual agrupa esos expedientes por `createdAt`; no contiene series escritas a mano.
- El anillo de trámite clasifica los estados recibidos en recepcionado, revisión, concluido y otros.
- La actividad reciente usa los cinco primeros expedientes visibles según el alcance de la sesión.
- Las tarjetas de alertas conservan el diseño del prototipo, pero los plazos, notificaciones y
  transferencias están deshabilitados hasta que exista un endpoint oficial.

## Reglas de seguridad

- Cookie de sesión `HttpOnly`; el navegador no almacena tokens.
- En Docker local, `COOKIE_SECURE=false` permite que el navegador acepte la cookie sobre HTTP. En
  despliegues HTTPS debe configurarse `COOKIE_SECURE=true`.
- Todas las llamadas usan credenciales entre orígenes.
- El servidor deriva actor, fechas, código, estado, versión y auditoría.
- El backend aplica permiso y alcance a nivel de expediente; ocultar un botón no sustituye esa regla.
- Sin alcance se responde `404`; con alcance y sin permiso, `403`.

## Verificación

Antes de integrar una rama se ejecutan `npm run typecheck`, `npm test`, `npm run lint`,
`npm run lint:css` y `npm run build`. Los datos de desarrollo viven en PostgreSQL y no en archivos
JavaScript del frontend. En la revisión contractual final aprobaron 15 archivos de prueba con 62
pruebas automatizadas.
