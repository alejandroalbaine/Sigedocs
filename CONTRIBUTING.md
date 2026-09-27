# Cómo colaborar en SIGESDOC Frontend

## Flujo de trabajo

`main` es la versión estable y `develop` reúne el trabajo del equipo. Nadie desarrolla
directamente sobre ninguna de las dos; cada tarea sale desde `develop` y vuelve mediante Pull
Request.

```bash
git switch develop && git pull
git switch -c feature/nombre-breve
# … cambios …
npm run lint && npm run lint:css && npm run typecheck && npm test
git commit -m "feat: descripción concreta"
git push -u origin feature/nombre-breve
```

Abra un Pull Request hacia `develop` con la plantilla y pida revisión. No se integra con el CI en
rojo. Cuando una versión esté completa y revisada, el líder abre un Pull Request de `develop` hacia
`main`.

Ramas: `feature/`, `fix/`, `docs/`, `test/`, `refactor/`. Commits con el mismo prefijo
(`feat: agregar filtro por fecha`, `fix: mantener la sesión al recargar`).

## Dónde va cada cosa

| Carpeta                   | Contenido                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `src/pages/<Pagina>/`     | Una carpeta por ruta con `<Pagina>Page.tsx`, su `.module.css` (si tiene) y su `.test.tsx`. |
| `src/features/<dominio>/` | Componentes y reglas de un dominio: `revision`, `trazabilidad`, etc.                       |
| `src/common/`             | Solo lo que usan dos o más features o páginas.                                             |

**Regla de movimiento:** un componente nace en la feature que lo necesita. Cuando una segunda
feature lo necesita, se mueve a `src/common/components/`. No se crean componentes "comunes" por
adelantado.

Un archivo `.tsx` solo exporta componentes. Constantes, reglas y funciones van en un `.ts` junto
a él (`reglas.ts`, `consulta.ts`, `catalogos.ts`).

## Idioma

| Qué                                                 | Idioma                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Propiedades del contrato de la API                  | Exactamente como las define el backend (inglés `camelCase`, ADR-005).        |
| Vocabulario de dominio (carpetas, tipos, funciones) | Español, igual que los módulos del backend: `trazabilidad`, `validarAccion`. |
| Vocabulario técnico                                 | Inglés: `components`, `api`, `Button`, `useSession`.                         |
| Textos visibles para el usuario                     | Español.                                                                     |

## Estilos

- Todos los colores, radios, sombras y tamaños salen de `src/common/styles/tokens.css`.
  Stylelint rechaza cualquier color escrito fuera de ese archivo.
- Si hace falta un color nuevo, se agrega a `tokens.css` con un nombre que diga para qué sirve.
- Cada componente tiene su `*.module.css` al lado; las clases van en `kebab-case` en el CSS y se
  usan en `camelCase` desde TypeScript.
- La prop `style` de React solo para valores calculados en tiempo de ejecución (el ancho de una
  barra de progreso). Todo lo demás va en CSS Modules.

## API y permisos

- Toda llamada pasa por `src/common/api/client.ts`. Una ruta nueva se agrega ahí con su
  validador en `contract.ts` y sus pruebas, usando la forma exacta que documenta el backend.
- No se agregan rutas supuestas. Si el backend no publicó un contrato, la pantalla muestra un
  estado pendiente y no simula que guardó nada.
- Los errores se eligen por `code` (`src/common/api/errors.ts`); durante REF-02 también se acepta el
  alias documentado `codigo`. Nunca se muestra `detail`.
- Las opciones se protegen con `<Can permission>` o `RequirePermission`, nunca por nombre de
  rol. Los códigos de permiso están tipados en `src/common/auth/permissions.ts`.

## Pruebas

- Van junto al código (`*.test.ts(x)`).
- Las respuestas simuladas del backend viven en `src/test/backend.ts` y copian la forma real del
  backend. Si el backend cambia su contrato, esas fixtures cambian primero.
- Un cambio en autenticación, rutas o permisos incluye una prueba de regresión.

## Criterios antes del Pull Request

- El código cumple el alcance del ticket.
- No contiene contraseñas, tokens ni archivos `.env`.
- Lint, estilos, formato, tipos y pruebas pasan.
- El README o `docs/integracion-api.md` reflejan cualquier variable, ruta o comando nuevo.

## Datos

Se trabaja con los usuarios de prueba del backend o datos ficticios. No se copian expedientes
reales, datos personales ni registros institucionales a computadoras locales.
