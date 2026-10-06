/**
 * Secciones y campos de la plantilla de un expediente, para ubicar una observación.
 * Fuente: `GET /templates/{templateId}/versions/{templateVersionId}` (backend v0.2.0), que
 * responde la versión en la raíz con `sections[].fields[]`. Solo se usa clave y etiqueta:
 * la observación guarda `sectionKey` y `fieldKey` (snake_case, como en la plantilla).
 */
import { ContractError } from '../../common/api/contract.ts';
import type { Dossier, Observation } from '../../common/api/dossierContract.ts';
import { validatedRequest as request } from '../../common/api/domainClient.ts';

export interface CampoObservable {
  key: string;
  label: string;
}

export interface SeccionObservable {
  key: string;
  title: string;
  fields: CampoObservable[];
}

const texto = (value: unknown) => typeof value === 'string' && value.trim() !== '';
const posicion = (value: Record<string, unknown>) =>
  typeof value.position === 'number' ? value.position : 0;

function lista(value: unknown, ruta: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new ContractError(ruta);
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null)
      throw new ContractError(`${ruta}[${String(index)}]`);
    return item as Record<string, unknown>;
  });
}

export function parseEstructura(data: unknown): SeccionObservable[] {
  if (typeof data !== 'object' || data === null) throw new ContractError('templateVersion');
  const raiz = data as Record<string, unknown>;
  // Se acepta también la forma de GET /templates/{id}, con la versión anidada.
  const version =
    typeof raiz.version === 'object' && raiz.version !== null
      ? (raiz.version as Record<string, unknown>)
      : raiz;
  return lista(version.sections, 'templateVersion.sections')
    .filter((seccion) => seccion.isActive !== false)
    .sort((a, b) => posicion(a) - posicion(b))
    .map((seccion, i) => {
      if (!texto(seccion.key) || !texto(seccion.title)) {
        throw new ContractError(`templateVersion.sections[${String(i)}]`);
      }
      const fields = lista(seccion.fields ?? [], `templateVersion.sections[${String(i)}].fields`)
        .sort((a, b) => posicion(a) - posicion(b))
        .filter((campo) => texto(campo.key) && texto(campo.label))
        .map((campo) => ({ key: campo.key as string, label: campo.label as string }));
      return { key: seccion.key as string, title: seccion.title as string, fields };
    });
}

export const estructuraApi = {
  deExpediente: (dossier: Pick<Dossier, 'template'>) =>
    request(
      `/templates/${encodeURIComponent(dossier.template.templateId)}/versions/${encodeURIComponent(
        dossier.template.templateVersionId,
      )}`,
      parseEstructura,
    ),
};

/** «Datos académicos · Créditos» a partir de las claves; si no se conocen, las claves. */
export function ubicacion(
  observacion: Pick<Observation, 'sectionKey' | 'fieldKey'>,
  estructura: readonly SeccionObservable[] | null,
): string {
  const { sectionKey, fieldKey } = observacion;
  if (!sectionKey) return fieldKey ?? '';
  const seccion = estructura?.find((item) => item.key === sectionKey);
  const campo = fieldKey
    ? (seccion?.fields.find((item) => item.key === fieldKey)?.label ?? fieldKey)
    : '';
  return [seccion?.title ?? sectionKey, campo].filter(Boolean).join(' · ');
}
