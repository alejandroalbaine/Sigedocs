/**
 * Llamadas del contrato MVP de expedientes. Toda respuesta pasa por su validador de
 * dossierContract.ts; si no cumple, se lanza "respuesta no válida".
 */
import { validatedRequest as request } from './domainClient.ts';
import { ApiError } from './errors.ts';
import {
  parseAssignment,
  parseCatalog,
  parseVersionDetail,
  parseAuditEvents,
  parseAvailableTransitions,
  parseDossier,
  parseDossiers,
  parseHistory,
  parseObservation,
  parseObservations,
  parseSpecialists,
  parseTransitionResult,
  parseVersions,
  type CreateDossierInput,
} from './dossierContract.ts';
import { parseTemplateDefinition } from './templateContract.ts';

const id = (value: string) => encodeURIComponent(value);
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

/**
 * Una ruta confirmada en el contrato que el backend aún no implementa responde 404. Como el
 * expediente sí existe (llegó en el listado), la interfaz lo presenta como "pendiente".
 */
export function esRutaPendiente(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

export const dossiersApi = {
  list: (query = '') => request(`/dossiers?limit=25${query}`, parseDossiers),
  get: (dossierId: string) => request(`/dossiers/${id(dossierId)}`, parseDossier),
  create: (input: CreateDossierInput) => request('/dossiers', parseDossier, post(input)),
  versions: (dossierId: string) => request(`/dossiers/${id(dossierId)}/versions`, parseVersions),
  availableTransitions: (dossierId: string) =>
    request(`/dossiers/${id(dossierId)}/available-transitions`, parseAvailableTransitions),
  transition: (
    dossierId: string,
    body: { transitionId: string; versionId: string; observation?: string },
  ) => request(`/dossiers/${id(dossierId)}/transitions`, parseTransitionResult, post(body)),
  history: (dossierId: string) => request(`/dossiers/${id(dossierId)}/transitions`, parseHistory),
  assign: (dossierId: string, specialistId: string) =>
    request(
      `/dossiers/${id(dossierId)}/assignments`,
      (data) => parseAssignment(data),
      post({ specialistId }),
    ),
  observations: (dossierId: string, versionId?: string) =>
    request(
      `/dossiers/${id(dossierId)}/observations${versionId ? `?versionId=${id(versionId)}` : ''}`,
      parseObservations,
    ),
  addObservation: (
    dossierId: string,
    body: { versionId: string; text: string; sectionKey?: string; fieldKey?: string },
  ) =>
    request(
      `/dossiers/${id(dossierId)}/observations`,
      (data) => parseObservation(data),
      post(body),
    ),
  auditEvents: (dossierId: string, query: Record<string, string> = {}) => {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
    const suffix = params.size ? `?${params.toString()}` : '';
    return request(`/dossiers/${id(dossierId)}/audit-events${suffix}`, parseAuditEvents);
  },
  specialists: () => request('/users', parseSpecialists),
  version: (dossierId: string, versionId: string) =>
    request(`/dossiers/${id(dossierId)}/versions/${id(versionId)}`, parseVersionDetail),
  saveContent: (dossierId: string, versionId: string, content: Record<string, unknown>) =>
    request(`/dossiers/${id(dossierId)}/versions/${id(versionId)}`, parseVersionDetail, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
};

/** Motor de plantillas (template-data-contract.md §9). */
export const templatesApi = {
  version: (templateId: string, templateVersionId: string) =>
    request(
      `/templates/${id(templateId)}/versions/${id(templateVersionId)}`,
      parseTemplateDefinition,
    ),
  catalog: (catalog: string) => request(`/institutional-catalogs/${id(catalog)}`, parseCatalog),
};
