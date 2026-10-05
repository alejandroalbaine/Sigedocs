import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dossier, especialista, json, signedInBackend, stubApi } from '../../test/backend.ts';
import { renderApp } from '../../test/renderApp.tsx';

test('Gestión pagina con el cursor del servidor: la segunda página trae los registros restantes', async () => {
  const user = userEvent.setup();
  const primeros = Array.from({ length: 25 }, (_, i) =>
    dossier({
      dossierId: `d-${String(i)}`,
      code: `ECD-${String(i)}`,
      title: `Asignatura ${String(i)}`,
    }),
  );
  const ultimo = dossier({
    dossierId: 'd-26',
    code: 'ECD-26',
    title: 'Expediente de segunda página',
  });
  const llamadas = stubApi({
    'GET /api/v1/dossiers': (_init: RequestInit, url: URL) =>
      json({
        data: url.searchParams.has('cursor') ? [ultimo] : primeros,
        meta: { pagination: { limit: 25, next: url.searchParams.has('cursor') ? null : 'c2' } },
      }),
  });
  renderApp(signedInBackend(especialista), '/expedientes');
  await screen.findByText('Asignatura 0');
  expect(llamadas).toHaveLength(1);
  expect(screen.queryByText(ultimo.title)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
  expect(await screen.findByRole('link', { name: ultimo.title })).toHaveAttribute(
    'href',
    '/revision?dossierId=d-26',
  );
  expect(llamadas[1]?.url.searchParams.get('cursor')).toBe('c2');
  expect(screen.queryByText('Asignatura 0')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  expect(
    within(screen.getByRole('region', { name: 'Expedientes' })).getByText('ECD-26', {
      exact: false,
    }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Página anterior' }));
  expect(await screen.findByText('Asignatura 0')).toBeInTheDocument();
});
