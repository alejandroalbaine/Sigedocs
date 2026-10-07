import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  adminSistema,
  dossier,
  especialista,
  problem,
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

const AUDITORIA = `GET /api/v1/dossiers/${expediente.dossierId}/audit-events`;
const NOTIFICACIONES = `GET /api/v1/dossiers/${expediente.dossierId}/notifications`;

async function elegirExpediente() {
  await userEvent.selectOptions(await screen.findByLabelText('Expediente'), expediente.dossierId);
}

test('exige permiso de auditoría', async () => {
  renderApp(signedInBackend(especialista), '/historial');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('sin expediente elegido pide seleccionarlo y no consulta ninguna ruta', async () => {
  const llamadas = stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  expect(await screen.findByText('Seleccione un expediente para continuar.')).toBeVisible();
  expect(llamadas.some((llamada) => llamada.key.includes('audit-events'))).toBe(false);
  expect(llamadas.some((llamada) => llamada.key.includes('notifications'))).toBe(false);
  expect(screen.queryByText(/simulados/i)).not.toBeInTheDocument();
});

test('la cronología sigue siendo audit-events y envía los filtros al servidor', async () => {
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [expediente],
    [AUDITORIA]: [
      {
        eventId: 'e1',
        type: 'state_changed',
        occurredAt: '2026-09-20T15:00:00.000Z',
        user: { userId: 'u1', name: 'Especialista Curricular' },
        versionLabel: 'v1.0',
        summary: 'En revisión → Requiere ajustes',
      },
    ],
    [NOTIFICACIONES]: [],
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await elegirExpediente();

  expect(await screen.findByText('En revisión → Requiere ajustes')).toBeVisible();
  const tabla = screen.getByRole('table', { name: 'Eventos de trazabilidad' });
  expect(within(tabla).getByText('Cambio de estado')).toBeVisible();

  await userEvent.selectOptions(screen.getByLabelText('Evento'), 'assigned');
  const ultima = llamadas.filter((llamada) => llamada.key.includes('audit-events')).at(-1);
  expect(ultima?.url.searchParams.get('type')).toBe('assigned');
});

test('la sección de notificaciones pinta el estado de correo de cada destinatario', async () => {
  stubApi({
    'GET /api/v1/dossiers': [expediente],
    [AUDITORIA]: [],
    [NOTIFICACIONES]: [
      {
        historyId: 'h1',
        transition: { code: 'START_REVIEW', name: 'Iniciar la revisión' },
        fromState: { code: 'ASSIGNED', name: 'Asignado' },
        toState: { code: 'IN_REVIEW', name: 'En revisión' },
        occurredAt: '2026-10-06T22:00:00.000Z',
        recipients: [
          { email: 'especialista.curricular@uapa.edu.do', status: 'sent' },
          { email: 'dir.curricular@uapa.edu.do', status: 'pending' },
          {
            email: 'coord.programa@uapa.edu.do',
            status: 'failed',
            lastError: 'SMTP 550: rechazado por el servidor',
          },
        ],
      },
    ],
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await elegirExpediente();

  const tabla = await screen.findByRole('table', { name: 'Notificaciones por correo' });
  expect(within(tabla).getAllByText('Asignado → En revisión')).toHaveLength(3);
  expect(within(tabla).getByText('especialista.curricular@uapa.edu.do')).toBeVisible();
  expect(within(tabla).getByText('dir.curricular@uapa.edu.do')).toBeVisible();
  expect(within(tabla).getByText('coord.programa@uapa.edu.do')).toBeVisible();
  expect(within(tabla).getByText('Enviado')).toBeVisible();
  expect(within(tabla).getByText('Pendiente de envío')).toBeVisible();
  expect(within(tabla).getByText('No se pudo enviar')).toBeVisible();
  expect(within(tabla).queryByText(/SMTP/)).not.toBeInTheDocument();
  expect(screen.queryByText(/simulados/i)).not.toBeInTheDocument();
});

test('un 404 en notificaciones indica fuera de alcance, no «en preparación»', async () => {
  stubApi({
    'GET /api/v1/dossiers': [expediente],
    [AUDITORIA]: [],
    [NOTIFICACIONES]: () => problem(404, 'NOT_FOUND'),
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await elegirExpediente();

  expect(
    await screen.findByText('Expediente no encontrado o fuera del alcance del usuario.'),
  ).toBeVisible();
  expect(screen.queryByText(/está en preparación/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('table', { name: 'Notificaciones por correo' }),
  ).not.toBeInTheDocument();
});

test('si la consulta de notificaciones falla muestra solo el mensaje de error', async () => {
  stubApi({
    'GET /api/v1/dossiers': [expediente],
    [AUDITORIA]: [],
    [NOTIFICACIONES]: () => problem(500, 'ERROR_INTERNO'),
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await elegirExpediente();

  expect(
    await screen.findByText('El servicio no está disponible en este momento. Inténtelo más tarde.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('table', { name: 'Notificaciones por correo' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/simulados/i)).not.toBeInTheDocument();
});

test('si no hay notificaciones lo dice sin inventar eventos', async () => {
  stubApi({
    'GET /api/v1/dossiers': [expediente],
    [AUDITORIA]: [],
    [NOTIFICACIONES]: [],
  });
  renderApp(signedInBackend(auditoria), '/historial');
  await screen.findByRole('search', { name: 'Filtros de trazabilidad' });
  await elegirExpediente();

  expect(
    await screen.findByText('No hay notificaciones registradas para este expediente.'),
  ).toBeVisible();
  expect(screen.queryByText(/simulados/i)).not.toBeInTheDocument();
});

test('el administrador del sistema (sin dossiers.read) no ve errores ni el menú de historial', async () => {
  const llamadas = stubApi({});
  renderApp(
    signedInBackend({ ...adminSistema, permissions: ['users.manage', 'audit.read'] }),
    '/historial',
  );
  expect(await screen.findByText(/Su rol no consulta expedientes curriculares/)).toBeVisible();
  expect(screen.queryByText(/No tiene permiso/)).not.toBeInTheDocument();
  expect(llamadas.some((llamada) => llamada.key === 'GET /api/v1/dossiers')).toBe(false);
  expect(screen.queryByRole('link', { name: /Historial y trazabilidad/ })).not.toBeInTheDocument();
});
