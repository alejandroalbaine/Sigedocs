# Contrato de datos de plantillas curriculares

**Estado:** Contrato del MVP. Viene del documento *"SIGESDOC — Contrato de Datos para Plantillas Curriculares"* (listo para validación con Front End y Arquitectura), con estos ajustes:
1. nombres de propiedades y valores de enumeración en inglés ([ADR-011](decisions/ADR-011-english-naming-standard.md));
2. las decisiones pendientes que ya cerraron [ADR-012](decisions/ADR-012-template-versioning.md) y [ADR-013](decisions/ADR-013-dossier-lifecycle-and-versioning.md);
3. los cambios que el esquema actual necesita para soportarlo (§8).

**Ejemplo completo:** [examples/course-program-template.json](examples/course-program-template.json). Es el Programa de Asignatura con 9 secciones y 52 campos, y la semilla de la plantilla del MVP.
**Requisitos:** RF-05 a RF-12 (doc. base §16, p. 9) · §8.1 (p. 5)

---

## 1. Objetivo

Definir cómo expone el backend una versión de plantilla para que el frontend construya:
- el **formulario dinámico** del expediente (MVP);
- el **constructor de plantillas** (post-MVP).

El frontend **no** programa formularios por tipo documental (nada de `if code == COURSE_PROGRAM`). Todo sale de la versión recibida.

Fuera de alcance: estructura física del JSONB del expediente (ver §7), workflow, auditoría, firma, sellado y PDF.

## 2. Jerarquía

```
Template                 (identidad lógica: templates)
└── TemplateVersion      (definición concreta e histórica: template_versions)
    ├── sections[]
    │   └── fields[]     (un campo repeatable_group contiene config.fields[])
    └── rules[]          (reglas de documento)
```

Las secciones, los campos y las reglas pertenecen a la **versión** (ADR-012, doc. base §7.4). Una versión `published` no se modifica.

## 3. Propiedades

### 3.1 Template

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `templateId` | id opaco | Sí | Identidad lógica |
| `code` | string | Sí | Código estable (`COURSE_PROGRAM`) |
| `name` | string | Sí | Nombre visible (español) |
| `description` | string | No | — |
| `documentTypeId` | id opaco | Sí | En el MVP hay un solo tipo: programa de asignatura |
| `academicLevels` | string[] | Sí | `associate`, `bachelor`, `graduate` (ADR-013) |
| `version` | TemplateVersion | Sí | Versión entregada |

### 3.2 TemplateVersion

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `templateVersionId` | id opaco | Sí | — |
| `versionNumber` | integer | Sí | 1, 2, 3… |
| `status` | enum | Sí | `draft` \| `published` \| `retired` (ADR-012) |
| `validFrom` / `validTo` | fecha ISO o null | No | Vigencia (RF-11) |
| `sections` | Section[] | Sí | — |
| `rules` | Rule[] | No | Reglas de documento |

### 3.3 Section

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `sectionId` | id opaco | Sí | — |
| `key` | string | Sí | Clave estable (`datos_academicos`) |
| `title` | string | Sí | Título visible |
| `description` | string | No | Texto de apoyo |
| `position` | integer | Sí | Orden |
| `isActive` | boolean | Sí | — |
| `isRequired` | boolean | Sí | — |
| `fields` | Field[] | Sí | — |
| `rules` | Rule[] | No | Reglas de sección |

La repetición no se modela en la sección; se modela con campos `repeatable_group`.

### 3.4 Field

| Propiedad | Tipo | Oblig. | Descripción |
|---|---|---|---|
| `fieldId` | id opaco | Sí | — |
| `key` | string | Sí | Clave estable. Es la clave que se usa en el contenido del expediente |
| `label` | string | Sí | Etiqueta visible |
| `type` | enum | Sí | §4 |
| `isRequired` | boolean | Sí | — |
| `isReadOnly` | boolean | No | Se muestra pero no se edita a mano |
| `position` | integer | Sí | — |
| `format` | string | No | P. ej. `percentage` |
| `help` | string | No | Ayuda |
| `defaultValue` | según el tipo | No | — |
| `options` | `{ value, label }[]` | No | Opciones estáticas |
| `optionsSource` | `{ type: "institutional_catalog", catalog }` | No | Opciones de un catálogo |
| `config` | object | No | Configuración propia del tipo |
| `rules` | Rule[] | No | Reglas del campo |

**Identificadores:** UUID (formato de la base). El frontend los trata como opacos.

**Claves (`key`) y valores de opción (`value`):** son **datos de configuración** que crea Gestión Curricular, no identificadores de código. Por eso pueden estar en español (`asignatura`, `OBLIGATORIA`). Lo que va en inglés son los nombres de las propiedades y los valores de las enumeraciones del contrato.

## 4. Tipos de campo del MVP

| `type` | Uso | Control orientativo |
|---|---|---|
| `text` | Texto corto | Input |
| `long_text` | Texto multilínea | Textarea |
| `number` | Entero o decimal (`config.decimals`); porcentaje con `format: "percentage"` | NumberInput |
| `date` | Fecha ISO 8601 (`YYYY-MM-DD`) | DatePicker |
| `boolean` | Sí/No | Checkbox/Switch |
| `select` | Una opción | Select/Radio |
| `multi_select` | Varias opciones | MultiSelect/Checks |
| `repeatable_group` | Lista, tabla o bloques de objetos | Lista/Tabla/Bloques |

**Diferidos (post-MVP):** campo calculado, archivo como campo, relaciones con otras entidades, firma y sello editables, tablas con fórmulas, anidamiento ilimitado.

## 5. Grupos repetibles y catálogos

```json
{
  "key": "competencias_fundamentales",
  "type": "repeatable_group",
  "config": {
    "presentation": "blocks",
    "sortable": true, "addable": true, "removable": true,
    "fields": [ /* Field[] */ ]
  },
  "rules": [{ "type": "cardinality", "params": { "minItems": 1, "maxItems": 10 } }]
}
```

- `config.presentation`: `table` | `blocks` | `list`.
- La cardinalidad **solo** se expresa con la regla `cardinality` (una sola fuente de verdad).
- **Anidamiento máximo: 2 niveles** (grupo → subgrupo), que es lo que usa el Programa de Asignatura (competencia → resultados de aprendizaje; unidad → temas). Un tercer nivel se rechaza al validar la plantilla.
- Catálogos: `optionsSource.catalog` ∈ `schools`, `degree_programs`, `modalities`, `methodological_strategies`, `assessment_techniques`, `assessment_instruments`, `strategies_and_assessment_techniques`. En el MVP los sirve `GET /api/v1/institutional-catalogs/{catalog}` con valores **provisionales** hasta que lleguen los oficiales (RF-41).

## 6. Reglas

Son declarativas. No se admite JavaScript, SQL ni `eval`.

```json
{
  "ruleId": "…",
  "code": "SUMA_EVALUACION_100",
  "scope": "document",
  "type": "sum_equals",
  "target": { "section": "plan_evaluacion", "fieldPath": ["componentes_evaluacion", "porcentaje"] },
  "params": { "expectedValue": 100 },
  "message": "La suma de los porcentajes del plan de evaluación debe ser igual a 100 %.",
  "severity": "error",
  "isActive": true
}
```

| `type` | Parámetros | MVP |
|---|---|---|
| `length` | `min`, `max` | ✅ |
| `pattern` | `regex` | ✅ |
| `range` | `min`, `max` | ✅ |
| `cardinality` | `minItems`, `maxItems` | ✅ |
| `sum_equals` | `expectedValue` | ✅ (plan de evaluación = 100 %, doc. base §8.4) |
| `visible_if`, `required_if` | `field`, `equals` | Post-MVP |

- `scope`: `field` | `section` | `document`. `severity`: `error` | `warning`.
- El frontend puede evaluar localmente las reglas que tenga completas. **La autoridad final es el backend** (TPL-03).

## 7. Contenido del expediente

El contenido de una versión de expediente es un objeto indexado por la `key` de la sección y luego por la `key` del campo:

```json
{
  "templateVersionId": "…",
  "content": {
    "datos_academicos": { "asignatura": "Ingeniería de Software I", "creditos": 4, "clave_asignatura": "ISW-201" },
    "competencias_fundamentales": {
      "competencias_fundamentales": [
        { "itemId": "…", "codigo_competencia": "CF1", "competencia": "…", "resultados_aprendizaje": [ { "itemId": "…" } ] }
      ]
    }
  }
}
```

- Cada elemento de un `repeatable_group` lleva un **`itemId`** (UUID generado por el cliente). Sirve para que las observaciones (WF-04) y la comparación de versiones apunten a un elemento concreto aunque se reordene.
- El valor de un catálogo se guarda como `{ "value": "…", "label": "…" }`, para conservar la etiqueta que tenía al momento de guardarse aunque luego se renombre.

## 8. Cambios que necesita el esquema actual

| # | Brecha | Cambio | Ticket |
|---|---|---|---|
| 1 | `campo.tipo` solo admite `texto, numero, booleano, fecha, seleccion, lista, objeto` | CHECK con los 8 tipos de §4 | TPL-01 |
| 2 | No hay campos anidados | `parent_field_id` en campo (normalizado, conforme a ADR-001) | TPL-01 |
| 3 | No hay tabla de reglas | `template_rules` (`scope`, `section_id`/`field_id`, `type`, `target`, `params`, `message`, `severity`, `is_active`) | TPL-01 |
| 4 | Sección sin `description`, `is_active` ni `is_required`; campo sin `is_read_only`, `format` ni `help` | Nuevas columnas | TPL-01 |
| 5 | La plantilla no se separa en lógica y versión | `templates` + `template_versions` (ADR-012) | TPL-01 |

## 9. Rutas del MVP

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/v1/templates` | Listar plantillas |
| `GET` | `/api/v1/templates/{templateId}/versions/{templateVersionId}` | Definición completa (forma de §3) |
| `GET` | `/api/v1/templates/{templateId}/versions?status=published&validOn=YYYY-MM-DD` | **Versión vigente** (cierra la decisión pendiente 2 del documento de origen) |
| `GET` | `/api/v1/institutional-catalogs/{catalog}` | Opciones de un catálogo |

Rutas de escritura (constructor de plantillas): ver ADR-012. En el MVP la plantilla se carga por migración a partir del ejemplo.

## 10. Estado de las decisiones pendientes del documento de origen

| # | Pendiente original | Estado |
|---|---|---|
| 1 | ¿Secciones, campos y reglas pertenecen a la versión? | ✅ Sí (ADR-012) |
| 2 | Cómo resolver la versión vigente | ✅ Filtro sobre `/versions` (§9) |
| 3 | Formato de los IDs | ✅ UUID |
| 4 | Tipos del MVP | ✅ §4 |
| 5 | Anidamiento máximo | ✅ 2 niveles |
| 6 | Identificador de cada elemento repetible | ✅ `itemId` (§7) |
| 7 | Códigos y filtros oficiales de catálogos | ⏳ Depende de Gestión Curricular (RF-41) |
| 8 | Conservar valores históricos de catálogo | ✅ Se guarda `{ value, label }` (§7) |
| 9 | Tipos de regla, operadores y severidades | ✅ §6 (catálogo del MVP) |
| 10 | `isReadOnly` como propiedad del campo | ✅ Sí |
| 11 | Rutas de administración de secciones, campos y reglas | ✅ ADR-012 (post-MVP) |
| 12 | Payload definitivo de expedientes | ✅ §7 y ADR-013 |
| 13 | Confirmación formal de Front End | ⏳ Falta: que el frontend responda la prueba de suficiencia (§11) |

## 11. Prueba de suficiencia (la firma el frontend)

Usando solo este contrato, el frontend debe poder responder:
- qué versión se usa;
- qué secciones y campos hay, cuáles son obligatorios y cuáles repetibles;
- qué opciones son estáticas y cuáles vienen de un catálogo;
- cómo se representan las competencias con sus resultados de aprendizaje, las unidades y la evaluación;
- qué reglas puede evaluar en el cliente, qué mensaje mostrar y qué valida solo el backend.

Si para alguna tiene que inventar una propiedad, este contrato se corrige antes de implementarlo.
