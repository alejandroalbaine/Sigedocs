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

La recuperación de contraseña, identidad única UAPA, 2FA y los módulos documentales todavía no están implementados.

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
├── docs/database.md      Diccionario y decisiones de la base de datos
├── public/               Interfaz del login y panel protegido
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

## Variables de entorno

| Variable | Uso | Obligatoria |
|---|---|---|
| `PORT` | Puerto HTTP de la aplicación | No, usa 3000 |
| `NODE_ENV` | `development`, `test` o `production` | Sí en despliegue |
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
npm test           # Pruebas de autenticación sin depender de PostgreSQL
npm run test:db    # Prueba la conexión y el esquema PostgreSQL
npm run verify     # Ejecuta ambas suites
```

## Endpoints actuales

| Método | Ruta | Protección | Propósito |
|---|---|---|---|
| `GET` | `/api/health` | Pública | Estado mínimo del servicio y la base de datos |
| `POST` | `/api/auth/login` | Límite de intentos | Inicia una sesión |
| `GET` | `/api/auth/me` | Sesión | Devuelve el perfil autenticado |
| `POST` | `/api/auth/logout` | Sesión | Audita y cierra la sesión |

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

Cuando backend entregue la conexión, complete `DATABASE_URL` en `.env`. Si se utiliza PostgreSQL local, primero cree una base vacía llamada `sigesdoc`. Luego ejecute:

```bash
npm run db:init
npm run test:db
```

Git conserva el código y el historial de cambios, pero no ejecuta PostgreSQL ni debe almacenar sus contraseñas.

## Visual Studio Code

Después de instalar dependencias y ejecutar `npm run env:setup`, puede presionar `F5` y elegir **Iniciar SIGESDOC**. Las extensiones recomendadas aparecen automáticamente al abrir la carpeta.

## Trabajo en equipo

Consulte `CONTRIBUTING.md`. Cada cambio debe desarrollarse en una rama separada y entrar a `main` mediante revisión. Nunca confirme `.env`, `node_modules` o copias de bases de datos.

## Deuda técnica conocida

- Los roles todavía son un atributo del usuario; cuando existan permisos por módulo se deberá implementar autorización RBAC en el servidor.
- La auditoría no tiene todavía una política institucional de retención o anonimización.
- El esquema inicial se aplica desde un archivo SQL; antes de múltiples despliegues deberá incorporarse una herramienta de migraciones versionadas.
- Falta automatización CI para ejecutar pruebas en cada Pull Request.
- El almacenamiento de sesión mediante JWT es suficiente para esta fase, pero la revocación centralizada deberá evaluarse para producción.





## Módulo Dashboard

El módulo Dashboard de SIGESDOC constituye la pantalla principal de visualización del sistema. Su objetivo es presentar de manera organizada y sencilla la información relacionada con la gestión documental curricular.

### Funcionalidades desarrolladas

En el desarrollo del Dashboard se implementaron las siguientes funcionalidades:

- Diseño de la interfaz principal del Dashboard.
- Navegación institucional mediante menú lateral.
- Visualización del logo y elementos de identidad visual de SIGESDOC.
- Indicadores generales del sistema.
- Gráfico de Ingreso y Radicación Mensual de Documentos.
- Gráfico de Estado de Trámite.
- Sección de Actividad Reciente en el Sistema.
- Sección de Alertas TRD.
- Búsqueda y filtrado de registros.
- Paginación de la actividad reciente.
- Exportación de registros en formato CSV.
- Visualización automática de la fecha y hora.
- Visualización del nombre del usuario autenticado.
- Visualización del rol y unidad institucional del usuario.
- Menú de perfil del usuario.
- Función de cierre de sesión.
- Diseño adaptable para diferentes tamaños de pantalla.
- Manejo visual de errores cuando no es posible obtener los datos del Dashboard.

### Integración con el sistema

El Dashboard está preparado para recibir información desde los servicios del sistema mediante:

`GET /api/dashboard`

Este servicio proporciona la información utilizada por los indicadores, gráficos, actividad reciente y alertas.

La información del usuario autenticado se obtiene mediante:

`GET /api/auth/me`

A partir de esta información se muestran en el Dashboard el nombre, rol, unidad institucional e iniciales del usuario.

### Manejo de errores

Se incorporó un mecanismo de manejo de errores para evitar que el Dashboard muestre información incorrecta cuando el servicio de datos no está disponible.

Cuando ocurre un problema durante la actualización de los datos, el sistema muestra un mensaje indicando:

> No fue posible actualizar los datos. Intente nuevamente.

Cuando no existen registros disponibles, el Dashboard presenta estados vacíos en lugar de información ficticia.

### Datos del Dashboard

Los indicadores, gráficos, actividad reciente y alertas están preparados para utilizar información real proveniente de la base de datos.

Durante la etapa de desarrollo e integración, estos valores pueden mantenerse en cero hasta que los servicios y la base de datos correspondientes proporcionen la información real.

### Archivos principales

Los principales archivos relacionados con el módulo son:

- `public/dashboard.html` — estructura de la interfaz.
- `public/dashboard.css` — estilos y diseño visual.
- `public/dashboard.js` — lógica e interacción del Dashboard.
- `docs/dashboard-contract.md` — estructura de los datos utilizados por el Dashboard.

### Alcance del módulo

El alcance de este módulo se centra en la presentación, visualización e interacción con la información proporcionada por el sistema.

La creación, almacenamiento y modificación de documentos, expedientes, usuarios y demás información documental corresponde a los servicios y módulos encargados de la gestión documental y la base de datos.