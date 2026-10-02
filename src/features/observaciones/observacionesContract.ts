/**
 * Mapeo entre el contrato B6 y el modelo de la interfaz.
 *
 * Fuente de verdad: `ObservationResponse` en
 * `src/modules/workflow/presentation/mappers/observation.mapper.ts` del backend.
 * Si el backend cambia su forma, este es el único archivo que hay que tocar.
 */
import type { NuevaObservacion, Observacion } from './types.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAVE_CONTENIDO = /^[a-z][a-z0-9_]*$/;

function registro(value: unknown, ruta: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Observación fuera de contrato: ${ruta}`);
  }
  return value as Record<string, unknown>;
}

function texto(value: unknown, ruta: string): string {
  if (typeof value !== 'string') throw new Error(`Observación fuera de contrato: ${ruta}`);
  return value;
}

function id(value: unknown, ruta: string): string {
  const valor = texto(value, ruta);
  if (!UUID.test(valor)) throw new Error(`Observación fuera de contrato: ${ruta}`);
  return valor;
}

/** `sectionKey`, `fieldKey` y `itemId` llegan en null cuando no aplican. */
function opcionalTexto(value: unknown, ruta: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return texto(value, ruta);
}

export function mapearObservacion(value: unknown): Observacion {
  const item = registro(value, 'observation');

  const version = registro(item.version, 'observation.version');
  const createdBy = registro(item.createdBy, 'observation.createdBy');

  const seccion = opcionalTexto(item.sectionKey, 'observation.sectionKey');
  const campo = opcionalTexto(item.fieldKey, 'observation.fieldKey');
  const itemId = opcionalTexto(item.itemId, 'observation.itemId');

  return {
    id: id(item.observationId, 'observation.observationId'),
    expedienteId: id(item.dossierId, 'observation.dossierId'),
    version: {
      versionId: id(version.versionId, 'observation.version.versionId'),
      label: texto(version.label, 'observation.version.label'),
    },
    descripcion: texto(item.text, 'observation.text'),
    autor: texto(createdBy.name, 'observation.createdBy.name'),
    autorId: id(createdBy.userId, 'observation.createdBy.userId'),
    fecha: texto(item.createdAt, 'observation.createdAt'),
    ...(seccion ? { seccion } : {}),
    ...(campo ? { campo } : {}),
    ...(itemId ? { itemId } : {}),
  };
}

export function mapearObservaciones(value: unknown): Observacion[] {
  if (!Array.isArray(value)) throw new Error('Observación fuera de contrato: se esperaba una lista');
  return value.map(mapearObservacion);
}

/**
 * Cuerpo de escritura. El esquema del servidor es estricto y rechaza campos de más,
 * por eso `sectionKey`, `fieldKey` e `itemId` solo se incluyen con valor.
 */
export function cuerpoObservacion(nueva: NuevaObservacion): Record<string, string> {
  const seccion = nueva.seccion?.trim();
  const campo = nueva.campo?.trim();
  const itemId = nueva.itemId?.trim();

  if (seccion && !CLAVE_CONTENIDO.test(seccion)) {
    throw new Error('La sección debe escribirse en minúsculas y con guiones bajos.');
  }
  if (campo && !CLAVE_CONTENIDO.test(campo)) {
    throw new Error('El campo debe escribirse en minúsculas y con guiones bajos.');
  }

  return {
    versionId: nueva.versionId,
    text: nueva.texto.trim(),
    ...(seccion ? { sectionKey: seccion } : {}),
    ...(campo ? { fieldKey: campo } : {}),
    ...(itemId ? { itemId } : {}),
  };
}
