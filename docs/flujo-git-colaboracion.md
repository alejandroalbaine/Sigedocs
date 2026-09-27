# Flujo de Git para el repositorio de colaboración

## Ramas principales

- `main`: versión estable y lista para demostración.
- `develop`: reúne las tareas terminadas del equipo.
- `feature/...`: una mejora nueva.
- `fix/...`: corrección de un problema.
- `docs/...`: cambio exclusivo de documentación.

No se trabaja directamente sobre `main` ni sobre `develop`.

## Preparación inicial del compañero

```bash
git clone https://github.com/alejandroalbaine/Sigedocs.git
cd Sigedocs
npm install
git switch develop
```

Debe crear su archivo `.env` a partir de `.env.example`. El `.env` nunca se sube a Git.

## Comenzar una tarea

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/nombre-corto-de-la-tarea
```

Ejemplo: `feature/filtros-expedientes`.

## Guardar y subir el avance

```bash
git status
git add .
git commit -m "feat: agregar filtros de expedientes"
git push -u origin feature/nombre-corto-de-la-tarea
```

Después se abre un Pull Request hacia `develop`. El compañero revisa el cambio y las pruebas deben
estar aprobadas antes de integrarlo.

## Antes de solicitar revisión

```bash
npm run typecheck
npm test
npm run lint
npm run lint:css
npm run build
```

## Preparar una versión estable

Cuando todas las tareas estén revisadas, el líder abre un Pull Request de `develop` hacia `main`.
Así `main` siempre representa una versión ordenada y comprobada.

## Entrega posterior al repositorio institucional

Solo el líder conserva el remoto `institucional`. Cuando la versión en `main` esté terminada:

```bash
git switch main
git pull --ff-only origin main
git fetch institucional
git switch -c feature/entrega-sigesdoc institucional/main
git merge main
```

Después de resolver cualquier diferencia y repetir todas las pruebas, se sube esa rama al
repositorio institucional y se solicita revisión. Nunca se sobrescribe su `main` directamente.
