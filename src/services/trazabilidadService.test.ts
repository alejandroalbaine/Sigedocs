import { afterEach, expect, test, vi } from 'vitest';
import {
  consultarNotificaciones,
  historialEnPreparacion,
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

test('usa Pendiente de envío para pending', () => {
  expect(normalizarNotificacion({ ...notification, status: 'pending' })).toMatchObject({
    status: 'pending',
    estadoEnvio: 'pendiente',
    etiquetaEstadoEnvio: 'Pendiente de envío',
  });
});

test('usa Enviado para sent', () => {
  expect(normalizarNotificacion({ ...notification, status: 'sent' })).toMatchObject({
    status: 'sent',
    estadoEnvio: 'enviado',
    etiquetaEstadoEnvio: 'Enviado',
  });
});

test('usa No se pudo enviar para failed y no expone lastError', () => {
  const item = normalizarNotificacion({
    ...notification,
    status: 'failed',
    lastError: 'SMTP password rejected: internal detail',
  });
  expect(item).toMatchObject({
    status: 'failed',
    estadoEnvio: 'fallido',
    etiquetaEstadoEnvio: 'No se pudo enviar',
  });
  expect(item).not.toHaveProperty('lastError');
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
  ).toEqual(['persona@uapa.edu.do', 'direccion@uapa.edu.do']);
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

  await expect(consultarNotificaciones('dossier-1')).resolves.toMatchObject({
    nextCursor: 'cursor-2',
    limit: 25,
    sourceStatus: 'ready',
    items: [{ status: 'sent', etiquetaEstadoEnvio: 'Enviado' }],
  });
  expect(fetchMock).toHaveBeenCalledOnce();
});

test('muestra en preparación si la ruta todavía no está disponible', async () => {
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

  await expect(consultarNotificaciones('dossier-1')).resolves.toEqual(historialEnPreparacion());
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
    destinatarios: ['persona@uapa.edu.do', 'direccion@uapa.edu.do'],
    status: 'sent',
    estadoEnvio: 'enviado',
    etiquetaEstadoEnvio: 'Enviado',
  });
});

test('agrega los estados de los destinatarios priorizando failed, pending y sent', () => {
  const pendiente = normalizarNotificacion({
    ...grupo,
    recipients: [
      { ...grupo.recipients[0], status: 'sent' },
      { ...grupo.recipients[1], status: 'pending' },
    ],
  });
  expect(pendiente).toMatchObject({
    status: 'pending',
    estadoEnvio: 'pendiente',
    etiquetaEstadoEnvio: 'Pendiente de envío',
  });

  const fallido = normalizarNotificacion({
    ...grupo,
    recipients: [
      { ...grupo.recipients[0], status: 'sent' },
      { ...grupo.recipients[1], status: 'failed', lastError: 'SMTP 550: rechazado' },
    ],
  });
  expect(fallido).toMatchObject({
    status: 'failed',
    estadoEnvio: 'fallido',
    etiquetaEstadoEnvio: 'No se pudo enviar',
  });
  expect(JSON.stringify(fallido)).not.toContain('SMTP 550');
});

test('un grupo sin destinatarios queda en preparación', () => {
  expect(normalizarNotificacion({ ...grupo, recipients: [] })).toMatchObject({
    status: 'en_preparacion',
    etiquetaEstadoEnvio: 'En preparación',
  });
});
