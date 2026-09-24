import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('exige expedientes.aprobar', async () => {
  renderApp(signedInBackend(adminSistema), '/revision');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
  expect(screen.queryByText('Checklist de revisión')).not.toBeInTheDocument();
});

test('la aprobación exige el checklist completo y nunca finge un envío', async () => {
  renderApp(signedInBackend(especialista), '/revision');
  const aprobar = await screen.findByRole('button', { name: 'Aprobar revisión' });

  await userEvent.click(aprobar);
  expect(screen.getByRole('alert')).toHaveTextContent(/Complete todos los requisitos/);

  for (const requisito of screen.getAllByRole('checkbox')) await userEvent.click(requisito);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  expect(screen.getByText('5 de 5 requisitos verificados')).toBeInTheDocument();

  await userEvent.click(aprobar);
  expect(screen.getByText(/La revisión no se envió/)).toBeInTheDocument();
});

test('solicitar corrección exige observaciones', async () => {
  renderApp(signedInBackend(especialista), '/revision');
  await userEvent.click(await screen.findByRole('button', { name: 'Solicitar corrección' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Escriba las observaciones/);
});
