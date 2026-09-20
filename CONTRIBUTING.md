# Cómo colaborar en SIGESDOC

## Regla principal

`main` representa la versión estable. Ningún integrante debe desarrollar directamente sobre ella.

## Preparación

```bash
npm install
npm run env:setup
npm test
```

Cuando backend entregue una conexión PostgreSQL, complete `DATABASE_URL` en `.env`, ejecute `npm run db:init` y luego `npm run verify`.

Cada integrante genera su propio `.env`. Las contraseñas, conexiones y tokens nunca se copian al repositorio.

## Flujo por cambio

```bash
git switch main
git pull
git switch -c feature/nombre-breve
```

Después de desarrollar y probar:

```bash
npm run verify
git add .
git commit -m "feat: descripción concreta"
git push -u origin feature/nombre-breve
```

Cree un Pull Request y solicite revisión antes de incorporar el cambio.

## Nombres de ramas

- `feature/...` para funciones nuevas.
- `fix/...` para correcciones.
- `docs/...` para documentación.
- `test/...` para pruebas.
- `refactor/...` para reorganizaciones sin cambio funcional.

## Mensajes de commit

- `feat: agregar recuperación de contraseña`
- `fix: impedir acceso de usuarios inactivos`
- `docs: documentar variables de PostgreSQL`
- `test: cubrir expiración de sesión`

## Criterios antes del Pull Request

- El código cumple el alcance solicitado.
- No contiene contraseñas, tokens ni archivos `.env`.
- Las consultas SQL están parametrizadas.
- Toda autorización importante se comprueba en el servidor.
- Las pruebas pasan con `npm run verify`.
- El README refleja cualquier comando o variable nueva.
- Los cambios de esquema se explican al equipo de backend y análisis.

## Datos y análisis

Los analistas deben trabajar con datos ficticios o anonimizados en desarrollo. No se deben copiar expedientes reales, datos personales o registros institucionales a computadoras locales sin autorización y controles aprobados.





## Contribución al módulo Dashboard

El módulo Dashboard es responsable de la visualización de información general del sistema SIGESDOC y de proporcionar una interfaz de acceso a las diferentes funcionalidades institucionales.

### Archivos principales

Los archivos principales del módulo son:

- `public/dashboard.html`
- `public/dashboard.css`
- `public/dashboard.js`
- `docs/dashboard-contract.md`

### Funcionalidades del módulo

Las contribuciones relacionadas con el Dashboard pueden incluir:

- Indicadores del sistema.
- Gráficos estadísticos.
- Actividad reciente.
- Alertas TRD.
- Búsqueda y filtrado.
- Paginación.
- Exportación de información.
- Información del usuario.
- Navegación institucional.
- Diseño responsive.
- Manejo de errores y estados vacíos.

### Integración con los servicios

El Dashboard consume información mediante:

`GET /api/dashboard`

y utiliza:

`GET /api/auth/me`

para obtener la información del usuario autenticado.

Si se modifica la estructura de respuesta de estos servicios, también debe actualizarse la documentación correspondiente en:

`docs/dashboard-contract.md`

### Reglas para realizar cambios

Antes de modificar el Dashboard se recomienda:

1. Crear una rama específica para el cambio.
2. Mantener el diseño responsive.
3. Mantener la estructura de navegación existente.
4. No colocar contraseñas, tokens u otra información sensible en el frontend.
5. No modificar directamente los datos de producción.
6. Mantener la comunicación con el backend mediante los endpoints establecidos.
7. Validar los datos recibidos antes de mostrarlos.
8. Mantener los estados vacíos cuando no existan registros.
9. Mantener el manejo de errores cuando un servicio no esté disponible.
10. Actualizar la documentación cuando se agreguen nuevas funcionalidades.

### Pruebas

Antes de realizar un Pull Request se debe verificar:

- El Dashboard carga correctamente.
- La sesión del usuario funciona.
- El nombre del usuario se muestra correctamente.
- La fecha y hora se actualizan correctamente.
- Los indicadores se muestran correctamente.
- Los gráficos cargan sin errores.
- La actividad reciente funciona.
- La búsqueda y paginación funcionan.
- La exportación CSV funciona.
- Las alertas se muestran correctamente cuando existen datos.
- Los estados vacíos funcionan cuando no existen registros.
- El mensaje de error aparece cuando el servicio del Dashboard no está disponible.
- La interfaz mantiene su funcionamiento en diferentes tamaños de pantalla.

### Responsabilidad del módulo

El Dashboard es responsable de presentar y organizar la información recibida desde los servicios del sistema.

La persistencia y administración de documentos, expedientes, usuarios, estados y datos TRD corresponde al backend y a los módulos de gestión documental correspondientes.
