import { afterEach, expect, test, vi } from 'vitest';
import {
  consultarNotificaciones,
  fueraDeAlcance,
  normalizarNotificacion,
  notificationsPath,
} from './trazabilidadService.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

const notification = {
  notificationId: 'notification-1',
  eventId: 'event-1',
  dossierId: 'dossier-1',
  occurredAt: '2026-10-06T22:00:00.000Z',
  type: 'state_changed',
  summary: 'El expediente cambió de estado.',
  versionLabel: 'v1.0',
  recipients: ['persona@uapa.edu.do', 'direccion@uapa.edu.do'],
};

test('pending aplica el estado del aviso a cada destinatario', () => {
  expect(normalizarNotificacion({ ...notification, status: 'pending' }).destinatarios).toEqual([
    { email: 'persona@uapa.edu.do', status: 'pending' },
    { email: 'direccion@uapa.edu.do', status: 'pending' },
  ]);
});

test('cada destinatario conserva su propio estado de recipients[]', () => {
  const item = normalizarNotificacion({
    ...notification,
    recipients: [
      { email: 'persona@uapa.edu.do', status: 'sent' },
      { email: 'direccion@uapa.edu.do', status: 'pending' },
    ],
  });
  expect(item.destinatarios).toEqual([
    { email: 'persona@uapa.edu.do', status: 'sent' },
    { email: 'direccion@uapa.edu.do', status: 'pending' },
  ]);
});

test('failed conserva el estado por destinatario y no expone lastError', () => {
  const item = normalizarNotificacion({
    ...notification,
    status: 'failed',
    recipients: [
      {
        email: 'persona@uapa.edu.do',
        status: 'failed',
        lastError: 'SMTP password rejected: internal detail',
      },
      { email: 'direccion@uapa.edu.do', status: 'sent' },
    ],
  });
  expect(item.destinatarios).toEqual([
    { email: 'persona@uapa.edu.do', status: 'failed' },
    { email: 'direccion@uapa.edu.do', status: 'sent' },
  ]);
  expect(item).not.toHaveProperty('lastError');
  expect(JSON.stringify(item)).not.toContain('SMTP');
});

test('conserva los destinatarios y elimina duplicados', () => {
  expect(
    normalizarNotificacion({
      ...notification,
      recipients: [
        ' persona@uapa.edu.do ',
        'persona@uapa.edu.do',
        { email: 'direccion@uapa.edu.do' },
      ],
      status: 'sent',
    }).destinatarios,
  ).toEqual([
    { email: 'persona@uapa.edu.do', status: 'sent' },
    { email: 'direccion@uapa.edu.do', status: 'sent' },
  ]);
});

test('construye la ruta notifications con paginación', () => {
  expect(notificationsPath('dossier/1', { limit: 25, cursor: 'cursor siguiente' })).toBe(
    '/dossiers/dossier%2F1/notifications?limit=25&cursor=cursor+siguiente',
  );
});

test('consulta notifications y normaliza la respuesta', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const requestedUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    expect(requestedUrl).toContain('/api/v1/dossiers/dossier-1/notifications');
    return new Response(
      JSON.stringify({
        data: [{ ...notification, status: 'sent', lastError: 'no debe aparecer' }],
        meta: { pagination: { nextCursor: 'cursor-2', limit: 25 } },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  });
  vi.stubGlobal('fetch', fetchMock);

  await expect(consultarNotificaciones('dossier-1')).resolves.toEqual([
    expect.objectContaining({
      notificationId: 'notification-1',
      destinatarios: [
        { email: 'persona@uapa.edu.do', status: 'sent' },
        { email: 'direccion@uapa.edu.do', status: 'sent' },
      ],
    }),
  ]);
  expect(fetchMock).toHaveBeenCalledOnce();
});

test('un 404 se reporta como fuera de alcance, nunca como en preparación', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'NOT_FOUND' }), {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
    ),
  );

  const motivo = await consultarNotificaciones('dossier-1').then(
    () => null,
    (razon: unknown) => razon,
  );
  expect(fueraDeAlcance(motivo)).toBe(true);
});

test('los demás errores se propagan sin enmascararlos', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'ERROR_INTERNO' }), {
          status: 500,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
    ),
  );

  const motivo = await consultarNotificaciones('dossier-1').then(
    () => null,
    (razon: unknown) => razon,
  );
  expect(fueraDeAlcance(motivo)).toBe(false);
  expect(motivo).toBeInstanceOf(Error);
});

test('rechaza una notificación incompleta', () => {
  expect(() => normalizarNotificacion({ status: 'sent' })).toThrow(/respuesta fuera de contrato/i);
});

/** Forma real de `GET /dossiers/{id}/notifications`: agrupada por transición. */
const grupo = {
  historyId: 'history-1',
  transition: { transitionId: 'transition-1', code: 'START_REVIEW', name: 'Iniciar la revisión' },
  fromState: { code: 'ASSIGNED', name: 'Asignado' },
  toState: { code: 'IN_REVIEW', name: 'En revisión' },
  occurredAt: '2026-10-06T22:00:00.000Z',
  recipients: [
    {
      notificationId: 'n-1',
      userId: 'u-1',
      email: 'persona@uapa.edu.do',
      status: 'sent',
      attempts: 1,
      lastError: null,
      sentAt: '2026-10-06T22:01:00.000Z',
      failedAt: null,
    },
    {
      notificationId: 'n-2',
      userId: null,
      email: 'direccion@uapa.edu.do',
      status: 'sent',
      attempts: 1,
      lastError: null,
      sentAt: '2026-10-06T22:01:00.000Z',
      failedAt: null,
    },
  ],
};

test('normaliza la forma agrupada que devuelve Back End', () => {
  expect(normalizarNotificacion(grupo)).toMatchObject({
    notificationId: 'history-1',
    occurredAt: '2026-10-06T22:00:00.000Z',
    type: 'Iniciar la revisión',
    summary: 'Asignado → En revisión',
    estadoAnterior: 'Asignado',
    estadoNuevo: 'En revisión',
    destinatarios: [
      { email: 'persona@uapa.edu.do', status: 'sent' },
      { email: 'direccion@uapa.edu.do', status: 'sent' },
    ],
  });
});

test('en la forma agrupada cada destinatario mantiene su estado y nunca lastError', () => {
  const mixto = normalizarNotificacion({
    ...grupo,
    recipients: [
      { ...grupo.recipients[0], status: 'sent' },
      { ...grupo.recipients[1], status: 'pending' },
    ],
  });
  expect(mixto.destinatarios).toEqual([
    { email: 'persona@uapa.edu.do', status: 'sent' },
    { email: 'direccion@uapa.edu.do', status: 'pending' },
  ]);

  const fallido = normalizarNotificacion({
    ...grupo,
    recipients: [{ ...grupo.recipients[0], status: 'failed', lastError: 'SMTP 550: rechazado' }],
  });
  expect(fallido.destinatarios).toEqual([{ email: 'persona@uapa.edu.do', status: 'failed' }]);
  expect(fallido).not.toHaveProperty('lastError');
  expect(JSON.stringify(fallido)).not.toContain('SMTP 550');
});

test('un grupo sin destinatarios queda con la lista vacía', () => {
  expect(normalizarNotificacion({ ...grupo, recipients: [] }).destinatarios).toEqual([]);
});
