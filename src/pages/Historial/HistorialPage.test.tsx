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

test('exige permiso de auditoría', async () => {
  renderApp(signedInBackend(especialista), '/historial');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('si la ruta de auditoría no existe aún, lo dice sin inventar eventos', async () => {
  stubDossiers([expediente]);
  renderApp(signedInBackend(auditoria), '/historial');
  expect(await screen.findByRole('search', { name: 'Filtros de trazabilidad' })).toBeVisible();
  expect(await screen.findByText(/está en preparación/)).toBeVisible();
});

test('muestra los eventos del contrato y envía los filtros al servidor', async () => {
  const llamadas = stubApi({
    'GET /api/v1/dossiers': [expediente],
    [`GET /api/v1/dossiers/${expediente.dossierId}/audit-events`]: [
      {
        eventId: 'e1',
        type: 'state_changed',
        occurredAt: '2026-09-20T15:00:00.000Z',
        user: { userId: 'u1', name: 'Especialista Curricular' },
        versionLabel: 'v1.0',
        summary: 'En revisión → Requiere ajustes',
      },
    ],
  });
  renderApp(signedInBackend(auditoria), '/historial');
  expect(await screen.findByText('En revisión → Requiere ajustes')).toBeVisible();
  const tabla = screen.getByRole('table', { name: 'Eventos de trazabilidad' });
  expect(within(tabla).getByText('Cambio de estado')).toBeVisible();

  await userEvent.selectOptions(screen.getByLabelText('Evento'), 'assigned');
  const ultima = llamadas.filter((llamada) => llamada.key.includes('audit-events')).at(-1);
  expect(ultima?.url.searchParams.get('type')).toBe('assigned');
});
