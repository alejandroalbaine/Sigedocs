# Cambios

## v0.3.0 — Módulo V: catálogo, reglas y notificaciones (8 de octubre de 2026)

Segunda versión integrada, con el backend v0.3.0. Responde a lo que pidió el mentor para el
Módulo V: la asignatura sale del catálogo oficial, cada cambio de estado se notifica por correo y
el programa cumple la Resolución No. 02-2025 del Consejo Académico. Verificada el 7 de octubre con
los 33 casos de prueba de Análisis de Datos (33 aprobados) y el flujo posterior a la aprobación
(FP-01 a FP-10).

### Funcionalidades

- Selector de asignatura desde el catálogo en el registro: búsqueda por clave o nombre,
  prerrequisitos a la vista y carreras filtradas por la escuela elegida. En el formulario del
  programa, asignatura, clave y prerrequisitos son de solo lectura (PR #13).
- Formulario del programa con los catálogos institucionales y reenvío desde el propio
  formulario (PR #12).
- Errores de validación por sección y campo, incluidas las reglas del 100 % en el plan de
  evaluación y del máximo de 10 unidades (PR #14).
- Comparador de versiones por sección y campo, con texto quitado y agregado (PR #16).
- Notificaciones por correo en el historial: cada cambio de estado con sus destinatarios y el
  estado de cada envío, sin mostrar errores técnicos (PR #17).
- Filtros por estado y nivel resueltos en el servidor y paginación por cursor en Gestión
  documental y Búsqueda avanzada (PR #10).

### Calidad y entrega

- 272 pruebas de interfaz y contrato.
- Imagen publicada para `linux/amd64` y `linux/arm64`, para el servidor ARM del proyecto (PR #15).

### Pendiente para la siguiente versión

- Defectos abiertos del Módulo V (9, de severidad media o baja), entre ellos que el formulario del
  programa no herede la escuela y la carrera del registro y que el checklist técnico se muestre a
  quien no revisa.
- Pantalla para dar de alta asignaturas; envío real de correos cuando TI verifique el dominio.

## v0.2.0 — Primer corte del MVP (2 de octubre de 2026)

Primera versión integrada con el backend v0.2.0 y PostgreSQL. Verificada desde la interfaz con un
usuario de cada rol: la Dirección asigna, la especialista revisa y devuelve (se crea la versión
1.1), la coordinación reenvía, la especialista reevalúa y la Dirección aprueba para pilotaje; el
historial y la auditoría registran cada paso.

### Funcionalidades

- Acceso con sesión en cookie httpOnly, mensajes para cuentas sin rol o inactivas y menú según
  los permisos efectivos del usuario.
- Gestión básica de usuarios y roles (CU-12): listar, filtrar, crear, editar, activar, desactivar
  y asignar roles.
- Expedientes: registro en cinco pasos, Panel principal, Gestión documental y Búsqueda avanzada,
  con paginación completa del backend.
- Detalle y revisión: asignación de especialista desde los candidatos del servidor, checklist
  técnico-curricular de cinco criterios y acciones del flujo según lo que ofrece el servidor.
- Observaciones sobre la versión vigente, ubicadas por sección y campo de la plantilla.
- Versiones del expediente, historial de estados y cronología de auditoría con filtros.
- Formulario del programa de asignatura (CU-01) generado desde la plantilla publicada; guarda
  borradores en el servidor.
- Sistema visual de Figma, sin textos técnicos ni errores en rojo; adaptado a celular.

### Calidad y entrega

- 189 pruebas de interfaz y contrato; cada respuesta del servidor se valida contra el contrato.
- Prueba de humo de la API de usuarios en Python (`scripts/pruebas-api`).
- Build de producción con Docker y nginx, con cabeceras de seguridad en todas las respuestas.
- Imagen publicada en `ghcr.io/alejandroalbaine/sigedocs` desde GitHub Actions.

### Pendiente para la siguiente versión

- Catálogos institucionales (`GET /institutional-catalogs/{catalog}`): hasta que el backend los
  publique, los campos de escuela, carreras, modalidad y estrategias del formulario del programa
  se muestran como «próximamente» y el programa no puede enviarse a revisión desde el formulario.
- Pantallas del flujo T7 a T13, permisos por rol editables y checklist como registro propio.

### Equipo Front End

Ilvin Oriel Pérez De la Cruz (jefe de Front End), Guillermo Adón Mercedes, Miguel Alejandro Albaine
Hidalgo, Mariangel Brito Hernández, Richard Guzmán Lorenzo, Ignacio Martínez Cuello, Ángel Antonio
Matos Pérez, Yernison Núñez De Jesus, Dianni Paredes Tavárez, Samuel Sánchez Núñez y Cindy Gismell
Walker Rodríguez. Coordinación e integración: Dimas Aponte Báez (Project Manager).
