# Integración del frontend con la API

> **Documento derivado (ADR-009 del backend).** No define el contrato: lo definen
> `01_CONVENCION_NOMBRES_RUTAS.md`, `02_ENDPOINTS_PRINCIPALES_POR_DOMINIO.md` y
> `03_FORMATO_RESPUESTAS_Y_ERRORES.md`. Aquí solo se describe cómo el cliente lo
> consume. Las propiedades de dominio van en **inglés `camelCase`** (ADR-005).

## Objetivo

La interfaz consume el contrato versionado comunicado por backend mediante un
cliente central. El origen de la API se configura por entorno y no se repite en
las pantallas. El servidor incluido en este repositorio implementa temporalmente
el mismo contrato para conservar la demostración hasta que backend confirme su
migración y autorice retirarlo.

## Contrato consumido

| Operación | Método y ruta | Respuesta |
|---|---|---|
| Estado | `GET /api/v1/status` | `200` con `{ data }` |
| Iniciar sesión | `POST /api/v1/sessions` | `200` con la identidad en `data` |
| Identidad actual | `GET /api/v1/users/current` | `200` con identidad y permisos |
| Cerrar sesión | `DELETE /api/v1/sessions/current` | `204 No Content` |

Las respuestas exitosas se leen desde `data`. La propiedad `meta` puede
acompañarlas sin cambiar el recurso devuelto al consumidor.

## Responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `public/config.js` | Lee la configuración pública generada para el navegador. |
| `public/api.js` | Define rutas, envía credenciales, desenvuelve `data` y traduce errores por `codigo`. |
| `public/permissions.js` | Normaliza permisos y controla la visibilidad de opciones. |
| `public/session.js` | Reutiliza identidad y cierre de sesión en las pantallas protegidas. |
| `public/charts.js` | Dibuja gráficos con Canvas sin depender de una CDN. |
| `public/login.js` | Valida la interacción y relaciona errores de campo con el formulario. |
| `public/dashboard.js` | Carga identidad, aplica permisos, consulta estado y mantiene métricas vacías hasta tener contrato. |
| `public/historial.js`, `public/observaciones.js`, `public/revision.js` | Protegen los prototipos por sesión y permisos sin llamar rutas no confirmadas. |
| `src/config.js` | Valida `API_BASE_URL` y la configuración privada temporal. |
| `src/app.js` | Publica la configuración, CSP y el contrato temporal de demostración. |

## Configuración por entorno

`API_BASE_URL` debe contener exclusivamente un origen HTTP o HTTPS:

```env
API_BASE_URL=http://localhost:3001
```

No debe contener `/api/v1`, credenciales, parámetros ni fragmentos. Un valor
vacío utiliza el mismo origen de la interfaz. `/runtime-config.js` publica
solamente esa dirección; nunca expone `DATABASE_URL`, `JWT_SECRET` ni contraseñas.

La política CSP incluye `'self'` y, cuando existe, el origen exacto de
`API_BASE_URL` en `connect-src`.

## Sesión entre orígenes

Todas las solicitudes usan `credentials: 'include'`. Para que la sesión funcione
con los repositorios separados, backend debe configurar conjuntamente:

- el origen exacto del frontend en CORS, sin `*`;
- `Access-Control-Allow-Credentials: true`;
- la cookie `HttpOnly`, `Secure` y `SameSite` adecuada a los dominios acordados;
- una defensa CSRF u otra validación de origen para operaciones con cookie.

Frontend no lee la cookie ni almacena tokens. La configuración de CORS y los
atributos de la cookie pertenecen al servidor.

## Errores

Los errores JSON se interpretan como Problem Details. Las decisiones de interfaz
se basan en `codigo` y `status`, no en `title` o `detail`. Los textos del
servidor no se muestran directamente.

Los códigos contemplados son:

- `CREDENCIALES_INVALIDAS`;
- `SESION_AUSENTE`, `SESION_EXPIRADA`, `SESION_INVALIDA` (401 de sesión, ADR-006);
- `NO_AUTENTICADO` (guardas internas del servidor);
- `DEMASIADOS_INTENTOS`;
- `ACCESO_DENEGADO`;
- `VALIDACION_FALLIDA`;
- `RECURSO_NO_ENCONTRADO`;
- `ERROR_INTERNO`.

Cuando `VALIDACION_FALLIDA` contiene `errores`, la interfaz identifica los
campos reconocidos y les asigna `aria-invalid`. Los códigos desconocidos muestran
un mensaje genérico según el estado HTTP. Una respuesta exitosa sin `data` se
considera inválida. El cliente limita la espera a diez segundos y no reintenta
automáticamente operaciones de escritura.

## Permisos

Los endpoints de login e identidad devuelven la identidad en `data` (en login,
bajo `data.user`) con propiedades en inglés `camelCase`: `userId`, `name`,
`email`, `unit`, `roles` y `permissions`. Esta última es una lista de códigos.
La interfaz:

- muestra una opción solo cuando recibió su permiso;
- no deduce permisos del nombre del rol;
- mantiene el panel válido cuando la lista está vacía;
- informa que no hay módulos asignados.

Esta lógica mejora la experiencia, pero no es control de acceso. Backend debe
autorizar cada endpoint independientemente de la opción visible en el navegador.

Las opciones del dashboard se declaran con los **códigos reales del catálogo del
backend** (migraciones 002/004, notación `modulo.accion`). Correspondencia
**provisional** opción → permiso (pendiente de la matriz oficial, ADR-010 del
backend, derivada de `INF-05` y las fichas CU):

| Opción | Permiso requerido |
|---|---|
| Gestión Documental · Búsqueda Avanzada | `expedientes.consultar` |
| Registrar Documento | `expedientes.crear` |
| Detalle & Revisión | `expedientes.aprobar` |
| Observaciones | `expedientes.editar` |
| Historial & Trazabilidad · Reportes | `auditoria.consultar` |

## Verificación

Ejecute:

```bash
npm test
npm run dev
```

La validación actual incluye 26 pruebas automatizadas:

- rutas y métodos definitivos;
- `credentials: 'include'`;
- origen configurable y rechazo de valores inseguros;
- envoltura `data` y tolerancia de `meta`;
- Problem Details por `codigo` y errores por campo;
- logout `204` sin lectura de JSON;
- fallos de red, timeout y respuestas inválidas;
- permisos parciales y usuario sin permisos;
- flujo local completo de login, identidad y logout;
- configuración pública sin secretos y módulos estáticos.
- ausencia de rutas antiguas, peticiones directas, scripts remotos y manejadores inline;
- carga estática de dashboard, historial, observaciones y revisión;
- permisos explícitos de los nuevos accesos del dashboard.

## Módulos sin contrato publicado

Dashboard, observaciones, historial y revisión ya comparten la sesión y los
permisos del contrato confirmado. Backend todavía no ha comunicado rutas
versionadas para métricas, actividad, alertas, observaciones, trazabilidad o
decisiones de revisión. Por esa razón:

- el dashboard muestra ceros y estados vacíos;
- observaciones no permite enviar el formulario;
- historial no muestra registros de ejemplo;
- revisión permite explorar el checklist, pero no declara que guardó decisiones.

Cuando Backend publique esos contratos deben añadirse primero al cliente central,
documentar sus respuestas `data` y errores Problem Details, y cubrirlos con
pruebas antes de habilitar operaciones en la interfaz.

También debe comprobarse visualmente el login, el dashboard de cada perfil, el
cierre de sesión y el mensaje de usuario sin módulos.

## Dependencias externas pendientes

El código del frontend para contrato, credenciales, CSP y permisos está
implementado. Para certificar la integración entre repositorios aún se necesita:

1. una rama de backend que exponga las cuatro rutas acordadas;
2. el cuerpo definitivo de identidad y su catálogo de permisos;
3. los orígenes reales de desarrollo y mentor;
4. CORS, cookies y protección CSRF configurados en backend;
5. una prueba completa desde ambos orígenes sin errores de consola;
6. la confirmación de backend para retirar el servidor temporal de este repositorio.

La copia de backend revisada contiene `GET /health`, `GET /ready` y rutas de
roles, pero no registra todavía las rutas de sesiones, usuario actual o estado
versionado, ni un middleware CORS. Por eso esa validación externa no puede
declararse realizada con los archivos disponibles.
