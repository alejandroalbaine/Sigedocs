import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminSistema,
  dossier,
  especialista,
  signedInBackend,
  stubApi,
  stubDossiers,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

const expediente = dossier();
const auditoria = {
  ...adminSistema,
  permissions: [...adminSistema.permissions, 'expedientes.consultar'],
};

/**
 * Fila de la tabla que contiene un texto. Se acota a la tabla porque las acciones y los
 * estados se repiten también como opciones de los filtros.
 */
function filaDe(texto: string): HTMLElement {
  const tabla = screen.getByRole('table', { name: 'Eventos de trazabilidad' });
  const fila = within(tabla).getByText(texto).closest('tr');
  if (!fila) throw new Error(`Ninguna fila de la tabla contiene «${texto}».`);
  return fila;
}

test('exige auditoria.consultar', async () => {
  renderApp(signedInBackend(especialista), '/historial');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('muestra los filtros y los eventos simulados con el aviso de correo pendiente', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  expect(await screen.findByRole('search', { name: 'Filtros de trazabilidad' })).toBeVisible();
  expect(screen.getByText(/Datos simulados/)).toBeInTheDocument();
  expect(screen.getByText('Mostrando 1–5 de 5 eventos')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Notificados' })).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText('Acción'), 'aprobar_revision');
  expect(screen.getByLabelText('Acción')).toHaveValue('aprobar_revision');
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByLabelText('Acción')).toHaveValue('');
});

test('ofrece el selector de expediente y sigue mostrando los simulados sin selección', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });

  const selector = screen.getByLabelText('Expediente consultado');
  expect(selector).toBeInTheDocument();
  expect(selector).toHaveValue('');
  expect(screen.getByText(/Datos simulados/)).toBeInTheDocument();
  expect(screen.getByText('Mostrando 1–5 de 5 eventos')).toBeInTheDocument();
});

test('cada fila muestra el estado del envío y sus destinatarios', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });

  const enviado = filaDe('Aprobar revisión');
  expect(within(enviado).getByText('Enviado')).toBeInTheDocument();
  expect(within(enviado).getByText('coord.programa@uapa.edu.do')).toBeVisible();
  expect(within(enviado).getByText('dir.curricular@uapa.edu.do')).toBeVisible();

  expect(within(filaDe('Requiere cambios')).getByText('No se pudo enviar')).toBeInTheDocument();
  expect(within(filaDe('Iniciar reevaluación')).getByText('En preparación')).toBeInTheDocument();

  // El evento sin el campo `notificacion` también degrada a «En preparación».
  expect(screen.getAllByText('En preparación')).toHaveLength(2);
});

test('la ficha del evento expone el error y los destinatarios del envío fallido', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });

  await userEvent.click(
    within(filaDe('Requiere cambios')).getByRole('button', { name: 'Ver detalle' }),
  );

  const dialogo = await screen.findByRole('dialog', { name: 'Detalle del evento' });
  expect(within(dialogo).getByText('No se pudo enviar')).toBeInTheDocument();
  expect(within(dialogo).getByText('especialista.curricular@uapa.edu.do')).toBeVisible();
  expect(
    within(dialogo).getByText('SMTP 550: dirección rechazada por el servidor institucional.'),
  ).toBeVisible();
});

test('si la ruta de notificaciones no existe aún, la pantalla dice que está en preparación', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await screen.findByRole('option', { name: `${expediente.code} · ${expediente.title}` });

  await userEvent.selectOptions(
    screen.getByLabelText('Expediente consultado'),
    expediente.dossierId,
  );
  expect(
    await screen.findByText(/El historial de notificaciones está en preparación/),
  ).toBeVisible();
});

test('muestra los estados reales de notifications sin exponer lastError', async () => {
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [expediente],
    [`GET /api/v1/dossiers/${expediente.dossierId}/notifications`]: [
      {
        historyId: 'sh-1',
        transition: { transitionId: 't-1', code: 'START_REVIEW', name: 'Iniciar la revisión' },
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
            email: 'dir.curricular@uapa.edu.do',
            status: 'sent',
            attempts: 1,
            lastError: null,
            sentAt: '2026-10-06T22:01:00.000Z',
            failedAt: null,
          },
        ],
      },
      {
        historyId: 'sh-2',
        transition: { transitionId: 't-2', code: 'REQUEST_CHANGES', name: 'Devolver para ajustes' },
        fromState: { code: 'IN_REVIEW', name: 'En revisión' },
        toState: { code: 'CHANGES_REQUIRED', name: 'Requiere ajustes' },
        occurredAt: '2026-10-06T23:00:00.000Z',
        recipients: [
          {
            notificationId: 'n-3',
            userId: 'u-1',
            email: 'persona@uapa.edu.do',
            status: 'pending',
            attempts: 0,
            lastError: null,
            sentAt: null,
            failedAt: null,
          },
        ],
      },
      {
        historyId: 'sh-3',
        transition: {
          transitionId: 't-3',
          code: 'FINALIZE',
          name: 'Declarar la versión definitiva',
        },
        fromState: { code: 'EVALUATED', name: 'Evaluado' },
        toState: { code: 'FINAL', name: 'Definitivo' },
        occurredAt: '2026-10-07T00:00:00.000Z',
        recipients: [
          {
            notificationId: 'n-4',
            userId: 'u-1',
            email: 'persona@uapa.edu.do',
            status: 'failed',
            attempts: 3,
            lastError: 'SMTP 550: rechazado por el servidor',
            sentAt: null,
            failedAt: '2026-10-07T00:01:00.000Z',
          },
        ],
      },
    ],
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await screen.findByRole('option', { name: `${expediente.code} · ${expediente.title}` });

  await userEvent.selectOptions(
    screen.getByLabelText('Expediente consultado'),
    expediente.dossierId,
  );

  expect(await screen.findByText('Pendiente de envío')).toBeInTheDocument();
  expect(screen.getByText('No se pudo enviar')).toBeInTheDocument();

  const enviado = filaDe('Iniciar la revisión');
  expect(within(enviado).getByText('Enviado')).toBeInTheDocument();
  expect(within(enviado).getByText('persona@uapa.edu.do')).toBeVisible();
  expect(within(enviado).getByText('En revisión')).toBeInTheDocument();

  expect(screen.queryByText(/SMTP 550/)).not.toBeInTheDocument();
  expect(llamadas.some((llamada) => llamada.key.includes('/notifications'))).toBe(true);
});
