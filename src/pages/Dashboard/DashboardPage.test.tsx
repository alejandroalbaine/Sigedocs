import { screen, within } from '@testing-library/react';
import {
  adminIntegral,
  adminSistema,
  dossier,
  especialista,
  problem,
  signedInBackend,
  sinPermisos,
  stubApi,
  stubDossiers,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('sin permisos muestra el estado válido sin módulos', async () => {
  renderApp(signedInBackend(sinPermisos), '/');
  expect(await screen.findByText('No tiene módulos asignados')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Indicadores' })).not.toBeInTheDocument();
});

test('con permisos y sin expedientes muestra la estructura en cero, sin datos inventados', async () => {
  stubDossiers([]);
  renderApp(signedInBackend(especialista), '/');
  expect(await screen.findByText(/aún no hay expedientes registrados/i)).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Indicadores' })).toBeInTheDocument();
  expect(screen.getByText('Sin registros disponibles.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /exportar/i })).not.toBeInTheDocument();
});

test('si el módulo de expedientes aún no existe (404) muestra un aviso neutro, no un error', async () => {
  stubApi({});
  renderApp(signedInBackend(especialista), '/');
  expect(await screen.findByText(/está en preparación/)).toBeInTheDocument();
  expect(screen.queryByText(/no está disponible/i)).not.toBeInTheDocument();
});

test('un error real del servidor se sigue mostrando', async () => {
  stubApi({ 'GET /api/v1/dossiers': problem(500, 'INTERNAL_ERROR') });
  renderApp(signedInBackend(especialista), '/');
  expect(await screen.findByText(/el servicio no está disponible/i)).toBeInTheDocument();
  expect(screen.queryByText(/está en preparación/)).not.toBeInTheDocument();
});

test('un rol sin dossiers.read no consulta expedientes y ve sus accesos', async () => {
  const llamadas = stubApi({});
  renderApp(signedInBackend(adminSistema), '/');
  const accesos = await screen.findByRole('region', { name: 'Accesos de su rol' });
  expect(within(accesos).getByRole('link', { name: /usuarios y roles/i })).toBeInTheDocument();
  expect(llamadas.some((llamada) => llamada.key === 'GET /api/v1/dossiers')).toBe(false);
  expect(screen.queryByRole('list', { name: 'Indicadores' })).not.toBeInTheDocument();
});

test('el Panel y Reportes clasifican los estados igual (ADR-014)', async () => {
  const items = [
    dossier({ dossierId: 'a', code: 'ECD-1' }),
    dossier({
      dossierId: 'b',
      code: 'ECD-2',
      currentState: {
        code: 'APPROVED_FOR_PILOT',
        name: 'Aprobado para pilotaje',
        isEditable: false,
      },
    }),
    dossier({
      dossierId: 'c',
      code: 'ECD-3',
      currentState: { code: 'FINAL', name: 'Definitivo', isEditable: false },
    }),
    dossier({
      dossierId: 'd',
      code: 'ECD-4',
      currentState: { code: 'CHANGES_REQUIRED', name: 'Requiere ajustes', isEditable: true },
    }),
  ];
  stubDossiers(items);
  const { unmount } = renderApp(signedInBackend(adminIntegral), '/');
  const panel = await screen.findByLabelText('Tareas pendientes');
  expect(await within(panel).findByText(/1 expedientes esperan corrección/)).toBeInTheDocument();
  // "Aprobado para pilotaje" no cuenta como definitivo: 25 % cada grupo.
  expect(screen.getByText('Definitivo').parentElement).toHaveTextContent('25%');
  expect(screen.getByText('Aprobación y pilotaje').parentElement).toHaveTextContent('25%');
  unmount();

  stubDossiers(items);
  renderApp(signedInBackend(adminIntegral), '/reportes');
  expect(await screen.findByText('ECD-3')).toBeInTheDocument();
  expect(screen.getByText('Definitivos').parentElement).toHaveTextContent('1');
  expect(screen.getByText('Requieren ajustes').parentElement).toHaveTextContent('1');
});
