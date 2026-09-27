import { screen, within } from '@testing-library/react';
import {
  adminIntegral,
  dossier,
  especialista,
  signedInBackend,
  sinPermisos,
  stubDossiers,
} from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('sin permisos muestra el estado válido sin módulos', async () => {
  renderApp(signedInBackend(sinPermisos), '/');
  expect(await screen.findByText('No tiene módulos asignados')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Indicadores' })).not.toBeInTheDocument();
});

test('con permisos muestra la estructura en cero, sin datos inventados', async () => {
  renderApp(signedInBackend(especialista), '/');
  expect(await screen.findByRole('list', { name: 'Indicadores' })).toBeInTheDocument();
  expect(screen.getByText(/no hay datos simulados/i)).toBeInTheDocument();
  expect(screen.getByText('Sin registros disponibles.')).toBeInTheDocument();
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
