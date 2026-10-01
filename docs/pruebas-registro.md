# Entrega de pruebas de Registro

Pruebas de interacción del asistente en las rutas reales de la aplicación, con respuestas
HTTP simuladas según `SIGESDOC_BACKEND/docs/endpoints.md` §4. Son independientes de la
disponibilidad del servidor. No sustituyen la integración contra PostgreSQL.

Ejecutar: `npm test -- src/pages/Registro/RegistroPage.test.tsx`.

| Comportamiento                                                                                     | Casos |
| -------------------------------------------------------------------------------------------------- | ----- |
| Título vacío o compuesto por espacios: permanece en el primer paso, sin envío                      | 2     |
| Cada código obligatorio ausente: permanece en clasificación, sin envío                             | 3     |
| El indicador no permite saltar a un paso futuro                                                    | 1     |
| Cinco pasos, regreso y conservación de campos y notas durante la sesión                            | 1     |
| Guardar y recuperar los campos del borrador al remontar la página                                  | 1     |
| Cancelar elimina el borrador y restablece el formulario sin enviar                                 | 1     |
| Grado y técnico superior: POST con los cinco campos aceptados, confirmación y borrado del borrador | 2     |
| Envío pendiente: botón bloqueado, una solicitud y cookie de sesión                                 | 1     |
| Problem Details 422: conserva datos y borrador, oculta detalle interno y permite reintento exitoso | 1     |
| Respuesta incompleta: no muestra confirmación                                                      | 1     |
| Sin permiso de creación: asistente inaccesible y ninguna solicitud                                 | 1     |

Total: **15 casos**. Los códigos, versión, plantilla, estado, autor y fecha se reciben del
servidor; no se incluyen en el POST. La selección de archivo es local: el contrato B3 no
incluye una ruta de carga. Las notas archivísticas tampoco forman parte del POST.

La segunda entrega debe verificar Registro → Gestión → Panel contra el backend `develop`,
incluyendo autorización, respuesta 201, versión inicial, estado inicial y paginación real.
