# Entrega de integración B3: Registro, Gestión y Panel

Verificada el 1 de octubre de 2026 contra `SIGESDOC_BACKEND/develop`, commit
`a02bfd9fd46e3bcfb4d0ca9c57b8c03985a413ea`. Creación/listado ya están integrados por
[DOS-01, PR #45](https://github.com/ProyectosInstitucionalesUAPA/SIGESDOC_BACKEND/pull/45).
La comparación utiliza los esquemas y mappers de `dossiers`, `docs/endpoints.md` §4 y
`src/shared/http/pagination.ts`; no depende de que una rama conserve el nombre B3.

## Diferencias corregidas

- El backend devuelve `meta.pagination.next`; el cliente buscaba `nextCursor` y perdía
  el cursor. Se normaliza `next`, manteniendo compatibilidad con los alias anteriores.
- Gestión y Panel consumían únicamente los primeros 25 expedientes. Ahora el recurso
  compartido lee todas las páginas autorizadas antes de publicar la colección, para
  que filtros, exportación e indicadores operen sobre el mismo conjunto. Se abortan
  consultas al desmontar/cambiar filtros, se eliminan duplicados y se detectan cursores
  repetidos. Un error en una página no se presenta como un listado parcial exitoso.
- Registro aplica los límites reales: título de hasta 300 caracteres y códigos de hasta 50. Normaliza espacios y recupera solo los cinco campos admitidos del borrador, para
  evitar un 422 por atributos reservados o antiguos. También vuelve a validar al enviar.
- Durante el POST se bloquean cancelar, guardar y navegar para que una respuesta tardía
  no confirme un formulario ya restablecido. Después del éxito, cancelar inicia un registro nuevo.

## Verificación ejecutada

Se creó una base PostgreSQL 17 separada, se aplicaron las 13 migraciones de `develop`
y se sembraron cuentas ficticias. Los expedientes se persistieron por HTTP real: no
son respuestas simuladas ni registros institucionales existentes.

| Verificación                                                                              | Resultado |
| ----------------------------------------------------------------------------------------- | --------- |
| Pruebas HTTP de expedientes del backend contra PostgreSQL                                 | 13/13     |
| Registro desde el asistente → lectura por ID → Gestión → Panel, con más de 25 expedientes | Pasa      |
| POST con título mayor de 300: Problem Details 422 `VALIDATION_FAILED`                     | Pasa      |
| GET sin cookie: 401                                                                       | Pasa      |

La combinación de esta rama con las pruebas de Registro del PR #4 pasó **150/150
pruebas**. Se mantienen dos entregas independientes hacia `develop`.

El recorrido de React se ejecuta con Testing Library/jsdom y transporte HTTP real.
Verifica persistencia, contrato y comportamiento; no constituye una comprobación visual
de navegador ni una prueba de CORS entre orígenes. Los archivos y notas archivísticas
siguen fuera del contrato de creación y no se envían al servidor.

## Repetir la prueba real

1. Levantar una copia del backend `develop` con una base exclusiva de desarrollo/pruebas.
2. Aplicar sus migraciones y sembrar usuarios con `database/scripts/seed-test-users.mjs`.
3. En PowerShell, desde el frontend:

```powershell
$env:B3_API_BASE_URL = 'http://localhost:3001'
$env:B3_EMAIL = 'coord.programa@uapa.edu.do'
$env:B3_PASSWORD = Read-Host 'Contraseña de la cuenta de pruebas' -MaskInput
npm run test:integration:b3
Remove-Item Env:B3_PASSWORD
```

La prueba crea 26 expedientes ficticios por ejecución, con un título único, y cierra la
sesión al terminar. No borra expedientes: el backend conserva su historial. Usar una
base descartable. La contraseña se lee del entorno y no se guarda en el repositorio.
El comando falla si falta la contraseña, el login no funciona o la API no responde;
no omite los casos silenciosamente. `npm test` conserva las pruebas simuladas del CI.

## Alcance y rendimiento

El backend no publica un endpoint agregado para el Panel. Para obtener totales completos
se recorre la colección por cursor, de forma secuencial, respetando el alcance del servidor.
El coste crece con el número de expedientes. Un futuro endpoint de indicadores permitiría
evitar esa lectura completa sin cambiar las reglas de autorización.
