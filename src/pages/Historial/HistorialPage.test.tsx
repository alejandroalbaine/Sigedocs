import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

/** La tabla solo aparece cuando el servicio respondió. */
async function esperarTabla() {
  const tabla = await screen.findByRole('table');
  return within(tabla);
}

test('exige audit.read', async () => {
  renderApp(signedInBackend(especialista), '/historial');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('carga los eventos simulados con las etiquetas del contrato B7', async () => {
  renderApp(signedInBackend(adminSistema), '/historial');

  expect(await screen.findByRole('search', { name: 'Filtros de trazabilidad' })).toBeVisible();

  const tabla = await esperarTabla();
  expect(tabla.getAllByText('Expediente creado')).not.toHaveLength(0);
  expect(tabla.getAllByText('Observación registrada')).not.toHaveLength(0);
  expect(tabla.getAllByText('Especialista Curricular')).not.toHaveLength(0);
  // El resumen del servidor es el detalle real del evento.
  expect(
    tabla.getAllByText('Iniciar la revisión: Asignado → En revisión.').length,
  ).toBeGreaterThan(0);
});

test('un evento sin actor de sesión se muestra como Sistema', async () => {
  renderApp(signedInBackend(adminSistema), '/historial');
  const tabla = await esperarTabla();
  expect(tabla.getAllByText('Sistema')).not.toHaveLength(0);
});

test('el filtro por tipo de evento acota la tabla', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(adminSistema), '/historial');

  const inicial = await esperarTabla();
  const antes = inicial.getAllByRole('row').length;
  expect(inicial.getAllByText('Observación registrada')).not.toHaveLength(0);

  await usuario.selectOptions(screen.getByLabelText('Tipo de evento'), 'content_updated');

  await waitFor(() => {
    expect(screen.getByRole('table')).toBeVisible();
  });
  const filtrada = within(screen.getByRole('table'));
  expect(filtrada.getByText('Contenido actualizado')).toBeVisible();
  expect(filtrada.queryByText('Observación registrada')).toBeNull();
  expect(filtrada.getAllByRole('row').length).toBeLessThan(antes);

  await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByLabelText('Tipo de evento')).toHaveValue('');
});

test('la búsqueda por texto acota la tabla sin volver a pedir eventos', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(adminSistema), '/historial');

  const inicial = await esperarTabla();
  const antes = inicial.getAllByRole('row').length;

  await usuario.type(screen.getByLabelText('Buscar por expediente, usuario o detalle'), 'bibliografia');
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

  const filtrada = within(screen.getByRole('table'));
  expect(filtrada.getAllByRole('row').length).toBeLessThan(antes);
  expect(filtrada.getAllByText('Observación registrada')).not.toHaveLength(0);
});

test('el detalle del evento se abre y se cierra', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(adminSistema), '/historial');

  const tabla = await esperarTabla();
  const botones = tabla.getAllByRole('button', { name: 'Detalle' });
  const primero = botones.at(0);
  if (primero === undefined) {
    throw new Error('la tabla debe traer al menos un botón de detalle');
  }
  await usuario.click(primero);

  const dialogo = await screen.findByRole('dialog');
  expect(within(dialogo).getByText('Registro')).toBeVisible();

  await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
