/**
 * Modelo de observaciones del contrato B6, tal como lo entrega SIGESDOC_BACKEND.
 *
 * Fuente: `src/modules/workflow/presentation/mappers/observation.mapper.ts`
 * (`ObservationResponse`) y `database/migrations/012_observations.up.sql`.
 *
 * Puntos donde el contrato difiere de una lectura superficial de `contratos/endpoints.md`:
 * - La versión viene anidada en `version: { versionId, label }`, no en un campo plano.
 * - El autor viene en `createdBy: { userId, name }` y la fecha en `createdAt`.
 * - **No existe estado de observación**: la tabla es inmutable y no tiene columna de
 *   estado, así que la interfaz no ofrece ni filtro por estado.
 * - `sectionKey` y `fieldKey` usan el formato de TPL-02 (`^[a-z][a-z0-9_]*$`) y el
 *   servidor exige que la sección exista en la plantilla de la versión.
 * - El texto admite de 1 a 5000 caracteres (`MAX_OBSERVATION_LENGTH`).
 */

/** Longitud mínima del texto: el servidor solo exige un carácter no vacío. */
export const MINIMO_TEXTO_OBSERVACION = 1;

/** Longitud máxima, tomada de `MAX_OBSERVATION_LENGTH` en el backend. */
export const MAXIMO_TEXTO_OBSERVACION = 5000;

/** Versión sobre la que se observa, con la etiqueta `v<major>.<minor>` calculada por el servidor. */
export interface VersionObservada {
  versionId: string;
  label: string;
}

/** Observación tal como la devuelve el backend. */
export interface Observacion {
  id: string;
  expedienteId: string;
  /** Versión observada; el servidor solo admite `IN_REVIEW` o `IN_REEVALUATION`. */
  version: VersionObservada;
  /** Texto de la observación (`text` en el contrato). */
  descripcion: string;
  /** Nombre de quien la registró, resuelto por el servidor desde la sesión. */
  autor: string;
  autorId: string;
  /** Fecha y hora de registro en ISO 8601 (`createdAt`). */
  fecha: string;
  /** Clave de sección observada (`sectionKey`), opcional. */
  seccion?: string;
  /** Clave de campo observado (`fieldKey`), opcional. Implica `seccion`. */
  campo?: string;
  /** Identificador del ítem observado (`itemId`), opcional. Implica `campo`. */
  itemId?: string;
}

/** Cuerpo de `POST /dossiers/{dossierId}/observations`. */
export interface NuevaObservacion {
  /** Versión sobre la que se observa. Obligatorio y con formato UUID. */
  versionId: string;
  /** Texto de la observación. Obligatorio. */
  texto: string;
  /**
   * Sección observada (`sectionKey`). Debe existir en la plantilla de la versión.
   * Los opcionales admiten `undefined` explícito porque el proyecto usa
   * `exactOptionalPropertyTypes` y el formulario los limpia así al cambiar de sección.
   */
  seccion?: string | undefined;
  /** Campo observado (`fieldKey`). Exige `seccion`. */
  campo?: string | undefined;
  /** Ítem observado (`itemId`). Exige `campo`. */
  itemId?: string | undefined;
}

/**
 * Filtros de la lista. El backend solo admite `versionId`; `desde` y `hasta` se
 * aplican en la interfaz porque el contrato no expone un rango de fechas en esta ruta.
 */
export interface FiltrosObservacion {
  versionId: string;
  desde: string;
  hasta: string;
}

export const FILTROS_OBSERVACION_VACIOS: FiltrosObservacion = {
  versionId: '',
  desde: '',
  hasta: '',
};

/** Errores de validación del formulario, por campo. */
export type ErroresObservacion = Partial<Record<keyof NuevaObservacion, string>>;

/**
 * Valida lo mismo que exige el servidor, para no hacer un viaje de ida y vuelta.
 * El backend sigue siendo la autoridad: esto no reemplaza su validación.
 */
export function validarObservacion(borrador: NuevaObservacion): ErroresObservacion {
  const errores: ErroresObservacion = {};
  const texto = borrador.texto.trim();

  if (!borrador.versionId) {
    errores.versionId = 'Seleccione la versión a observar.';
  }
  if (!texto) {
    errores.texto = 'Escriba la descripción de la observación.';
  } else if (texto.length > MAXIMO_TEXTO_OBSERVACION) {
    errores.texto = `La descripción no puede superar ${MAXIMO_TEXTO_OBSERVACION} caracteres.`;
  }
  if (borrador.campo && !borrador.seccion) {
    errores.campo = 'Indique la sección del campo observado.';
  }
  if (borrador.itemId && !borrador.campo) {
    errores.itemId = 'Indique el campo del elemento observado.';
  }
  return errores;
}

/** Filtra por fecha y versión en la interfaz; el texto se aplica sin cambios. */
export function filtrarPorFecha(
  observaciones: readonly Observacion[],
  filtros: Pick<FiltrosObservacion, 'desde' | 'hasta'>,
): Observacion[] {
  return observaciones.filter((observacion) => {
    const dia = observacion.fecha.slice(0, 10);
    return (!filtros.desde || dia >= filtros.desde) && (!filtros.hasta || dia <= filtros.hasta);
  });
}
