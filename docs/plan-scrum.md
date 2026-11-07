# Organización Scrum del equipo de SIGESDOC Frontend

Propuesta del 7 de noviembre de 2026, a partir de [informe-diagnostico.md](informe-diagnostico.md).
Los nombres de las personas y las estimaciones son una propuesta para confirmar con el equipo en la
planificación; este documento no asigna a nadie por su cuenta.

## 1. Roles y responsabilidades

| Rol                  | Responsabilidad                                                                                               | Quién                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Product Owner        | Ordena el Product Backlog, define el valor y acepta o rechaza historias. Es el enlace con el mentor y la UAPA | Por confirmar                      |
| Scrum Master         | Cuida el proceso, quita impedimentos y modera los eventos. No es jefe del equipo                              | Por confirmar                      |
| Equipo de desarrollo | Estima, construye, prueba y entrega el incremento. Respeta el flujo de Git (`docs/flujo-git-colaboracion.md`) | Integrantes con commits en el repo |
| Enlace con backend   | Coordina rutas pendientes y cambios de contrato con `SIGESDOC_BACKEND` (REF-02, catálogos, correos)           | Por confirmar (puede ser un dev)   |

## 2. Eventos y cadencia

| Evento                   | Duración  | Cuándo                           |
| ------------------------ | --------- | -------------------------------- |
| Sprint                   | 2 semanas | Lunes a viernes de la 2.ª semana |
| Planificación del sprint | 1,5 h     | Primer día                       |
| Daily                    | 15 min    | Cada día                         |
| Revisión del sprint      | 1 h       | Último día, con demo             |
| Retrospectiva            | 45 min    | Último día, tras la revisión     |
| Refinamiento del backlog | 1 h       | A mitad de sprint                |

## 3. Definición de «Hecho»

1. El código está en una rama `feature/` o `fix/` y se integra en `develop` mediante PR revisado.
2. `npm run check` pasa completo (formato, tipos, pruebas, lint, stylelint y build).
3. Hay una prueba que falla sin el cambio y pasa con él.
4. La documentación afectada (README, CHANGELOG, `docs/`) está actualizada.
5. El Product Owner lo acepta en la revisión.

## 4. Product Backlog inicial

Prioridad: P1 alta, P2 media, P3 baja. Puntos: escala de Fibonacci (propuesta).

| ID    | Historia de usuario                                                                                                                   | Prio | Pts | Origen                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- | --- | --------------------------------- |
| PB-01 | Como especialista, quiero que el formulario del programa traiga la escuela y la carrera del registro para no volver a elegirlas       | P1   | 3   | D-01 (hecho)                      |
| PB-02 | Como usuario de solo consulta, quiero no ver el checklist técnico para no confundirlo con una acción que puedo realizar               | P1   | 3   | D-02 (hecho)                      |
| PB-03 | Como equipo, quiero un README fiel al estado real para no inducir a error a quien se incorpora                                        | P3   | 1   | D-03 (hecho)                      |
| PB-05 | Como equipo, quiero la lista de los defectos abiertos del Módulo V en un solo lugar (issues de GitHub) para planificar su corrección  | P1   | 2   | D-05                              |
| PB-06 | Como coordinador, quiero dar de alta asignaturas desde la interfaz para no depender de una carga externa del catálogo                 | P1   | 8   | Pendiente v0.3.0                  |
| PB-07 | Como Dirección, quiero que las notificaciones por correo se envíen de verdad para que cada responsable se entere del cambio de estado | P2   | 5   | Pendiente v0.3.0 (depende de TI)  |
| PB-08 | Como usuario, quiero que la aplicación cargue rápido, dividiendo el código por ruta                                                   | P2   | 5   | TD-02                             |
| PB-09 | Como desarrollador, quiero eliminar los permisos duplicados en español cuando el backend cierre REF-02                                | P2   | 3   | TD-01                             |
| PB-10 | Como desarrollador, quiero dividir `RegistroPage` y `RevisionPage` en piezas más pequeñas para facilitar su mantenimiento             | P3   | 8   | TD-03                             |
| PB-11 | Como equipo, quiero medir la cobertura de pruebas y ejecutar la integración contra un backend real en CI                              | P2   | 8   | TD-05                             |
| PB-12 | Como equipo, quiero actualizar `pendientes-backend.md` y `cumplimiento-contratos.md` a la v0.3.0                                      | P3   | 2   | TD-06                             |
| PB-13 | Como coordinador, quiero adjuntar archivos al expediente y conservarlos                                                               | P3   | 13  | Diferido (Informe Módulo II §5.1) |
| PB-14 | Como Dirección, quiero la rama de posgrado en el flujo                                                                                | P3   | 13  | Diferido                          |

## 5. Historias del primer sprint con criterios de aceptación

**PB-05 · Lista única de defectos**

- Cada defecto del Módulo V es un issue con pasos para reproducir, severidad y pantalla afectada.
- Cada issue enlaza con su historia del backlog.

**PB-06 · Alta de asignaturas** (se inicia el diseño en este sprint)

- Dado un usuario con permiso, cuando completa clave, nombre, créditos y prerrequisitos, entonces
  la asignatura aparece en el selector del registro.
- Los errores de validación del servidor se muestran junto al campo, sin detalle técnico.
- La ruta del backend debe estar confirmada antes de construir la pantalla.

**PB-08 · Carga por ruta**

- Cada pantalla se carga bajo demanda con `React.lazy`.
- El bloque inicial baja de 500 kB y el aviso de Vite desaparece.

## 6. Primer sprint

**Duración propuesta:** 9 al 20 de noviembre de 2026.

**Objetivo:** dejar el sistema existente sin defectos conocidos de visibilidad y datos heredados,
y preparar con el backend el alta de asignaturas.

| Ítem  | Estado al inicio | Puntos | Responsable |
| ----- | ---------------- | ------ | ----------- |
| PB-01 | Hecho            | 3      | —           |
| PB-02 | Hecho            | 3      | —           |
| PB-03 | Hecho            | 1      | —           |
| PB-05 | Por hacer        | 2      | Por asignar |
| PB-08 | Por hacer        | 5      | Por asignar |
| PB-06 | Diseño y ruta    | 3 de 8 | Por asignar |

Capacidad nueva a comprometer: 10 puntos. Los tres ítems ya hechos (7 puntos) se presentan en la
primera revisión.

**Riesgos:** el backend real no se ha podido probar en este entorno (hay que repetir la integración
antes de dar PB-01 y PB-02 por aceptados); PB-06 depende de que el backend publique la ruta;
PB-07 depende de que TI verifique el dominio de correo.

**Tablero sugerido:** Por hacer · En curso · En revisión (PR abierto) · Hecho. El Product Backlog
puede vivir en un tablero de Trello o en los issues y el proyecto de GitHub.
