import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminSistema, especialista, signedInBackend } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';
import { reiniciarAlmacenSimulado } from '../../features/observaciones/observacionesService.ts';

const EXPEDIENTE = /ECD-2026-0003/;
const VERSION = 'e93d8a3e-dc20-4417-b439-5d7dcdbe91ac';

beforeEach(() => {
  reiniciarAlmacenSimulado();
});

test('exige observaciones.create', async () => {
  renderApp(signedInBackend(adminSistema), '/observaciones');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('ofrece solo expedientes con alguna versión observable', async () => {
  renderApp(signedInBackend(especialista), '/observaciones');

  const selector = await screen.findByLabelText('Expediente relacionado');
  // El selector se puebla de forma asíncrona, así que hay que esperar a las opciones.
  await waitFor(() => expect(within(selector).getByRole('option', { name: EXPEDIENTE })).toBeVisible());
  // ECD-2026-0004 está en CHANGES_REQUIRED, así que no admite observaciones.
  expect(within(selector).queryByRole('option', { name: /ECD-2026-0004/ })).toBeNull();
});

test('carga el expediente y sus observaciones simuladas', async () => {
  renderApp(signedInBackend(especialista), '/observaciones');

  // El selector queda poblado con los expedientes simulados.
  expect(await screen.findByRole('option', { name: EXPEDIENTE })).toBeVisible();
  // Los datos simulados llegan tras la latencia del servicio.
  expect(await screen.findByText(/El objetivo general no precisa/)).toBeVisible();
  // La versión se muestra con su etiqueta, no con su UUID.
  expect(screen.getAllByText('v1.0').length).toBeGreaterThan(0);
  expect(screen.queryByText('Pendiente')).toBeNull();
});

test('las secciones del formulario salen de la plantilla de la versión', async () => {
  renderApp(signedInBackend(especialista), '/observaciones');

  await screen.findByRole('option', { name: EXPEDIENTE });
  const secciones = await screen.findByLabelText('Sección observada');
  await waitFor(() => {
    expect(within(secciones).getByRole('option', { name: 'Bibliografía' })).toBeVisible();
  });
});

test('registra una observación y la muestra en la lista', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(especialista), '/observaciones');

  await screen.findByText(/El objetivo general no precisa/);

  await usuario.selectOptions(screen.getByLabelText('Versión observada'), VERSION);
  await usuario.selectOptions(screen.getByLabelText('Sección observada'), 'bibliografia');
  await usuario.type(
    screen.getByLabelText('Descripción de la observación'),
    'Falta indicar la metodología de evaluación del módulo 2.',
  );
  await usuario.click(screen.getByRole('button', { name: 'Registrar observación' }));

  expect(await screen.findByText('Observación registrada correctamente.')).toBeVisible();
  expect(
    await screen.findByText(/Falta indicar la metodología de evaluación/),
  ).toBeVisible();
});

test('valida la descripción antes de enviar', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(especialista), '/observaciones');

  await screen.findByText(/El objetivo general no precisa/);

  await usuario.selectOptions(screen.getByLabelText('Versión observada'), VERSION);
  await usuario.type(screen.getByLabelText('Descripción de la observación'), '   ');
  await usuario.click(screen.getByRole('button', { name: 'Registrar observación' }));

  expect(
    await screen.findByText('Escriba la descripción de la observación.'),
  ).toBeVisible();
});

test('exige versión antes de enviar', async () => {
  const usuario = userEvent.setup();
  renderApp(signedInBackend(especialista), '/observaciones');

  await screen.findByText(/El objetivo general no precisa/);
  await usuario.type(screen.getByLabelText('Descripción de la observación'), 'Observación sin versión.');
  await usuario.click(screen.getByRole('button', { name: 'Registrar observación' }));

  expect(await screen.findByText('Seleccione la versión a observar.')).toBeVisible();
});
