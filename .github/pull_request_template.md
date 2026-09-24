## Descripción

<!-- Qué hace este PR y por qué. Enlaza el ticket. -->

Ticket: #

## Tipo de cambio

- [ ] `feat` — nueva funcionalidad
- [ ] `fix` — corrección de error
- [ ] `refactor` / `chore` / `docs` / `test`

## Checklist

- [ ] Toda llamada a la API pasa por `src/common/api/client.ts` y usa los tipos de `contract.ts`.
- [ ] Los tipos del contrato coinciden con el backend (fuente: `SIGESDOC_BACKEND/docs`, ADR-009).
- [ ] Las opciones nuevas se protegen con `<Can>` o `RequirePermission`, nunca por nombre de rol.
- [ ] Los estilos solo usan tokens de `src/common/styles/tokens.css` (sin colores sueltos).
- [ ] Un componente usado por dos features se movió a `src/common/components`.
- [ ] Incluye pruebas para el comportamiento agregado o modificado.
- [ ] El check de CI `Lint, pruebas y build` está en verde (no se mergea en rojo).

## Cómo probar

<!-- Pasos para validar el cambio manualmente contra el backend, si aplica -->
