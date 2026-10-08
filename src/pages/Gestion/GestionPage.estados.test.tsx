import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { especialista, signedInBackend, sinPermisos } from '../../test/backend.ts';
import { expedientes } from '../../test/dossiers.ts';
import { json, problem, stubFetch } from '../../test/fetch.ts';
import { renderApp } from '../../test/renderApp.tsx';

function abrirGestion() {
  return renderApp(signedInBackend(especialista), '/expedientes');
}

function filas() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

test('exige dossiers.read', async () => {
  renderApp(signedInBackend(sinPermisos), '/expedientes');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('mientras consulta muestra "Consultando expedientes…" y luego la tabla', async () => {
  let responder = (): void => undefined;
  const backend = stubFetch({
    'GET /api/v1/dossiers': () =>
      new Promise((resolve) => {
        responder = () => {
          resolve(json({ data: expedientes }));
        };
      }),
  });
  abrirGestion();

  expect(await screen.findByText('Consultando expedientes…')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await waitFor(() => {
    expect(backend.calls).toContain('GET /api/v1/dossiers?limit=25');
  });

  responder();
  expect(await screen.findByRole('table')).toBeInTheDocument();
  expect(screen.queryByText('Consultando expedientes…')).not.toBeInTheDocument();
});

test('carga y muestra los expedientes del backend', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  abrirGestion();

  expect(await screen.findByText('Rediseño de Matemática I')).toBeInTheDocument();
  expect(filas()).toHaveLength(3);
  expect(screen.getByText('EXP-2026-0002', { exact: false })).toBeInTheDocument();
  expect(screen.getByText(/Mostrando/)).toHaveTextContent('1–3 expedientes');
  expect(screen.getAllByText('En revisión').length).toBeGreaterThan(0);
});

test('la búsqueda por texto viaja al servidor como search, con espera', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  abrirGestion();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.type(screen.getByLabelText('Buscar expedientes'), 'contabilidad');
  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe('GET /api/v1/dossiers?limit=25&search=contabilidad');
  });
  // Una sola consulta por la búsqueda completa, no una por tecla.
  expect(backend.calls.filter((call) => call.includes('search='))).toHaveLength(1);
});

test('los filtros de estado y nivel viajan al servidor, se combinan y se limpian', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  abrirGestion();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.click(screen.getByRole('button', { name: /Filtros Avanzados/ }));
  await userEvent.selectOptions(screen.getByLabelText('Estado'), 'IN_REVIEW');
  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe('GET /api/v1/dossiers?limit=25&currentState=IN_REVIEW');
  });
  expect(screen.getByText('1 activos')).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText('Nivel académico'), 'associate');
  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe(
      'GET /api/v1/dossiers?limit=25&currentState=IN_REVIEW&academicLevel=associate',
    );
  });
  expect(screen.getByText('2 activos')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe('GET /api/v1/dossiers?limit=25');
  });
});

test('el selector de estado ofrece los estados del flujo, no solo los de la página', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: [expedientes[0]] }) });
  abrirGestion();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.click(screen.getByRole('button', { name: /Filtros Avanzados/ }));
  const opciones = within(screen.getByLabelText('Estado')).getAllByRole('option');
  expect(opciones.map((opcion) => opcion.textContent)).toEqual(
    expect.arrayContaining(['Todos los estados', 'Recepcionado', 'En revisión', 'Definitivo']),
  );
});

test('sin expedientes muestra el estado vacío', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: [] }) });
  abrirGestion();

  expect(await screen.findByText(/No hay expedientes que coincidan/)).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('si el backend falla muestra el error, nunca el detalle técnico', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => problem(503, 'SERVICIO_NO_DISPONIBLE') });
  abrirGestion();

  expect(await screen.findByText(/servicio no está disponible/)).toBeInTheDocument();
  expect(screen.queryByText('Detalle interno del servidor')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('Nuevo Registro solo aparece con el permiso dossiers.create', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: [] }) });
  renderApp(signedInBackend({ ...especialista, permissions: ['dossiers.read'] }), '/expedientes');
  expect(
    await screen.findByText(/Mostrando|No hay expedientes|Sin expedientes/),
  ).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Nuevo Registro/ })).not.toBeInTheDocument();
});
