# SIGESDOC Login

Primer módulo funcional del Sistema de Gestión Documental Curricular de la Universidad Abierta para Adultos. Proporciona acceso institucional, sesión protegida, roles iniciales, auditoría de autenticación y persistencia en PostgreSQL.

## Estado actual

La primera fase incluye:

- Interfaz adaptable de inicio de sesión.
- Autenticación con correo institucional y contraseña.
- Contraseñas almacenadas como hash bcrypt.
- Sesión firmada en una cookie `HttpOnly` y `SameSite=Strict`.
- Protección del panel posterior al acceso.
- Límite de intentos contra ataques de fuerza bruta.
- Usuarios, perfiles JSONB y eventos de autenticación en PostgreSQL.
- Modo demostrativo cuando el proyecto se ejecuta intencionalmente sin base de datos.
- Pruebas del flujo de autenticación y de la integración con PostgreSQL.

La recuperación de contraseña, identidad única UAPA, 2FA y la persistencia de
los módulos documentales todavía no están implementadas. Las interfaces de
dashboard, observaciones, historial y revisión sí están incorporadas como
prototipos protegidos por sesión y permisos.

El frontend ya implementa el contrato versionado, la configuración de la API por
entorno, el envío de credenciales entre orígenes, los errores Problem Details y
la presentación de opciones según permisos efectivos. El servidor incluido
responde temporalmente al mismo contrato para conservar una demostración funcional.
Su retirada depende del aviso de backend indicado en el requerimiento de migración.

## Requisitos de integración solicitados por backend

El objetivo acordado es que este repositorio conserve la interfaz y consuma la API
del repositorio de backend. La siguiente tabla distingue los requisitos técnicos
de su estado real de implementación.

| Requisito | Estado en frontend | Dependencia externa |
|---|---|---|
| Separar el servidor de la interfaz | El servidor, la autenticación, el acceso a PostgreSQL y sus pruebas siguen en este repositorio para mantener el acceso actual. | Esperar la confirmación de migración de backend; después retirar el código y las dependencias de servidor y documentar un arranque estático independiente. |
| Configurar la URL de la API por entorno | Implementado: `API_BASE_URL` se lee del entorno, se publica sin secretos en `/runtime-config.js` y todas las peticiones usan el cliente central. Vacío conserva el mismo origen. | Confirmar los valores reales para desarrollo separado y mentor. |
| Mantener la sesión entre orígenes | Implementado en frontend: todas las peticiones usan `credentials: 'include'` y CSP autoriza exactamente el origen configurado. | Backend debe habilitar ese origen en CORS, admitir credenciales y configurar la cookie según los dominios y HTTPS; después se ejecuta la prueba conjunta. |
| Consumir el contrato versionado de la API | Implementado: rutas `/api/v1`, respuestas desde `data`, logout `DELETE` con 204 y errores Problem Details elegidos por `codigo`, incluidos campos inválidos. | Validar los cuerpos definitivos contra la rama integrada de backend. |
| Mostrar opciones según permisos efectivos | Implementado: el dashboard usa exclusivamente `permisos`, oculta opciones no autorizadas y muestra un estado válido cuando la lista está vacía. | Backend debe devolver el catálogo definitivo y autorizar cada operación. |

La implementación del frontend está completa y probada de forma local contra el
contrato acordado. Falta la **validación conjunta** porque la copia de backend
entregada no registra aún las rutas de autenticación ni CORS. Ocultar opciones
en la interfaz no reemplaza la autorización del servidor.

### Cambios incorporados

- Configuración pública del origen de la API separada de las variables privadas del servidor.
- Cliente de peticiones compartido por login y dashboard, con rutas centralizadas
  y módulos JavaScript nativos, sin añadir dependencias.
- Contrato definitivo `/api/v1`, respuestas de éxito bajo `data`, errores
  Problem Details por `codigo` y validaciones relacionadas con su campo.
- Credenciales incluidas en todas las peticiones y CSP generada con el origen
  configurado para cada entorno.
- Navegación basada en permisos efectivos, sin deducir privilegios del rol.
- Mensajes controlados ante fallos de red, HTTP o formato; espera máxima de diez
  segundos y ausencia de reintentos automáticos.
- Cierre de sesión con control de errores: si falla, se informa en el panel y se
  permite reintentar sin presentar el cierre como exitoso.
- Pruebas del cliente y de su integración con el servidor actual, junto a las
  pruebas de autenticación existentes.

## Tecnologías

- Node.js 20 o posterior.
- JavaScript con módulos ES.
- Express 5.
- PostgreSQL, mediante una instalación local normal o una conexión entregada por backend.
- HTML y CSS sin framework para la interfaz inicial.
- Node Test Runner y Supertest para pruebas.

## Arquitectura actual

```text
Navegador
   ↓ JSON/HTTPS
Express
   ├── validación y límite de intentos
   ├── autenticación y sesión JWT en cookie
   └── acceso parametrizado a datos
             ↓
         PostgreSQL
         ├── users
         └── auth_events
```

Esta estructura es deliberadamente sencilla para la primera fase. La autorización funcional deberá separarse en servicios y repositorios cuando se incorporen módulos y permisos reales.

## Estructura del proyecto

```text
SIGESDOC_LOGIN/
├── .vscode/              Configuración compartida de Visual Studio Code
├── database/schema.sql   Estructura inicial de PostgreSQL
├── docs/
│   ├── database.md       Diccionario y decisiones de la base de datos
│   └── integracion-api.md Decisiones y verificación de la integración
├── public/
│   ├── config.js         Configuración pública del origen de la API
│   ├── api.js            Cliente compartido y contrato /api/v1
│   ├── permissions.js    Visibilidad según permisos efectivos
│   ├── session.js        Sesión compartida por las pantallas protegidas
│   ├── charts.js         Gráficos locales sin dependencias externas
│   └── ...               Login, dashboard y prototipos de módulos
├── src/                  Configuración, autenticación y persistencia
├── test/                 Pruebas unitarias y de integración
├── .env.example          Plantilla pública de variables
├── CONTRIBUTING.md       Flujo de trabajo del equipo
├── package.json          Dependencias y comandos
└── server.js             Punto de entrada
```

## Preparación inicial

Requisitos:

1. Node.js 20 o posterior.
2. Visual Studio Code.
3. Git.
4. PostgreSQL, únicamente cuando se conecte la base de datos real.

Desde la terminal integrada de Visual Studio Code:

```bash
npm install
npm run env:setup
npm run dev
```

`env:setup` genera `.env` con secretos aleatorios si todavía no existe. Mientras `DATABASE_URL` permanezca vacía, el login funciona en modo demostrativo.

Abra <http://localhost:3000>.

## Credenciales iniciales

El correo inicial es:

```text
archivista.central@uapa.edu.do
```

Mientras se use el modo demostrativo, la contraseña es `UapaSecure2024*`. Cuando se inicialice PostgreSQL, la contraseña de las cuentas creadas será el valor privado `SEED_USER_PASSWORD` de `.env`. Ese valor no debe enviarse al repositorio ni publicarse en mensajes del equipo.

El perfil demostrativo **Sin módulos asignados** permite verificar el estado
seguro de un usuario autenticado cuya lista de permisos está vacía. No representa
un rol institucional nuevo ni se inserta en PostgreSQL.

## Variables de entorno

| Variable | Uso | Obligatoria |
|---|---|---|
| `PORT` | Puerto HTTP de la aplicación | No, usa 3000 |
| `NODE_ENV` | `development`, `test` o `production` | Sí en despliegue |
| `API_BASE_URL` | Origen público del backend, sin rutas | Sí cuando la API está separada |
| `COOKIE_SAME_SITE` | Política temporal de cookie mientras se conserva el servidor | No, usa `strict` |
| `JWT_SECRET` | Firma criptográfica de las sesiones | Sí con PostgreSQL y producción |
| `DATABASE_URL` | Conexión utilizada por Node.js | Sí fuera del modo demostrativo |
| `DB_SSL` | Activa TLS para PostgreSQL remoto | Según infraestructura |
| `SEED_USER_PASSWORD` | Contraseña de usuarios iniciales | Sí para inicializar datos |
| `ALLOW_DEMO_MODE` | Autoriza datos incrustados sin PostgreSQL | Solo para demostraciones explícitas |

`.env` y cualquier variante privada están ignorados por Git. El repositorio solo debe contener `.env.example` con valores ficticios.

## Comandos

```bash
npm run dev        # Servidor con reinicio automático
npm start          # Servidor sin modo watch
npm run env:setup  # Genera .env si no existe
npm run db:init    # Aplica esquema y usuarios iniciales
npm test           # Autenticación y cliente de API, sin depender de PostgreSQL
npm run test:db    # Prueba la conexión y el esquema PostgreSQL
npm run verify     # Ejecuta ambas suites
```

## Contrato de API consumido

| Método | Ruta | Protección | Propósito |
|---|---|---|---|
| `GET` | `/api/v1/estado` | Pública | Consulta el estado del servicio |
| `POST` | `/api/v1/sesiones` | Límite de intentos | Inicia una sesión y devuelve la identidad |
| `GET` | `/api/v1/usuarios/actual` | Sesión | Devuelve identidad y permisos efectivos |
| `DELETE` | `/api/v1/sesiones/actual` | Sesión | Cierra la sesión con `204 No Content` |

El segmento `actual` identifica al usuario o a la sesión autenticada. El cierre
de sesión de destino debe responder `204 No Content`, sin cuerpo JSON.
El cliente usa esas cuatro rutas. Las respuestas exitosas se leen desde `data`;
`meta` puede acompañar la respuesta sin alterar el recurso. Los errores se
interpretan mediante `codigo`, sin mostrar `title` o `detail` del servidor.

Antes de validar la integración entre repositorios se deben confirmar con backend:

- La versión integrada de la API y la disponibilidad de las cuatro rutas.
- Los cuerpos de solicitud y respuesta de autenticación, identidad y estado,
  incluidos los permisos efectivos, códigos de error y validaciones por campo.
- Los orígenes y puertos por entorno, la configuración de CORS y las cookies.
- La autorización para retirar el servidor actual sin interrumpir el acceso.

## Configuración pública de la API

La variable `API_BASE_URL` del entorno define el origen del backend. El servidor
publica únicamente ese dato no secreto mediante `/runtime-config.js` y
`public/config.js` lo entrega al cliente. Si está vacía, las peticiones usan el
mismo origen que la interfaz.

Cuando se acuerde una API separada, el valor debe ser únicamente su origen
HTTP o HTTPS, sin rutas como `/api/v1`, sin usuario, contraseña, query ni fragmento.
No hay una dirección definitiva del mentor confirmada; no debe inventarse.

| Entorno | Valor de `API_BASE_URL` | Estado |
|---|---|---|
| Desarrollo actual, interfaz y API juntas | `''` | Conserva el funcionamiento actual |
| Desarrollo con backend separado | Origen por confirmar con backend | Implementación lista; falta el valor |
| Entorno del mentor | Origen por confirmar con el mentor | Implementación lista; falta el valor |

Este archivo llega al navegador: **no es un lugar para secretos**. No contiene
`DATABASE_URL`, `JWT_SECRET` ni contraseñas. El navegador recibe solamente
`API_BASE_URL`; las demás variables permanecen privadas en el servidor.

`public/api.js` reúne las rutas y las peticiones. Las pantallas protegidas usan
ese cliente mediante `session.js` y módulos JavaScript nativos, sin nuevas dependencias.
El cliente limita la espera a diez segundos, comprueba errores HTTP, admite
respuestas sin contenido y muestra errores de conexión sin detalles internos.
No reintenta operaciones automáticamente. Las rutas y los cuerpos de respuesta
siguen el contrato `/api/v1`. Todas las solicitudes usan `credentials: 'include'`.
La CSP agrega exclusivamente el origen configurado. Backend debe responder con
CORS para ese mismo origen y `Access-Control-Allow-Credentials: true`; no se usan
comodines ni se desactivan protecciones del navegador.

Las decisiones de integración, las pruebas y las dependencias pendientes están en
[`docs/integracion-api.md`](docs/integracion-api.md).

## Verificación del estado actual

La última validación de la implementación dio como resultado:

- `npm test`: **26 pruebas aprobadas, ninguna fallida**. Incluye autenticación,
  configuración de URL, rutas y métodos, errores, tiempo de espera, respuestas
  sin contenido, permisos y regresiones de integración entre módulos.
- Navegador en modo demostrativo: acceso incorrecto, acceso correcto, carga de
  identidad, dashboard, revisión, observaciones, historial, cierre de sesión y
  estado seguro de un usuario sin permisos, sin errores de consola.
- Servidor temporal detenido: mensaje claro de conexión tanto en login como en
  cierre de sesión, sin simular una operación exitosa.

Estas verificaciones certifican el comportamiento del frontend y el contrato
temporal local. La prueba contra el backend independiente, sus CORS/cookies y
PostgreSQL real requiere la versión integrada y los orígenes definitivos. El procedimiento está en
[`docs/integracion-api.md`](docs/integracion-api.md).

## Seguridad

- Las consultas usan parámetros y no concatenan entradas del usuario.
- La contraseña nunca se guarda ni registra como texto plano.
- Los mensajes de credenciales incorrectas no revelan si el correo existe.
- La comparación usa un hash ficticio cuando el usuario no existe para reducir diferencias de tiempo.
- Las cuentas incrustadas no pueden activarse accidentalmente en producción.
- `auth_events` registra accesos correctos, fallidos y cierres de sesión sin registrar contraseñas ni tokens.

Para producción se requiere HTTPS, gestión institucional de secretos, copias de seguridad, política de retención de auditoría y un proveedor de identidad aprobado.

## Base de datos

La estructura y el diccionario de datos están documentados en `docs/database.md`. `profile` y `event_data` utilizan `JSONB` únicamente para atributos variables; los datos principales permanecen normalizados en columnas relacionales.

Mientras se conserve el servidor actual, su conexión se configura mediante
`DATABASE_URL` en el `.env` privado. Si se utiliza PostgreSQL local, primero
cree una base vacía llamada `sigesdoc`. Luego ejecute:

```bash
npm run db:init
npm run test:db
```

Git conserva el código y el historial de cambios, pero no ejecuta PostgreSQL ni debe almacenar sus contraseñas.

Una vez completada la separación, la conexión y las credenciales de PostgreSQL
serán responsabilidad exclusiva del backend. La interfaz consumirá la API y
no se conectará directamente a la base de datos.

## Visual Studio Code

Después de instalar dependencias y ejecutar `npm run env:setup`, puede presionar `F5` y elegir **Iniciar SIGESDOC**. Las extensiones recomendadas aparecen automáticamente al abrir la carpeta.

## Trabajo en equipo

Consulte `CONTRIBUTING.md`. Cada cambio debe desarrollarse en una rama separada y entrar a `main` mediante revisión. Nunca confirme `.env`, `node_modules` o copias de bases de datos.

## Deuda técnica conocida

- El frontend ya usa permisos efectivos; el catálogo definitivo y la autorización RBAC corresponden al backend.
- La auditoría no tiene todavía una política institucional de retención o anonimización.
- El esquema inicial se aplica desde un archivo SQL; antes de múltiples despliegues deberá incorporarse una herramienta de migraciones versionadas.
- Falta automatización CI para ejecutar pruebas en cada Pull Request.
- El almacenamiento de sesión mediante JWT es suficiente para esta fase, pero la revocación centralizada deberá evaluarse para producción.





## Interfaces incorporadas por el equipo

El repositorio incluye interfaces para dashboard, observaciones, historial y
revisión. Todas cargan la identidad desde `GET /api/v1/usuarios/actual` y muestran
sus accesos exclusivamente cuando el usuario recibe el permiso correspondiente.

El dashboard consulta únicamente el estado oficial de la API y mantiene métricas,
gráficos, actividad y alertas en cero hasta que Backend publique un contrato para
esos datos. Los gráficos usan Canvas nativo y no dependen de scripts externos.

Las pantallas de observaciones, historial y revisión están disponibles como
prototipos navegables. No envían, inventan ni muestran registros ficticios como
si fueran reales. Sus controles de escritura permanecen deshabilitados o informan
que la operación no fue enviada hasta que Backend entregue rutas versionadas,
cuerpos de datos, códigos de error y permisos definitivos.

Permisos temporales usados en la demostración:

- `expedientes:consultar` y `expedientes:buscar`;
- `expedientes:registrar` y `expedientes:revisar`;
- `observaciones:registrar`;
- `trazabilidad:consultar`;
- `reportes:consultar`.

Estos códigos permiten probar la experiencia de usuario, pero Backend debe
confirmar el catálogo institucional y autorizar cada operación en el servidor.
