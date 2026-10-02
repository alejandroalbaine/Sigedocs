/**
 * Datos simulados de observaciones (B6).
 *
 * Copian exactamente la forma de `ObservationResponse` del backend para que cambiar
 * `VITE_USE_MOCK_DATA` no altere la interfaz. Los identificadores son UUID válidos y
 * las claves de sección usan el formato TPL-02 (`^[a-z][a-z0-9_]*$`).
 *
 * Los expedientes y versiones simulados viven en `features/dossiers/dossiersService.ts`.
 */

/** Forma de `ObservationResponse` del backend. */
export interface ObservacionSimulada {
  observationId: string;
  dossierId: string;
  version: { versionId: string; label: string };
  text: string;
  createdBy: { userId: string; name: string };
  createdAt: string;
  sectionKey: string | null;
  fieldKey: string | null;
  itemId: string | null;
}

export const OBSERVACIONES_SIMULADAS: readonly ObservacionSimulada[] = [
  {
    observationId: 'bcf7ea08-7c9a-4865-8e6b-166615354276',
    dossierId: 'd0000000-0000-4000-8000-000000000003',
    version: { versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac', label: 'v1.0' },
    text: 'El objetivo general no precisa la unidad de los indicadores.',
    createdBy: {
      userId: '10000000-0000-4000-8000-000000000013',
      name: 'Especialista Curricular',
    },
    createdAt: '2026-09-28T14:05:00.000Z',
    sectionKey: 'descripcion_asignatura',
    fieldKey: null,
    itemId: null,
  },
  {
    observationId: '1a5c1d90-1f0e-4a2b-9c3d-7e6f5a4b3c2d',
    dossierId: 'd0000000-0000-4000-8000-000000000003',
    version: { versionId: 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac', label: 'v1.0' },
    text: 'Falta la bibliografía complementaria del módulo 4 exigida por la norma vigente.',
    createdBy: {
      userId: '10000000-0000-4000-8000-000000000012',
      name: 'Dirección de Gestión Curricular',
    },
    createdAt: '2026-09-27T09:40:00.000Z',
    sectionKey: 'bibliografia',
    fieldKey: null,
    itemId: null,
  },
  {
    observationId: '2b6d2ea1-2a1f-4b3c-8d4e-6f5a4b3c2d1e',
    dossierId: 'd0000000-0000-4000-8000-000000000004',
    version: { versionId: '961d73f5-ed77-47d9-b16a-f707cc3e3b8d', label: 'v1.1' },
    text: 'La carga horaria semanal (64 h) no concuerda con la declarada en el plan del programa.',
    createdBy: {
      userId: '10000000-0000-4000-8000-000000000013',
      name: 'Especialista Curricular',
    },
    createdAt: '2026-09-24T16:22:00.000Z',
    sectionKey: 'unidades_didacticas',
    fieldKey: null,
    itemId: null,
  },
] as const;
