# Cambios

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
