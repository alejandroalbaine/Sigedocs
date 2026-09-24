import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('exige auditoria.consultar', async () => {
  renderApp(signedInBackend(especialista), '/historial');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('muestra filtros y tabla vacía con el aviso de contrato pendiente', async () => {
  renderApp(signedInBackend(adminSistema), '/historial');
  expect(await screen.findByRole('search', { name: 'Filtros de trazabilidad' })).toBeVisible();
  expect(screen.getByText('No hay eventos para los filtros seleccionados.')).toBeInTheDocument();
  expect(screen.getByText('Mostrando 0–0 de 0 eventos')).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText('Acción'), 'aprobar_revision');
  expect(screen.getByLabelText('Acción')).toHaveValue('aprobar_revision');
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByLabelText('Acción')).toHaveValue('');
});
