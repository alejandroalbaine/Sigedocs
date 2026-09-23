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





## Integración de módulos de interfaz

- Toda llamada confirmada debe pasar por `public/api.js`; no se escriben rutas en
  cada pantalla.
- No se agregan endpoints supuestos. Si Backend no publicó un contrato, la
  interfaz presenta un estado pendiente y no simula un guardado exitoso.
- Los datos públicos usan los nombres en español definidos por el contrato.
- Las opciones se relacionan con `data-permission` y nunca se habilitan por el
  nombre del rol.
- No se incorporan scripts remotos sin una decisión de seguridad documentada.
- Un cambio en autenticación, rutas o permisos debe incluir una prueba de
  regresión y actualizar `docs/integracion-api.md`.
