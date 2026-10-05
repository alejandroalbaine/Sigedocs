import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { especialista, signedInBackend, sinPermisos } from '../../test/backend.ts';
import { expedientes } from '../../test/dossiers.ts';
import { json, problem, stubFetch } from '../../test/fetch.ts';
import { renderApp } from '../../test/renderApp.tsx';

function abrirBusqueda(ruta = '/busqueda') {
  return renderApp(signedInBackend(especialista), ruta);
}

test('exige dossiers.read', async () => {
  renderApp(signedInBackend(sinPermisos), '/busqueda');
  expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
});

test('mientras ejecuta la búsqueda lo indica y luego muestra el total', async () => {
  let responder: (() => void) | null = null;
  stubFetch({
    'GET /api/v1/dossiers': () =>
      new Promise((resolve) => {
        responder = () => {
          resolve(json({ data: expedientes }));
        };
      }),
  });
  abrirBusqueda();

  expect(await screen.findByText('Ejecutando búsqueda…')).toBeInTheDocument();
  // El aviso puede aparecer antes de que salga la solicitud: se responde cuando ya existe.
  await waitFor(() => {
    expect(responder).not.toBeNull();
  });
  (responder as unknown as () => void)();
  expect(await screen.findByText(/Se muestran/)).toHaveTextContent('3');
  expect(screen.queryByText('Ejecutando búsqueda…')).not.toBeInTheDocument();
});

test('carga los resultados del backend y enlaza cada expediente', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  abrirBusqueda();

  expect(await screen.findByText('Rediseño de Matemática I')).toBeInTheDocument();
  expect(screen.getByText('Plan de Contabilidad')).toBeInTheDocument();
  expect(screen.getByText('Maestría en Educación')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Abrir expediente' })[0]).toHaveAttribute(
    'href',
    '/revision?dossierId=d1',
  );
});

test('el texto de búsqueda viaja como parámetro search y se conserva en la URL', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  const { router } = abrirBusqueda();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.type(screen.getByLabelText('Texto'), 'matemática & más');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar consulta' }));

  await waitFor(() => {
    expect(backend.calls).toContain(
      'GET /api/v1/dossiers?limit=25&search=matem%C3%A1tica%20%26%20m%C3%A1s',
    );
  });
  expect(router.state.location.search).toContain('q=');
});

test('un enlace con ?q= ejecuta la búsqueda desde el inicio', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: [expedientes[0]] }) });
  abrirBusqueda('/busqueda?q=EXP-2026-0001');

  expect(await screen.findByText('Rediseño de Matemática I')).toBeInTheDocument();
  expect(backend.calls).toContain('GET /api/v1/dossiers?limit=25&search=EXP-2026-0001');
});

test('Limpiar filtros vacía el texto y vuelve a consultar sin search', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  const { router } = abrirBusqueda('/busqueda?q=algo');
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }));

  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe('GET /api/v1/dossiers?limit=25');
  });
  expect(router.state.location.search).toBe('');
});

test('sin coincidencias muestra el estado vacío', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: [] }) });
  abrirBusqueda('/busqueda?q=inexistente');

  expect(await screen.findByText('No se encontraron expedientes.')).toBeInTheDocument();
  expect(screen.getByText(/Se muestran/)).toHaveTextContent('0');
});

test('si el backend falla muestra el error y ningún resultado', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => problem(503, 'SERVICIO_NO_DISPONIBLE') });
  abrirBusqueda();

  expect(await screen.findByText(/servicio no está disponible/)).toBeInTheDocument();
  expect(screen.queryByText('Rediseño de Matemática I')).not.toBeInTheDocument();
});

test('no muestra controles sin función ni resultados simulados', async () => {
  stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  abrirBusqueda();
  await screen.findByText('Rediseño de Matemática I');

  expect(screen.queryByRole('button', { name: /Exportar Hallazgos/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver folio' })).not.toBeInTheDocument();
  const controles = screen
    .queryAllByRole('button')
    .filter((boton) => !boton.closest('nav[aria-label="Paginación"]'));
  for (const boton of controles) expect(boton).toBeEnabled();
});

test('los filtros de nivel y estado viajan al servidor y se conservan en la URL', async () => {
  const backend = stubFetch({ 'GET /api/v1/dossiers': () => json({ data: expedientes }) });
  const { router } = abrirBusqueda();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.selectOptions(screen.getByLabelText('Nivel académico'), 'associate');
  await userEvent.selectOptions(screen.getByLabelText('Estado'), 'IN_REVIEW');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar consulta' }));

  await waitFor(() => {
    expect(backend.calls.at(-1)).toBe(
      'GET /api/v1/dossiers?limit=25&currentState=IN_REVIEW&academicLevel=associate',
    );
  });
  expect(router.state.location.search).toContain('level=associate');
  expect(router.state.location.search).toContain('state=IN_REVIEW');
});

test('pagina los resultados con el cursor del servidor', async () => {
  const backend = stubFetch({
    'GET /api/v1/dossiers': ({ url }) =>
      json({
        data: url.searchParams.has('cursor') ? [expedientes[2]] : [expedientes[0]],
        meta: { pagination: { limit: 25, next: url.searchParams.has('cursor') ? null : 'c2' } },
      }),
  });
  abrirBusqueda();
  await screen.findByText('Rediseño de Matemática I');

  await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
  expect(await screen.findByText('Maestría en Educación')).toBeInTheDocument();
  expect(backend.calls.at(-1)).toBe('GET /api/v1/dossiers?limit=25&cursor=c2');
  expect(screen.queryByText('Rediseño de Matemática I')).not.toBeInTheDocument();
});
