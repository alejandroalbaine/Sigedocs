/**
 * Llamadas del contrato MVP de expedientes. Toda respuesta pasa por su validador de
 * dossierContract.ts; si no cumple, se lanza "respuesta no válida".
 */
import { validatedRequest as request } from './domainClient.ts';
import { ApiError, INVALID_RESPONSE } from './errors.ts';
import {
  parseAssignment,
  parseCatalog,
  parseSubjects,
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
import { parseTemplateMetadata, parseTemplateVersion } from './templateContract.ts';

const id = (value: string) => encodeURIComponent(value);
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

async function listAllDossiers(query = '', signal?: AbortSignal) {
  const items = new Map<string, ReturnType<typeof parseDossier>>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const suffix: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const { data, meta } = await request(
      `/dossiers?limit=25${query}${suffix}`,
      parseDossiers,
      signal ? { signal } : {},
    );
    for (const item of data) items.set(item.dossierId, item);
    cursor = meta?.pagination?.nextCursor ?? null;
    if (cursor) {
      if (cursors.has(cursor)) throw new ApiError(INVALID_RESPONSE);
      cursors.add(cursor);
    }
  } while (cursor);
  return { data: [...items.values()] };
}

export const PAGE_SIZE = 25;

/** Filtros que el servidor aplica en `GET /dossiers`; los vacíos no se envían. */
export interface DossierFilters {
  search?: string;
  currentState?: string;
  academicLevel?: string;
  schoolCode?: string;
}

export function dossiersPagePath(filters: DossierFilters, cursor: string | null) {
  const params = [`limit=${String(PAGE_SIZE)}`];
  for (const key of ['search', 'currentState', 'academicLevel', 'schoolCode'] as const) {
    const value = filters[key];
    if (value) params.push(`${key}=${id(value)}`);
  }
  if (cursor) params.push(`cursor=${id(cursor)}`);
  return `/dossiers?${params.join('&')}`;
}

/** Una página de expedientes (filtros y cursor en el servidor), validada contra el contrato. */
async function listDossiersPage(
  filters: DossierFilters = {},
  cursor: string | null = null,
  signal?: AbortSignal,
) {
  const { data, meta } = await request(
    dossiersPagePath(filters, cursor),
    parseDossiers,
    signal ? { signal } : {},
  );
  return { data, nextCursor: meta?.pagination?.nextCursor ?? null };
}

/**
 * Una ruta confirmada en el contrato que el backend aún no implementa responde 404. Como el
 * expediente sí existe (llegó en el listado), la interfaz lo presenta como "pendiente".
 */
export function esRutaPendiente(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

export const dossiersApi = {
  list: (query = '') => request(`/dossiers?limit=25${query}`, parseDossiers),
  listAll: listAllDossiers,
  page: listDossiersPage,
  get: (dossierId: string) => request(`/dossiers/${id(dossierId)}`, parseDossier),
  create: (input: CreateDossierInput) => request('/dossiers', parseDossier, post(input)),
  versions: (dossierId: string) => request(`/dossiers/${id(dossierId)}/versions`, parseVersions),
  availableTransitions: (dossierId: string) =>
    request(`/dossiers/${id(dossierId)}/available-transitions`, parseAvailableTransitions),
  transition: (
    dossierId: string,
    body: { transitionId: string; versionId: string; observation?: string; specialistId?: string },
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
  /**
   * Especialistas asignables a un expediente (backend v0.2.0, `workflow.assign`). Si el servidor
   * no publica esa ruta, se usa el listado de usuarios filtrado por rol.
   */
  specialists: async (dossierId: string) => {
    try {
      return await request(`/dossiers/${id(dossierId)}/assignment-candidates`, parseSpecialists);
    } catch (reason) {
      if (!esRutaPendiente(reason)) throw reason;
      try {
        return await request(
          '/users?roleCode=CURRICULUM_SPECIALIST&isActive=true&limit=100',
          parseSpecialists,
        );
      } catch (alterno) {
        // Un servidor anterior a v0.2.0 exige users.manage para listar usuarios: la Dirección
        // no lo tiene. Se informa como función en preparación, no como falta de permiso.
        if (alterno instanceof ApiError && alterno.status === 403) throw reason;
        throw alterno;
      }
    }
  },
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
  get: (templateId: string) => request(`/templates/${id(templateId)}`, parseTemplateMetadata),

  version: (templateId: string, templateVersionId: string) =>
    request(`/templates/${id(templateId)}/versions/${id(templateVersionId)}`, parseTemplateVersion),

  catalog: (catalog: string) => request(`/institutional-catalogs/${id(catalog)}`, parseCatalog),
};
export const subjectsApi = {
  list: () => request('/subjects', parseSubjects),
};
