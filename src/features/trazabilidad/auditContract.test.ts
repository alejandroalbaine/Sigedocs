import { describe, expect, test } from 'vitest';
import { TIPOS_EVENTO, validarEventoAuditoria, validarEventosAuditoria } from './auditContract.ts';

const EVENTO_REAL = {
  eventId: '35b202f2-fa0c-40a4-9961-8c6f08bc0a92',
  type: 'observation_added',
  occurredAt: '2026-10-01T15:42:45.514Z',
  user: { userId: '10000000-0000-4000-8000-000000000013', name: 'Especialista Curricular' },
  versionLabel: 'v1.0',
  summary: 'Se registró una observación en la sección descripcion_asignatura.',
};

describe('validarEventoAuditoria', () => {
  test('acepta un evento del contrato', () => {
    expect(validarEventoAuditoria(EVENTO_REAL)).toEqual(EVENTO_REAL);
  });

  test('acepta user: null, que el backend usa cuando el evento lo produjo el sistema', () => {
    const evento = validarEventoAuditoria({ ...EVENTO_REAL, user: null });
    expect(evento.user).toBeNull();
  });

  test('normaliza versionLabel ausente a null', () => {
    const sinVersion: Record<string, unknown> = { ...EVENTO_REAL };
    delete sinVersion.versionLabel;
    expect(validarEventoAuditoria(sinVersion).versionLabel).toBeNull();
  });

  test('rechaza identificadores que no son UUID', () => {
    expect(() => validarEventoAuditoria({ ...EVENTO_REAL, eventId: 'evt-001' })).toThrow(
      /eventId/,
    );
    expect(() =>
      validarEventoAuditoria({ ...EVENTO_REAL, user: { userId: '13', name: 'X' } }),
    ).toThrow(/user.userId/);
  });

  test('rechaza un actor sin nombre', () => {
    expect(() =>
      validarEventoAuditoria({
        ...EVENTO_REAL,
        user: { userId: '10000000-0000-4000-8000-000000000013', name: '' },
      }),
    ).toThrow(/user.name/);
  });

  test('rechaza un tipo vacío o un resumen ausente', () => {
    expect(() => validarEventoAuditoria({ ...EVENTO_REAL, type: '' })).toThrow(/type/);
    expect(() => validarEventoAuditoria({ ...EVENTO_REAL, summary: undefined })).toThrow(/summary/);
  });

  test('el catálogo cubre exactamente los tipos que emite el backend', () => {
    expect([...TIPOS_EVENTO].sort()).toEqual([
      'assigned',
      'content_updated',
      'dossier_created',
      'observation_added',
      'state_changed',
      'version_created',
    ]);
  });

  test('rechaza una respuesta que no sea lista', () => {
    expect(() => validarEventosAuditoria({ data: [] })).toThrow(/se esperaba una lista/);
  });
});
