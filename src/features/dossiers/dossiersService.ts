/**
 * Catálogo de expedientes, versiones y secciones de plantilla.
 *
 * Es la dependencia compartida de Observaciones (B6) e Historial (B7): ambas pantallas
 * necesitan elegir un expediente y, en el caso de las observaciones, una versión y la
 * sección sobre la que escribir. Vive en su propio módulo para no duplicar los tres
 * endpoints en cada feature.
 *
 * Endpoints reales (todos bajo /api/v1):
 * - `GET /dossiers?limit=50`
 * - `GET /dossiers/{dossierId}/versions`
 * - `GET /template-versions/{templateVersionId}/sections`
 */
import { MOCK_LATENCY_MS, USE_MOCK_DATA } from '../../common/config.ts';
import { domainRequest } from '../../common/api/domainClient.ts';
import type { Dossier } from '../../common/types.ts';

/**
 * Estados en los que el backend admite registrar observaciones.
 * Coincide con la comprobación de `PostgresObservationRepository.assertVersionObservable`.
 */
export const ESTADOS_OBSERVABLES: readonly string[] = ['IN_REVIEW', 'IN_REEVALUATION'];

const ETIQUETA_ESTADO: Readonly<Record<string, string>> = {
  RECEIVED: 'Recibido',
  ASSIGNED: 'Asignado',
  IN_REVIEW: 'En revisión',
  CHANGES_REQUIRED: 'Requiere ajustes',
  IN_REEVALUATION: 'En reevaluación',
  APPROVED_FOR_PILOT: 'Aprobado para pilotaje',
};

/** Expediente con lo mínimo que necesitan las dos pantallas. */
export interface ExpedienteResumen {
  dossierId: string;
  code: string;
  title: string;
  state: string;
  stateName: string;
  currentVersion: { versionId: string; label: string } | null;
  /** Versión de plantilla del expediente; de ahí salen las secciones. */
  templateVersionId: string;
}

export interface VersionExpediente {
  versionId: string;
  label: string;
  state: string;
  stateName: string;
}

export interface SeccionPlantilla {
  key: string;
  titulo: string;
  campos: { key: string; label: string }[];
}

export interface DossiersService {
  listar(): Promise<ExpedienteResumen[]>;
  listarVersiones(dossierId: string): Promise<VersionExpediente[]>;
  listarSecciones(templateVersionId: string): Promise<SeccionPlantilla[]>;
}

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado] ?? estado;
}

/** `true` cuando la versión admite observaciones. */
export function esObservable(estado: string | undefined): boolean {
  return estado !== undefined && ESTADOS_OBSERVABLES.includes(estado);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function aResumen(dossier: Dossier): ExpedienteResumen {
  return {
    dossierId: dossier.dossierId,
    code: dossier.code,
    title: dossier.title,
    state: dossier.currentState.code,
    stateName: dossier.currentState.name,
    currentVersion: dossier.currentVersion,
    templateVersionId: dossier.template.templateVersionId,
  };
}

interface VersionApi {
  versionId: string;
  label: string;
  state: { code: string; name: string } | null;
}

interface SeccionApi {
  key: string;
  title: string;
  isActive: boolean;
  fields: { key: string; label: string }[];
}

const PLANTILLA_DEMO = 'c1000000-0000-4000-8000-000000000001';

const EXPEDIENTES_SIMULADOS: readonly ExpedienteResumen[] = [
  {
    dossierId: 'd0000000-0000-4000-8000-000000000003',
    code: 'ECD-2026-0003',
    title: 'Contabilidad de Costos',
    state: 'IN_REVIEW',
    stateName: 'En revisión',
    currentVersion: { versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac', label: 'v1.0' },
    templateVersionId: PLANTILLA_DEMO,
  },
  {
    dossierId: 'd0000000-0000-4000-8000-000000000004',
    code: 'ECD-2026-0004',
    title: 'Bases de Datos Avanzadas',
    state: 'CHANGES_REQUIRED',
    stateName: 'Requiere ajustes',
    currentVersion: { versionId: '961d73f5-ed77-47d9-b16a-f707cc3e3b8d', label: 'v1.1' },
    templateVersionId: PLANTILLA_DEMO,
  },
];

export const dossiersServiceMock: DossiersService = {
  async listar() {
    await esperar(MOCK_LATENCY_MS);
    return [...EXPEDIENTES_SIMULADOS];
  },

  async listarVersiones(dossierId) {
    await esperar(MOCK_LATENCY_MS);
    const expediente = EXPEDIENTES_SIMULADOS.find((item) => item.dossierId === dossierId);
    return expediente?.currentVersion
      ? [
          {
            versionId: expediente.currentVersion.versionId,
            label: expediente.currentVersion.label,
            state: expediente.state,
            stateName: expediente.stateName,
          },
        ]
      : [];
  },

  async listarSecciones() {
    await esperar(MOCK_LATENCY_MS);
    return [
      {
        key: 'datos_academicos',
        titulo: 'Datos académicos',
        campos: [
          { key: 'asignatura', label: 'Asignatura' },
          { key: 'creditos', label: 'Créditos' },
        ],
      },
      { key: 'descripcion_asignatura', titulo: 'Descripción de la asignatura / módulo', campos: [] },
      { key: 'unidades_didacticas', titulo: 'Unidades didácticas', campos: [] },
      { key: 'bibliografia', titulo: 'Bibliografía', campos: [] },
    ];
  },
};

export const dossiersServiceApi: DossiersService = {
  async listar() {
    const { data } = await domainRequest<Dossier[]>('/dossiers?limit=50');
    return data.map(aResumen);
  },

  async listarVersiones(dossierId) {
    const { data } = await domainRequest<VersionApi[]>(
      `/dossiers/${encodeURIComponent(dossierId)}/versions`,
    );
    return data.map((version) => ({
      versionId: version.versionId,
      label: version.label,
      state: version.state?.code ?? '',
      stateName: version.state?.name ?? '',
    }));
  },

  async listarSecciones(templateVersionId) {
    if (!templateVersionId) return [];
    const { data } = await domainRequest<SeccionApi[]>(
      `/template-versions/${encodeURIComponent(templateVersionId)}/sections`,
    );
    return data
      .filter((seccion) => seccion.isActive)
      .map((seccion) => ({
        key: seccion.key,
        titulo: seccion.title,
        campos: seccion.fields.map((campo) => ({ key: campo.key, label: campo.label })),
      }));
  },
};

export const dossiersService: DossiersService = USE_MOCK_DATA
  ? dossiersServiceMock
  : dossiersServiceApi;
