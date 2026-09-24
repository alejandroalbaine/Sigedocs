import { screen } from '@testing-library/react';
import { especialista, signedInBackend, sinPermisos } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('sin permisos muestra el estado válido sin módulos', async () => {
  renderApp(signedInBackend(sinPermisos), '/');
  expect(await screen.findByText('No tiene módulos asignados')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Indicadores' })).not.toBeInTheDocument();
});

test('con permisos muestra la estructura en cero, sin datos inventados', async () => {
  renderApp(signedInBackend(especialista), '/');
  expect(await screen.findByRole('list', { name: 'Indicadores' })).toBeInTheDocument();
  expect(screen.getByText(/no hay datos simulados/)).toBeInTheDocument();
  expect(screen.getByText('Sin registros disponibles.')).toBeInTheDocument();
});
