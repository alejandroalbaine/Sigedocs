import { screen } from '@testing-library/react';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('exige expedientes.editar', async () => {
  renderApp(signedInBackend(adminSistema), '/observaciones');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('el formulario queda deshabilitado hasta que exista el contrato', async () => {
  renderApp(signedInBackend(especialista), '/observaciones');
  expect(await screen.findByRole('button', { name: 'Registrar observación' })).toBeDisabled();
  expect(screen.getByLabelText('Registrado por')).toHaveValue('Especialista Curricular');
  expect(screen.getByText('No hay observaciones disponibles.')).toBeInTheDocument();
});
