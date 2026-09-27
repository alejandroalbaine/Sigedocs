import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminIntegral, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';
import { COLORES, MINIMO_JUSTIFICACION } from './kit.ts';

const conBiblioteca = {
  ...adminIntegral,
  permissions: [...adminIntegral.permissions, 'templates.manage'],
};

test('documenta los 11 colores del documento base de Figma', async () => {
  renderApp(signedInBackend(conBiblioteca), '/ui-kit');
  expect(await screen.findByText('0. Paleta y tipografía')).toBeInTheDocument();
  expect(COLORES).toHaveLength(11);
  for (const color of COLORES) expect(screen.getAllByText(color.hex).length).toBeGreaterThan(0);
});

test('el campo obligatorio muestra su error junto al campo', async () => {
  renderApp(signedInBackend(conBiblioteca), '/ui-kit');
  const titulo = await screen.findByLabelText('Título del expediente *');
  await userEvent.click(titulo);
  await userEvent.tab();
  expect(titulo).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Complete el título del expediente.')).toBeInTheDocument();
});

test('el diálogo crítico exige observaciones antes de confirmar', async () => {
  renderApp(signedInBackend(conBiblioteca), '/ui-kit');
  await userEvent.click(await screen.findByRole('button', { name: 'Abrir diálogo de ejemplo' }));
  const dialogo = screen.getByRole('dialog', { name: 'Devolver expediente con observaciones' });
  const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar devolución' });
  expect(confirmar).toBeDisabled();
  await userEvent.type(
    within(dialogo).getByLabelText('Observaciones obligatorias *'),
    'x'.repeat(MINIMO_JUSTIFICACION),
  );
  expect(confirmar).toBeEnabled();
  await userEvent.click(confirmar);
  expect(screen.getByText(/la devolución no se envió al servidor/)).toBeInTheDocument();
});
