/**
 * Datos simulados de auditoría (B7).
 *
 * Mismo criterio que las observaciones simuladas: están escritos en la forma exacta del
 * contrato (`eventId`, `type`, `occurredAt`, `user`, `versionLabel`, `summary`) para que
 * el paso a la API real no cambie la interfaz. `user` es `{ userId, name }` o `null`
 * cuando el evento lo produjo el sistema, y los `type` son los seis de `AuditEventType`.
 */
import type { EventoAuditoriaCrudo } from './auditContract.ts';

const ESPECIALISTA = { userId: '10000000-0000-4000-8000-000000000013', name: 'Especialista Curricular' };
const COORDINADOR = { userId: '10000000-0000-4000-8000-000000000019', name: 'Coordinador de Programa' };
const DIRECCION = { userId: '10000000-0000-4000-8000-000000000012', name: 'Dirección de Gestión Curricular' };

export const EVENTOS_AUDITORIA_SIMULADOS: readonly EventoAuditoriaCrudo[] = [
  {
    eventId: '4f1c8e20-1a2b-4c3d-9e5f-6a7b8c9d0e1f',
    type: 'dossier_created',
    occurredAt: '2026-09-20T08:12:00.000Z',
    user: COORDINADOR,
    versionLabel: null,
    summary: 'Se registró el expediente ECD-2026-0003.',
  },
  {
    eventId: '5a2d9f31-2b3c-4d5e-8f6a-7b8c9d0e1f2a',
    type: 'version_created',
    occurredAt: '2026-09-20T08:14:00.000Z',
    user: COORDINADOR,
    versionLabel: 'v1.0',
    summary: 'Se creó la versión v1.0.',
  },
  {
    eventId: '6b3eaf42-3c4d-4e6f-9a7b-8c9d0e1f2a3b',
    type: 'content_updated',
    occurredAt: '2026-09-21T10:04:00.000Z',
    user: COORDINADOR,
    versionLabel: 'v1.0',
    summary: 'Se editó el contenido de las secciones: bibliografia, datos_academicos, descripcion_asignatura.',
  },
  {
    eventId: '7c4fb053-4d5e-4f7a-8b8c-9d0e1f2a3b4c',
    type: 'assigned',
    occurredAt: '2026-09-22T09:00:00.000Z',
    user: DIRECCION,
    versionLabel: null,
    summary: 'Se asignó a Especialista Curricular para revisión.',
  },
  {
    eventId: '8d50c164-5e6f-4a8b-9c9d-0e1f2a3b4c5d',
    type: 'state_changed',
    occurredAt: '2026-09-22T09:30:00.000Z',
    user: ESPECIALISTA,
    versionLabel: 'v1.0',
    summary: 'Iniciar la revisión: Asignado → En revisión.',
  },
  {
    eventId: '9e61d275-6f7a-4b9c-8d0e-1f2a3b4c5d6e',
    type: 'observation_added',
    occurredAt: '2026-09-24T16:22:00.000Z',
    user: ESPECIALISTA,
    versionLabel: 'v1.0',
    summary: 'Se registró una observación en la sección descripcion_asignatura.',
  },
  {
    eventId: 'af72e386-7a8b-4c0d-9e1f-2a3b4c5d6e7f',
    type: 'observation_added',
    occurredAt: '2026-09-28T14:05:00.000Z',
    user: ESPECIALISTA,
    versionLabel: 'v1.0',
    summary: 'Se registró una observación en la sección bibliografia.',
  },
  {
    eventId: 'b083f497-8b9c-4d1e-8f2a-3b4c5d6e7f8a',
    type: 'state_changed',
    occurredAt: '2026-09-30T13:30:00.000Z',
    user: null,
    versionLabel: 'v1.0',
    summary: 'Cierre automático del ciclo de revisión: el flujo venció el plazo.',
  },
] as const;
