# Registro de deuda técnica del frontend

> Issue DG-03 · M1-A1 Diagnóstico · medido el 2026-11-09 sobre la rama de trabajo (v0.3.0).
> Alcance: análisis. Este documento **registra** la deuda; no la corrige.

## Resumen

| ID    | Deuda                                          | Medición                                                              | Prioridad | Estimación de pago |
| ----- | ---------------------------------------------- | --------------------------------------------------------------------- | --------- | ------------------ |
| DT-01 | Componentes de más de 250 líneas               | 3 principales: 779, 593 y 517 líneas (más 6 archivos entre 251 y 481) | Alta      | 8 pts              |
| DT-02 | Un solo bundle sin división por pantalla       | `index-*.js` = 508 kB (156 kB gzip); solo 1 `lazy()`                  | Media     | 3 pts              |
| DT-03 | Carga de datos manual (`useRecurso`) sin caché | 7 archivos, 15 llamadas, sin librería de caché                        | Media     | 5 pts              |

Las estimaciones son iniciales y deben validarse en la planificación del sprint.

## DT-01 · Componentes de más de 250 líneas

Archivos fuente (sin pruebas) que superan las 250 líneas:

| Líneas | Archivo                                          | Tipo                                      |
| -----: | ------------------------------------------------ | ----------------------------------------- |
|    779 | `src/pages/Registro/RegistroPage.tsx`            | Página (componente)                       |
|    593 | `src/pages/Revision/RevisionPage.tsx`            | Página (componente)                       |
|    517 | `src/features/programa/FormularioPrograma.tsx`   | Formulario (componente)                   |
|    442 | `src/features/versiones/ComparadorVersiones.tsx` | Componente                                |
|    378 | `src/pages/Dashboard/DashboardPage.tsx`          | Página (componente)                       |
|    380 | `src/pages/UiKit/UiKitPage.tsx`                  | Solo desarrollo (`import.meta.env.DEV`)   |
|    481 | `src/common/api/templateContract.ts`             | Contrato/validadores, no es un componente |
|    412 | `src/features/versiones/comparacion.ts`          | Lógica pura, no es un componente          |
|    407 | `src/common/api/dossierContract.ts`              | Contrato/validadores, no es un componente |

Los tres primeros son los citados en el criterio de aceptación y la medición los confirma.
Los módulos de contrato y de lógica pura son largos por naturaleza (tablas de validación); se
registran pero tienen menor urgencia.

**Impacto:** cambios difíciles de revisar, pruebas lentas de escribir y conflictos de merge
frecuentes entre integrantes que tocan la misma pantalla.

**Propuesta de pago:** extraer por responsabilidad (estado y consultas a hooks propios, secciones
visuales a subcomponentes). Orden sugerido: `RegistroPage` → `RevisionPage` → `FormularioPrograma`.
Meta: ningún componente por encima de 250 líneas, comprobable con la regla `max-lines` de ESLint.

## DT-02 · Bundle único sin división por pantalla

`vite build` produce:

| Chunk                      |    Tamaño |      gzip |
| -------------------------- | --------: | --------: |
| `index-*.js`               | 508.01 kB | 155.92 kB |
| `ComparadorVersiones-*.js` |  15.47 kB |   5.52 kB |

- Vite emite la advertencia de «chunks mayores de 500 kB».
- `src/router.tsx` importa de forma estática las 12 páginas. La única carga diferida existente es
  `ComparadorVersiones`, dentro de `RevisionPage`.
- Un usuario que solo inicia sesión descarga también Registro, Revisión, Reportes, etc.

**Propuesta de pago:** pasar las rutas a `lazy()` con `Suspense` en el router (empezando por
Registro, Revisión, Reportes y Usuarios) y evaluar `build.rolldownOptions.output.codeSplitting`
para separar las dependencias de terceros. Meta: chunk de entrada por debajo de 500 kB sin
advertencia.

## DT-03 · Carga de datos manual sin caché

`src/common/api/useRecurso.ts` es un hook propio basado en `useState` + `useEffect`.

- Se usa en 7 archivos (15 llamadas): `RevisionPage`, `ObservacionesPage`, `FormularioPrograma`,
  `HistorialPage`, `UsuariosPage`, `AsignacionExpediente` y `ComparadorVersiones`.
- Sin caché: al volver a una pantalla o cambiar de pestaña se repite la misma consulta.
- Sin deduplicación: dos componentes que piden el mismo recurso hacen dos solicitudes.
- Sin revalidación ni invalidación tras una mutación: depende de llamar a `reload()` a mano.
- La identidad de la consulta se calcula con `JSON.stringify(deps)` y requiere un
  `eslint-disable react-hooks/exhaustive-deps`, señal de fragilidad.
- Ya existe una necesidad de consulta paginada (`useDossiersPaginados`) con lógica separada.

**Propuesta de pago:** adoptar una librería de caché de consultas (por ejemplo TanStack Query) o
añadir una caché por clave en `useRecurso`, con invalidación tras mutaciones. Migrar pantalla a
pantalla manteniendo la misma interfaz (`data`, `loading`, `error`, `pendiente`, `reload`).

## Orden recomendado

1. **DT-02** — de bajo riesgo y mejora medible de inmediato.
2. **DT-03** — hacerlo antes de partir las páginas grandes evita migrar el mismo código dos veces.
3. **DT-01** — el trabajo más largo; hacerlo incrementalmente, una página por PR.

## Cómo volver a medir

```bash
# Líneas por archivo (sin pruebas)
find src -name '*.ts' -o -name '*.tsx' | grep -v '\.test\.' | xargs wc -l | sort -rn | head

# Tamaño del bundle
npx vite build

# Uso del hook de carga
grep -rn "useRecurso(" src | grep -v test
```
